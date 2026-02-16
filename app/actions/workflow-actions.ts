"use server";

import { db } from "@/lib/db";
import { executeWorkflow } from "@/lib/workflow/workflow-engine";
import type {
  WorkflowDefinition,
  WorkflowExecutionResult,
} from "@/lib/workflow/types";
import { logWorkflowExecution } from "@/lib/services/employee-log";

/**
 * 通过工作流引擎执行员工任务
 * 如果员工有工作流定义，走工作流引擎；否则走直接 LLM 调用
 */
export async function executeEmployeeWorkflow(
  employeeId: string,
  input: string,
): Promise<{
  success: boolean;
  result?: WorkflowExecutionResult;
  message?: string;
  error?: string;
}> {
  try {
    // 1. 获取员工信息
    const employee = await db.employee.findUnique({
      where: { id: employeeId },
    });

    if (!employee) {
      return { success: false, error: "员工不存在" };
    }

    // 2. 解析配置
    let config: any = {};
    try {
      if (employee.config) config = JSON.parse(employee.config);
    } catch {}

    // 3. 解析工作流定义
    let workflowDef: WorkflowDefinition | null = null;
    try {
      if (employee.workflow) {
        const parsed = JSON.parse(employee.workflow);
        if (parsed.nodes && parsed.edges && parsed.nodes.length > 0) {
          workflowDef = parsed;
        }
      }
    } catch {}

    if (workflowDef) {
      // ===== 走工作流引擎 =====
      const result = await executeWorkflow(workflowDef, input, employeeId, {
        companyId: employee.companyId,
        model: config.modelName || config.model,
        prompt: config.prompt,
        temperature: config.temperature,
        modelConfig: config.modelConfig,
      });

      const isInternalTrigger = input === "Auto-triggered by scheduler";

      // 仅在非内部触发时保存用户消息和 AI 回复到聊天记录
      if (!isInternalTrigger) {
        await db.message.create({
          data: {
            content: input,
            role: "user",
            employeeId,
          },
        });

        if (result.success && result.finalOutput) {
          const messageContent =
            typeof result.finalOutput === "string"
              ? result.finalOutput
              : JSON.stringify(result.finalOutput);

          await db.message.create({
            data: {
              content: messageContent,
              role: "assistant",
              employeeId,
            },
          });
        }
      }

      // 记录工作流日志 (无论是否内部触发都记录日志)
      await logWorkflowExecution(
        employeeId,
        employee.name,
        input,
        result.success,
        result.finalOutput,
        result.error,
        result.nodeResults.map((n) => ({
          nodeLabel: n.nodeLabel,
          status: n.status,
          output: n.output,
        })),
        result.totalDuration,
      );

      return {
        success: result.success,
        result,
        message:
          typeof result.finalOutput === "string"
            ? result.finalOutput
            : JSON.stringify(result.finalOutput),
        error: result.error,
      };
    } else {
      // ===== 无工作流，直接调用 LLM =====
      const { sendMessage } = await import("@/app/actions/chat-actions");
      const chatResult = await sendMessage(employeeId, input);

      return {
        success: chatResult.success,
        message: chatResult.success
          ? (chatResult.message as string)
          : undefined,
        error: chatResult.error,
      };
    }
  } catch (error: any) {
    console.error("Workflow execution error:", error);
    return { success: false, error: error.message };
  }
}

/**
 * 测试执行工作流 (从画布直接调用)
 */
export async function testExecuteWorkflow(
  employeeId: string,
  definition: WorkflowDefinition,
  input: string,
): Promise<WorkflowExecutionResult> {
  try {
    // 1. 获取员工信息用于配置
    const employee = await db.employee.findUnique({
      where: { id: employeeId },
      select: { config: true, companyId: true },
    });

    let config: any = {};
    if (employee?.config) {
      try {
        config = JSON.parse(employee.config);
      } catch {}
    }

    // 2. 直接调用引擎执行
    return await executeWorkflow(definition, input, employeeId, {
      companyId: employee?.companyId || config.companyId,
      model: config.modelName || config.model,
      prompt: config.prompt,
      temperature: config.temperature,
      modelConfig: config.modelConfig,
    });
  } catch (error: any) {
    return {
      success: false,
      finalOutput: "",
      nodeResults: [],
      totalDuration: 0,
      error: error.message,
    };
  }
}
