import { createWorkflow, createStep } from "@mastra/core/workflows";
import { z } from "zod";
import {
  WorkflowDefinition,
  WorkflowExecutionResult,
  NodeExecutionResult,
} from "../../workflow/types";
import * as steps from "./steps";

/**
 * 动态构建并执行 Mastra 工作流 (支持 DAG 结构)
 */
export async function executeMastraWorkflow(
  definition: WorkflowDefinition,
  input: string,
  employeeId: string,
  employeeConfig?: any,
): Promise<WorkflowExecutionResult> {
  console.log(
    `[Mastra] Starting workflow execution for employee: ${employeeId}`,
  );
  const startTime = Date.now();
  const companyId = employeeConfig?.companyId || "";

  // 1. 初始化 Mastra Workflow
  const wf = createWorkflow({
    id: `workflow-${employeeId}-${Date.now()}`,
    inputSchema: z.object({
      input: z.string().optional().default(""),
      companyId: z.string().optional().default(""),
    }),
    outputSchema: z.any(),
  });

  // 2. 获取 Step 定义的辅助函数
  const getStepForNode = (node: any) => {
    switch (node.type) {
      case "start":
      case "cron_trigger":
      case "webhook":
        return steps.startStep;
      case "knowledge_retrieval":
        return steps.retrievalStep;
      case "llm":
      case "process":
        return steps.agentStep;
      case "code":
        return steps.codeStep;
      case "http_request":
        return steps.httpRequestStep;
      case "notification":
        return steps.notificationStep;
      case "condition":
        return steps.conditionStep;
      default:
        console.warn(
          `[Mastra] Unknown node type: ${node.type}, using startStep`,
        );
        return steps.startStep;
    }
  };

  // 3. 构建依赖图并计算入度 (处理 DAG 并支持并行)
  const adj = new Map<string, string[]>();
  const inDegree = new Map<string, number>();

  definition.nodes.forEach((node) => {
    adj.set(node.id, []);
    inDegree.set(node.id, 0);
  });

  definition.edges.forEach((e) => {
    const list = adj.get(e.source) || [];
    list.push(e.target);
    adj.set(e.source, list);

    inDegree.set(e.target, (inDegree.get(e.target) || 0) + 1);
  });

  // 4. 分层执行 (BFS)
  let currentWf = wf;
  let queue = definition.nodes.filter((n) => (inDegree.get(n.id) || 0) === 0);

  console.log(
    `[Mastra] Initial layer (in-degree 0):`,
    queue.map((n) => n.id),
  );

  while (queue.length > 0) {
    const layer = [...queue];
    queue = [];

    // 获取当前层的 Step 实例
    const stepsToAdd = layer
      .map((node) => {
        const baseStep = getStepForNode(node);
        if (!baseStep) {
          console.error(`[Mastra] Failed to get step for node: ${node.id}`);
          return null;
        }

        // 使用 createStep 动态创建新 Step，注入 node.data 作为默认参数
        // 我们将 inputSchema 设为 z.any() 以绕过严格的步间类型检查 (因为我们是在运行时动态组装)
        // 并在 execute 中手动合并配置数据
        return createStep({
          id: node.id,
          inputSchema: z.any(),
          outputSchema: z.any(), // baseStep.outputSchema
          execute: async (params) => {
            // 1. 获取上一节点的输出 (inputData)
            const incomingData = params.inputData || {};

            // 2. 获取节点配置 (node.data)
            const configData = node.data || {};

            // 3. 合并数据：配置数据优先，但允许输入数据覆盖(如果需要的话)?
            // 通常：User Input (flow data) > Static Config (node data)
            // 但是对于 prompt 这种，通常是 Static Config。
            // 对于 input 这种，通常是 User Input。
            // 让我们混合：
            const mergedInput = {
              companyId, // 始终注入 Context
              modelConfig: employeeConfig?.modelConfig, // 默认：员工模型配置
              provider: employeeConfig?.provider, // 默认：员工模型提供商
              ...configData, // 覆盖：节点特定配置 (如果存在)
              ...incomingData, // 覆盖：上游动态输入 (最高优先级)
            };

            // 特殊处理：如果上游输出是 { output: "..." } 且当前节点需要 input，则映射一下
            if (incomingData.output && !mergedInput.input) {
              mergedInput.input = incomingData.output;
            }

            // 4. 调用原始 Step 的逻辑
            return baseStep.execute({
              ...params,
              inputData: mergedInput,
            });
          },
        });
      })
      .filter((s): s is NonNullable<typeof s> => s !== null);

    if (stepsToAdd.length > 0) {
      if (stepsToAdd.length === 1) {
        currentWf = currentWf.then(stepsToAdd[0]);
      } else {
        currentWf = currentWf.parallel(stepsToAdd);
      }
      console.log(
        `[Mastra] Added layer with ${stepsToAdd.length} steps:`,
        stepsToAdd.map((s) => s.id),
      );
    }

    // 计算下一层
    const nextLayerCandidates = new Set<string>();
    layer.forEach((node) => {
      const neighbors = adj.get(node.id) || [];
      neighbors.forEach((targetId) => {
        const currentIn = inDegree.get(targetId) || 0;
        inDegree.set(targetId, currentIn - 1);
        if (currentIn - 1 === 0) {
          nextLayerCandidates.add(targetId);
        }
      });
    });

    // 保持确定性顺序 (Optional but good for debugging)
    const nextNodes = definition.nodes.filter((n) =>
      nextLayerCandidates.has(n.id),
    );
    if (nextNodes.length > 0) {
      queue = nextNodes;
    }
  }

  const commitWorkflow = currentWf.commit();
  console.log("[Mastra] Workflow committed, ready to execute.");

  try {
    const run = await commitWorkflow.createRun();
    const result = await run.start({
      inputData: { input, companyId },
    });

    console.log(`[Mastra] Workflow execution status: ${result.status}`);

    const steps = result.steps || {};
    const nodeResults = Object.entries(steps)
      .map(([stepId, stepResult]: [string, any]) => {
        const nodeDef = definition.nodes.find((n) => n.id === stepId);

        // Filter out internal steps (like triggers) that don't match our canvas nodes
        if (!nodeDef) return null;

        let status: "completed" | "failed" = "completed";
        if (stepResult.status !== "success") {
          status = "failed";
        }

        return {
          nodeId: stepId,
          nodeType: (nodeDef?.type as any) || "process",
          nodeLabel: nodeDef?.data.label || "",
          status,
          output:
            typeof stepResult.output === "object"
              ? JSON.stringify(stepResult.output)
              : String(stepResult.output || ""),
          startTime,
        };
      })
      .filter((r) => r !== null) as NodeExecutionResult[];

    if (result.status === "success") {
      console.log("[Mastra] success result:", result.result);
      return {
        success: true,
        finalOutput: JSON.stringify(result.result),
        nodeResults,
        totalDuration: Date.now() - startTime,
      };
    } else {
      let errorMessage = `Workflow finished with status: ${result.status}`;
      if (result.status === "failed") {
        console.error("[Mastra] Workflow failed:", result.error);
        errorMessage = result.error?.message || errorMessage;
      }

      return {
        success: false,
        finalOutput: "",
        nodeResults,
        totalDuration: Date.now() - startTime,
        error: errorMessage,
      };
    }
  } catch (error: any) {
    console.error("[Mastra] Workflow execution failed with error:", error);
    if (error.stack) {
      console.error("[Mastra] Error stack:", error.stack);
    }
    return {
      success: false,
      finalOutput: "",
      nodeResults: [],
      totalDuration: Date.now() - startTime,
      error: error.message,
    };
  }
}

// 默认 Workflow 定义
export const workflow = createWorkflow({
  id: "default-workflow",
  inputSchema: z.any(),
  outputSchema: z.any(),
});

export * from "./parallel";
