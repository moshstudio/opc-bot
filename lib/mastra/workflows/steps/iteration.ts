import { createStep } from "@mastra/core/workflows";
import { z } from "zod";

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
  outputSchema: z.any(),
  execute: async ({ inputData }) => {
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
            if (Array.isArray(parsed)) targetList = parsed;
          } catch {
            /* ignore */
          }
        }
      } else {
        // Mock variable resolution for now since utils varies
        const val = (inputData as any)[iterationVar];
        if (Array.isArray(val)) {
          targetList = val;
        } else if (typeof val === "string") {
          try {
            const parsed = JSON.parse(val);
            if (Array.isArray(parsed)) targetList = parsed;
          } catch {
            targetList = val
              .split(",")
              .map((s) => s.trim())
              .filter(Boolean);
          }
        } else if (val !== undefined && val !== null) {
          targetList = [val];
        }
      }

      // 2. Iterate using internal mini-workflow definition
      let finalResults = [...targetList];

      const def = (inputData as any).__definition__;
      const nodeId = (inputData as any).id;

      let subNodes: any[] = [];
      let subEdges: any[] = [];

      if (def && nodeId) {
        subNodes = def.nodes.filter((n: any) => n.parentId === nodeId);
        const subNodeIds = new Set(subNodes.map((n: any) => n.id));
        subEdges = def.edges.filter(
          (e: any) => subNodeIds.has(e.source) && subNodeIds.has(e.target),
        );
      } else {
        // Fallback for old data or tests
        subNodes = inputData.subNodes || [];
        subEdges = inputData.subEdges || [];
      }

      if (subNodes.length > 0) {
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

      const resultObj = {
        items: finalResults,
        count: finalResults.length,
        processingMode: inputData.processingMode,
        errorHandling: inputData.errorHandling,
      };

      return resultObj;
    } catch (e: any) {
      console.error("[Mastra:Iteration] Error:", e);
      return { error: e.message, items: [] };
    }
  },
});
