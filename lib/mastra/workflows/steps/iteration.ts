import { createStep } from "@mastra/core/workflows";
import { z } from "zod";
import { formatStepOutput, stepOutputSchema } from "./utils";

export const iterationStep = createStep({
  id: "iteration",
  description:
    "Iterate over an array and run an internal sub-workflow for each item",
  inputSchema: z.object({
    iterationVariable: z.string().optional(),
    processingMode: z
      .enum(["sequential", "parallel"])
      .optional()
      .default("sequential"),
    errorHandling: z
      .enum(["terminate", "continue", "remove_failed"])
      .optional()
      .default("terminate"),
    subNodes: z.any().optional(),
    subEdges: z.any().optional(),
    input: z.any().optional(),
    companyId: z.string().optional(),
  }),
  outputSchema: stepOutputSchema,
  execute: async ({ inputData }) => {
    console.log(
      "[Mastra:Iteration] execute inputData:",
      JSON.stringify(inputData, null, 2),
    );
    try {
      let targetList: any[] = [];
      const iterationVar = inputData.iterationVariable;

      // 1. Resolve array
      if (!iterationVar) {
        if (Array.isArray(inputData.input)) {
          targetList = inputData.input;
        } else if (typeof inputData.input === "string") {
          try {
            const parsed = JSON.parse(inputData.input);
            if (Array.isArray(parsed)) {
              targetList = parsed;
            } else {
              throw new Error("迭代输入解析后不是数组");
            }
          } catch {
            throw new Error("迭代输入必须是数组或 JSON 数组字符串");
          }
        } else {
          throw new Error("迭代输入缺失或不是数组");
        }
      } else {
        // If the variable was already resolved by the engine (generalized resolution),
        // iterationVar might already be the array or object we need.
        if (Array.isArray(iterationVar)) {
          targetList = iterationVar;
        } else if (typeof iterationVar === "string") {
          // Helper to resolve path within an object
          const resolve = (obj: any, path: string) => {
            const parts = path.split(".");
            let current = obj;
            for (const part of parts) {
              if (current && typeof current === "object" && part in current) {
                current = current[part];
              } else {
                return undefined;
              }
            }
            return current;
          };

          // 1. Try to resolve from inputData top-level (direct key or path)
          let val =
            (inputData as any)[iterationVar] ??
            resolve(inputData, iterationVar);

          // 2. Try to resolve from inputData.input (common in standardized steps)
          if (!Array.isArray(val) && inputData.input) {
            const valFromInput =
              (inputData.input as any)[iterationVar] ??
              resolve(inputData.input, iterationVar);
            if (Array.isArray(valFromInput)) {
              val = valFromInput;
            }
          }

          // 3. Special case: if iterationVar is "node-XX.field", and current input is from that node
          if (!Array.isArray(val) && iterationVar.includes(".")) {
            const parts = iterationVar.split(".");
            const fieldPath = parts.slice(1).join(".");
            const valBySuffix = resolve(inputData.input, fieldPath);
            if (Array.isArray(valBySuffix)) {
              val = valBySuffix;
            }
          }

          if (Array.isArray(val)) {
            targetList = val;
          } else {
            // Try to parse the iterationVar string itself as JSON
            try {
              const parsed = JSON.parse(iterationVar);
              if (Array.isArray(parsed)) {
                targetList = parsed;
              } else {
                throw new Error(`变量 "${iterationVar}" 解析后不是数组`);
              }
            } catch {
              throw new Error(
                `无法从变量 "${iterationVar}" 获取数组数据，解析值为: ${JSON.stringify(val)}`,
              );
            }
          }
        } else {
          throw new Error(
            `变量 "iterationVariable" 类型错误: ${typeof iterationVar}`,
          );
        }
      }

      console.log("[Mastra:Iteration] resolved targetList:", targetList);

      // 2. Iterate using internal mini-workflow definition
      let finalResults = [...targetList];

      const def = (inputData as any).__definition__;
      const nodeId = (inputData as any).id;

      let subNodes: any[] = [];
      let subEdges: any[] = [];

      if (def && nodeId) {
        const nestedNodes = def.nodes.filter((n: any) => n.parentId === nodeId);
        if (nestedNodes.length > 0) {
          subNodes = nestedNodes;
          const subNodeIds = new Set(subNodes.map((n: any) => n.id));
          subEdges = def.edges.filter(
            (e: any) => subNodeIds.has(e.source) && subNodeIds.has(e.target),
          );
          console.log(
            `[Mastra:Iteration] Found ${subNodes.length} nodes via parentId: ${nodeId}`,
          );
        }
      }

      // Fallback if still empty
      if (subNodes.length === 0) {
        subNodes = inputData.subNodes || [];
        subEdges = inputData.subEdges || [];
        if (subNodes.length > 0) {
          console.log(
            `[Mastra:Iteration] Found ${subNodes.length} nodes via inputData fallback`,
          );
        }
      }

      if (subNodes.length > 0) {
        console.log(
          `[Mastra:Iteration] Executing sub-workflow with ${subNodes.length} nodes and ${subEdges.length} edges`,
        );
        const { executeMastraWorkflow } = await import("../index");

        const workflowDefinition = {
          nodes: subNodes,
          edges: subEdges,
        };
        const processingMode = inputData.processingMode || "sequential";
        const errorMode = inputData.errorHandling || "terminate";
        const employeeId = "iteration_" + Date.now(); // local mock execution space

        if (processingMode === "sequential") {
          const seqResults = [];
          for (let i = 0; i < targetList.length; i++) {
            const item = targetList[i];
            const inputStr =
              typeof item === "object" ? JSON.stringify(item) : String(item);

            const execRes = await executeMastraWorkflow(
              workflowDefinition as any,
              inputStr,
              employeeId,
              { companyId: inputData.companyId, modelConfig: {} },
            );

            console.log(
              `[Mastra:Iteration] Sequential Step ${i} input:`,
              inputStr,
            );
            console.log(
              `[Mastra:Iteration] Sequential Step ${i} result:`,
              execRes,
            );

            if (!execRes.success && errorMode === "terminate") {
              throw new Error(`第 ${i} 次迭代执行失败: ` + execRes.error);
            }

            if (!execRes.success && errorMode === "continue") {
              seqResults.push(null);
            } else if (execRes.success || errorMode !== "remove_failed") {
              seqResults.push(execRes.finalOutput || null);
            }
          }
          finalResults = seqResults;
        } else {
          // Parallel
          const promises = targetList.map(async (item, i) => {
            const inputStr =
              typeof item === "object" ? JSON.stringify(item) : String(item);
            const execRes = await executeMastraWorkflow(
              workflowDefinition as any,
              inputStr,
              employeeId,
              { companyId: inputData.companyId, modelConfig: {} },
            );
            console.log(
              `[Mastra:Iteration] Parallel Step ${i} input:`,
              inputStr,
            );
            console.log(
              `[Mastra:Iteration] Parallel Step ${i} result:`,
              execRes,
            );
            return {
              success: execRes.success,
              output: execRes.finalOutput,
              error: execRes.error,
              index: i,
            };
          });

          const settled = await Promise.allSettled(promises);
          const parallelResults = [];

          for (let i = 0; i < settled.length; i++) {
            const prom = settled[i];
            if (prom.status === "rejected") {
              if (errorMode === "terminate") throw prom.reason;
              if (errorMode === "continue") parallelResults.push(null);
            } else {
              const res = prom.value;
              if (!res.success) {
                if (errorMode === "terminate")
                  throw new Error(`第 ${i} 次迭代执行失败: ` + res.error);
                if (errorMode === "continue") parallelResults.push(null);
              } else {
                parallelResults.push(res.output);
              }
            }
          }
          finalResults = parallelResults;
        }
      }

      return formatStepOutput(finalResults, {
        items: finalResults,
        count: finalResults.length,
        processingMode: inputData.processingMode,
        errorHandling: inputData.errorHandling,
      });
    } catch (e: any) {
      console.error("[Mastra:Iteration] Error:", e);
      return formatStepOutput([], {
        error: e.message,
        items: [],
        success: false,
      });
    }
  },
});
