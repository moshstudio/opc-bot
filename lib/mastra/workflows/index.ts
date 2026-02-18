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
  onStepUpdate?: (
    nodeId: string,
    status: NodeExecutionResult["status"],
    output?: string,
    error?: string,
  ) => void,
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
        return steps.knowledgeRetrievalStep;
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
      case "variable_aggregator":
        return steps.variableAggregatorStep;
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

  // 仅仅从触发器节点开始执行
  const TRIGGER_TYPES = ["start", "cron_trigger", "webhook"];
  let queue = definition.nodes.filter(
    (n) => (inDegree.get(n.id) || 0) === 0 && TRIGGER_TYPES.includes(n.type),
  );

  // 如果没有发现可运行的触发器，但存在节点，则提示错误（支持 DAG 的严格起始点）
  if (queue.length === 0 && definition.nodes.length > 0) {
    throw new Error(
      "工作流缺少开始节点或触发器不可达 (请确保至少有一个触发器且未被依赖)",
    );
  }

  console.log(
    `[Mastra] Initial layer (Triggers with in-degree 0):`,
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
        return createStep({
          id: node.id,
          inputSchema: z.any(),
          outputSchema: z.any(),
          execute: async (params) => {
            const incomingData = params.inputData || {};
            const configData = node.data || {};
            const mergedInput = {
              companyId,
              role: employeeConfig?.role,
              name: employeeConfig?.name,
              modelConfig: employeeConfig?.modelConfig,
              provider: employeeConfig?.provider,
              ...configData,
              ...incomingData,
            };

            if (incomingData.output && !mergedInput.input) {
              mergedInput.input = incomingData.output;
            }

            // Resolve variables in string inputs and 'variables' object
            // We use a helper to look up {{nodeId}} references using getStepResult
            for (const key of Object.keys(mergedInput)) {
              if (typeof mergedInput[key] === "string") {
                mergedInput[key] = resolveVariables(
                  mergedInput[key],
                  params.getStepResult,
                  mergedInput,
                );
              } else if (
                key === "variables" &&
                typeof mergedInput[key] === "object" &&
                mergedInput[key] !== null
              ) {
                // Special handling for 'variables' map in code node
                for (const varKey of Object.keys(mergedInput[key])) {
                  const val = mergedInput[key][varKey];
                  if (typeof val === "string") {
                    // Check for exact match {{key}} to preserve object type
                    const exactMatch = val.match(/^\{\{([\w.-]+)\}\}$/);
                    if (exactMatch) {
                      const refKey = exactMatch[1];
                      if (refKey === "input") {
                        mergedInput[key][varKey] = mergedInput.input;
                      } else {
                        const stepRes = params.getStepResult(refKey);
                        // If we can Resolve property access here if needed, but for now assume StepID
                        // Mastra getStepResult might not handle dot notation.
                        // If it fails, we should fall back or handle dots manually?
                        // Let's assume strict node ID for now to pass Objects.
                        if (stepRes !== undefined) {
                          mergedInput[key][varKey] =
                            (stepRes as any)?.output ?? stepRes; // Unpack output if standard
                        } else {
                          // Try standard interpolation as fallback (e.g. if it's a property path not a step id)
                          mergedInput[key][varKey] = resolveVariables(
                            val,
                            params.getStepResult,
                            mergedInput,
                          );
                        }
                      }
                    } else {
                      // Mixed string content
                      mergedInput[key][varKey] = resolveVariables(
                        val,
                        params.getStepResult,
                        mergedInput,
                      );
                    }
                  }
                }
              }
            }

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

    const nextNodes = definition.nodes.filter((n) =>
      nextLayerCandidates.has(n.id),
    );
    if (nextNodes.length > 0) {
      queue = nextNodes;
    }
  }

  const commitWorkflow = currentWf.commit();

  try {
    const run = await commitWorkflow.createRun();
    // 使用 stream 模式运行
    const stream = run.stream({
      inputData: { input, companyId },
    });

    console.log("[Mastra] Workflow stream started.");

    // 监听 stream 以获得实时进度
    const streamPromise = (async () => {
      try {
        for await (const chunk of stream.fullStream) {
          if (chunk.type === "workflow-step-start") {
            const stepId = (chunk as any).payload?.id || (chunk as any).stepId;
            console.log(`[Mastra] Step started: ${stepId}`);
            onStepUpdate?.(stepId, "running");
          } else if (chunk.type === "workflow-step-result") {
            const stepId = (chunk as any).payload?.id || (chunk as any).stepId;
            const payload = (chunk as any).payload;
            const status =
              payload?.status === "success" ? "completed" : "failed";
            console.log(`[Mastra] Step finished: ${stepId} (${status})`);

            const output = payload?.output;

            onStepUpdate?.(
              stepId,
              status,
              output,
              payload?.status === "failed"
                ? payload?.error?.message
                : undefined,
            );
          }
        }
      } catch (err) {
        console.error("[Mastra] Error in stream listener:", err);
      }
    })();

    const [result] = await Promise.all([stream.result, streamPromise]);
    console.log(`[Mastra] Workflow execution status: ${result.status}`);

    const steps = result.steps || {};
    const nodeResults = Object.entries(steps)
      .map(([stepId, stepResult]: [string, any]) => {
        const nodeDef = definition.nodes.find((n) => n.id === stepId);
        if (!nodeDef) return null;

        let status: NodeExecutionResult["status"] = "completed";
        if (stepResult.status !== "success") {
          status = "failed";
        }

        return {
          nodeId: stepId,
          nodeType: (nodeDef?.type as any) || "process",
          nodeLabel: nodeDef?.data.label || "",
          status,
          output: stepResult.output,
          startTime,
        };
      })
      .filter((r) => r !== null) as NodeExecutionResult[];

    if (result.status === "success") {
      return {
        success: true,
        finalOutput: result.result,
        nodeResults,
        totalDuration: Date.now() - startTime,
      };
    } else {
      let errorMessage = `Workflow finished with status: ${result.status}`;
      if (result.status === "failed") {
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
    console.error("[Mastra] Workflow execution failed:", error);
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

function resolveVariables(
  content: string,
  getStepResult: (stepId: string) => any,
  contextData: any,
): string {
  if (!content) return content;
  return content.replace(/\{\{([\w.-]+)\}\}/g, (match, key) => {
    if (key === "input") {
      const val = contextData.input;
      return typeof val === "string" ? val : JSON.stringify(val);
    }
    const stepResult = getStepResult(key);
    if (stepResult) {
      const val =
        stepResult?.output ??
        stepResult?.data ??
        stepResult?.result ??
        stepResult;
      if (val === undefined || val === null) return "";
      return typeof val === "object" ? JSON.stringify(val) : String(val);
    }
    return match;
  });
}
