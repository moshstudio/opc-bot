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
    `[Mastra] Starting workflow execution for employee: ${employeeId} (${definition.nodes.length} nodes, ${definition.edges.length} edges)`,
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
      case "webhook":
        return steps.startStep;
      case "cron_trigger":
        return steps.cronTriggerStep;
      case "output":
        return steps.outputStep;
      case "knowledge_retrieval":
        return steps.knowledgeRetrievalStep;
      case "llm":
      case "agent":
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
      case "question_classifier":
        return steps.questionClassifierStep;
      case "variable_aggregator":
        return steps.variableAggregatorStep;
      case "iteration":
        return steps.iterationStep;
      case "loop":
        return steps.loopStep;
      case "exit_loop":
        return steps.exitLoopStep;
      case "variable_assignment":
        return steps.variableAssignmentStep;
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

  // 记录顶层节点（没有 parentId 的节点）
  const topLevelNodes = definition.nodes.filter((n) => !(n as any).parentId);

  let queue = definition.nodes.filter(
    (n) =>
      (inDegree.get(n.id) || 0) === 0 &&
      TRIGGER_TYPES.includes(n.type) &&
      (topLevelNodes.length === 0 || !(n as any).parentId),
  );

  // 如果没有发现可运行的触发器，但存在节点，则提示错误（支持 DAG 的严格起始点）
  if (queue.length === 0 && definition.nodes.length > 0) {
    // 增加详细的错误诊断
    const inDegreeZeroNodes = definition.nodes.filter(
      (n) => (inDegree.get(n.id) || 0) === 0,
    );
    console.error(`[Mastra] No start nodes found. 
      Total nodes: ${definition.nodes.length}
      Nodes with 0 in-degree: ${inDegreeZeroNodes.map((n) => `${n.id}(${n.type})`).join(", ")}
      Trigger types: ${TRIGGER_TYPES.join(", ")}
    `);

    // 如果没有触发器类型的节点，尝试把任何 0 入度的节点作为起点（兼容旧数据或测试）
    if (inDegreeZeroNodes.length > 0) {
      console.warn(
        `[Mastra] No explicit triggers found, using 0 in-degree nodes as fallback`,
      );
      queue = inDegreeZeroNodes;
    } else {
      throw new Error(
        "工作流缺少开始节点或触发器不可达 (请确保至少有一个触发器且未被依赖)",
      );
    }
  }

  console.log(
    `[Mastra] Initial layer (Entry points):`,
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

            // 1. Initial merge (raw data)
            const mergedInput = {
              companyId,
              role: employeeConfig?.role,
              name: employeeConfig?.name,
              modelConfig: employeeConfig?.modelConfig,
              provider: employeeConfig?.provider,
              ...configData,
              ...incomingData,
              __definition__: definition,
              id: node.id,
            };

            // 2. Resolve 'input' (usually from the immediate upstream output)
            let resolvedInput = mergedInput.input;
            if (mergedInput.output && !resolvedInput) {
              resolvedInput = mergedInput.output;
            }

            // 3. Try to parse JSON input if it's a string
            if (typeof resolvedInput === "string") {
              try {
                const trimmed = resolvedInput.trim();
                if (
                  (trimmed.startsWith("{") && trimmed.endsWith("}")) ||
                  (trimmed.startsWith("[") && trimmed.endsWith("]"))
                ) {
                  resolvedInput = JSON.parse(resolvedInput);
                }
              } catch {
                // Ignore, keep as string
              }
            }
            mergedInput.input = resolvedInput;

            // 4. Resolve variables in all string fields
            for (const key of Object.keys(mergedInput)) {
              if (typeof mergedInput[key] === "string") {
                const val = mergedInput[key];
                // Check for exact match {{key}} to preserve object/array types
                const exactMatch = val.match(/^\{\{([\w.-]+)\}\}$/);
                if (exactMatch) {
                  const fullKey = exactMatch[1];
                  const parts = fullKey.split(".");
                  const stepId = parts[0];
                  const path = parts.slice(1);

                  if (stepId === "input") {
                    let v = mergedInput.input;
                    for (const k of path) {
                      if (v && typeof v === "object" && k in v) {
                        v = v[k];
                      } else {
                        v = undefined;
                        break;
                      }
                    }
                    if (v !== undefined) mergedInput[key] = v;
                  } else {
                    const stepValue = getStepValue(
                      stepId,
                      path,
                      params.getStepResult,
                    );
                    if (stepValue !== undefined) mergedInput[key] = stepValue;
                  }
                } else {
                  // Mixed string content (interpolation)
                  mergedInput[key] = resolveVariables(
                    val,
                    params.getStepResult,
                    mergedInput,
                  );
                }
              } else if (
                key === "variables" &&
                typeof mergedInput[key] === "object" &&
                mergedInput[key] !== null
              ) {
                // Special handling for dictionary/map variables (used in Code & other nodes)
                for (const varKey of Object.keys(mergedInput[key])) {
                  const val = mergedInput[key][varKey];
                  if (typeof val === "string") {
                    const exactMatch = val.match(/^\{\{([\w.-]+)\}\}$/);
                    if (exactMatch) {
                      const fullKey = exactMatch[1];
                      const parts = fullKey.split(".");
                      const stepId = parts[0];
                      const path = parts.slice(1);

                      if (stepId === "input") {
                        let v = mergedInput.input;
                        for (const k of path) {
                          if (v && typeof v === "object" && k in v) {
                            v = v[k];
                          } else {
                            v = undefined;
                            break;
                          }
                        }
                        mergedInput[key][varKey] = v;
                      } else {
                        const stepValue = getStepValue(
                          stepId,
                          path,
                          params.getStepResult,
                        );
                        if (stepValue !== undefined) {
                          mergedInput[key][varKey] = stepValue;
                        }
                      }
                    } else {
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

            // 5. Node-specific pre-processing
            if (node.type === "code") {
              const language = mergedInput.codeLanguage || "javascript";
              mergedInput.language = language;
              if (!mergedInput.code) {
                if (language === "python" && mergedInput.codeContentPython) {
                  mergedInput.code = mergedInput.codeContentPython;
                } else if (mergedInput.codeContent) {
                  mergedInput.code = mergedInput.codeContent;
                }
              }
            }

            // 6. Conditional Execution Logic
            const incomingEdges = definition.edges.filter(
              (e) => e.target === node.id,
            );

            if (incomingEdges.length > 0) {
              let hasActiveUpstream = false;
              let hasConditionFailure = false;

              for (const edge of incomingEdges) {
                const sourceResult = params.getStepResult?.(edge.source);
                if (edge.sourceHandle && sourceResult) {
                  const resultVal = (sourceResult as any)?.result;
                  let conditionMet = true;
                  if (edge.sourceHandle === "true") {
                    if (resultVal !== true) conditionMet = false;
                  } else if (edge.sourceHandle === "false") {
                    if (resultVal !== false) conditionMet = false;
                  } else {
                    if (String(resultVal) !== edge.sourceHandle) {
                      conditionMet = false;
                    }
                  }
                  if (conditionMet) hasActiveUpstream = true;
                  else hasConditionFailure = true;
                  continue;
                }
                if (sourceResult) {
                  const isSkipped =
                    (sourceResult as any).status === "skipped" ||
                    (sourceResult as any)?.output?.status === "skipped";
                  if (isSkipped) continue;
                  hasActiveUpstream = true;
                }
              }

              if (
                !hasActiveUpstream &&
                (hasConditionFailure || incomingEdges.length > 0)
              ) {
                const allSkipped = incomingEdges.every((edge) => {
                  const sr = params.getStepResult?.(edge.source);
                  if (!sr) return false;
                  if ((sr as any).status === "skipped") return true;
                  if ((sr as any)?.output?.status === "skipped") return true;
                  if (edge.sourceHandle) {
                    const rv = (sr as any)?.result;
                    if (edge.sourceHandle === "true") return rv !== true;
                    if (edge.sourceHandle === "false") return rv !== false;
                    return String(rv) !== edge.sourceHandle;
                  }
                  return false;
                });
                if (allSkipped) return { status: "skipped" };
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
            let status = payload?.status === "success" ? "completed" : "failed";

            if (payload?.output?.status === "skipped") {
              status = "skipped";
            }

            console.log(`[Mastra] Step finished: ${stepId} (${status})`);

            const output = payload?.output;

            onStepUpdate?.(
              stepId,
              status as any,
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

        if (stepResult.output?.status === "skipped") {
          status = "skipped";
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
      let finalVal = result.result;
      // 自动解构统一格式的输出，直接提取 output 字段作为 finalOutput
      if (finalVal && typeof finalVal === "object" && "output" in finalVal) {
        finalVal = finalVal.output;
      }
      return {
        success: true,
        finalOutput: finalVal,
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

function getStepValue(
  stepId: string,
  path: string[],
  getStepResult: (stepId: string) => any,
): any {
  // 1. Get base step result
  const stepResult = getStepResult(stepId);
  if (!stepResult) return undefined;

  // Ignore skipped steps
  if ((stepResult as any)?.status === "skipped") return undefined;

  // If no path, return the "primary" value (output/data/result or raw)
  if (path.length === 0) {
    return (
      stepResult?.output ?? stepResult?.data ?? stepResult?.result ?? stepResult
    );
  }

  // 2. Traverse path
  let current = stepResult;
  for (let i = 0; i < path.length; i++) {
    const key = path[i];

    if (current && typeof current === "object") {
      if (key in current) {
        current = current[key];
      } else if (
        current.output &&
        typeof current.output === "object" &&
        key in current.output
      ) {
        // Auto-traverse into .output if key not found in top-level
        current = current.output[key];
      } else {
        return undefined;
      }
    } else {
      return undefined;
    }
  }

  return current;
}

function resolveVariables(
  content: string,
  getStepResult: (stepId: string) => any,
  contextData: any,
): string {
  if (!content) return content;
  return content.replace(/\{\{([\w.-]+)\}\}/g, (match, key) => {
    if (key === "input" || key.startsWith("input.")) {
      const parts = key.split(".");
      let val = contextData.input;
      const path = parts.slice(1);

      for (const k of path) {
        if (val && typeof val === "object" && k in val) {
          val = val[k];
        } else {
          val = undefined;
          break;
        }
      }

      if (val === undefined || val === null) return "";
      return typeof val === "string" ? val : JSON.stringify(val);
    }

    // Split key into stepId and path
    // Assumption: Step IDs usually don't contain dots, but if they do, this simple split might be ambiguous.
    // However, in this system, generated IDs are safe.
    const parts = key.split(".");
    const stepId = parts[0];
    const path = parts.slice(1);

    const val = getStepValue(stepId, path, getStepResult);

    if (val === undefined || val === null) return ""; // empty string for missing vars
    return typeof val === "object" ? JSON.stringify(val) : String(val);
  });
}
