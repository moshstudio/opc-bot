import { createWorkflow, cloneStep } from "@mastra/core/workflows";
import { z } from "zod";
import {
  WorkflowDefinition,
  WorkflowExecutionResult,
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
        return steps.startStep;
    }
  };

  // 3. 拓扑排序 (处理 DAG)
  const sortedNodes: any[] = [];
  const visited = new Set<string>();
  const visiting = new Set<string>();

  const adj = new Map<string, string[]>();
  definition.edges.forEach((e) => {
    const list = adj.get(e.source) || [];
    list.push(e.target);
    adj.set(e.source, list);
  });

  function visit(nodeId: string) {
    if (visiting.has(nodeId)) return; // 简单忽略环
    if (visited.has(nodeId)) return;

    visiting.add(nodeId);
    (adj.get(nodeId) || []).forEach(visit);
    visiting.delete(nodeId);
    visited.add(nodeId);
    const node = definition.nodes.find((n) => n.id === nodeId);
    if (node) sortedNodes.unshift(node);
  }

  // 找到入口点
  const startNodes = definition.nodes.filter(
    (n) =>
      n.type === "start" || n.type === "cron_trigger" || n.type === "webhook",
  );
  startNodes.forEach((n) => visit(n.id));

  // 4. 构建工作流链
  let currentWf: any = wf;
  sortedNodes.forEach((node) => {
    const baseStep = getStepForNode(node);
    // 使用 cloneStep 为每个节点创建唯一的 Step 实例（使用 Node ID）
    const stepInstance = cloneStep(baseStep, { id: node.id });
    currentWf = currentWf.then(stepInstance);
  });

  const commitWorkflow = currentWf.commit();

  try {
    const result = await commitWorkflow.execute({
      inputData: { input, companyId },
    });

    // Mastra 1.x execute 返回的可能直接是结果对象，取决于 commit 配置
    // 这里我们假设它返回包含了所有 stepResults 的对象
    // 注意：commit().execute() 的返回结构可能需要进一步确认
    const results = (result as any).results || result || {};

    return {
      success: true,
      finalOutput: JSON.stringify(results),
      nodeResults: Object.entries(results).map(([id, res]: [string, any]) => ({
        nodeId: id,
        nodeType:
          (definition.nodes.find((n) => n.id === id)?.type as any) || "process",
        nodeLabel: definition.nodes.find((n) => n.id === id)?.data.label || "",
        status: "completed",
        output: typeof res === "object" ? JSON.stringify(res) : String(res),
        startTime,
      })),
      totalDuration: Date.now() - startTime,
    };
  } catch (error: any) {
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
