import { createStep } from "@mastra/core/workflows";
import { z } from "zod";
import { formatStepOutput, stepOutputSchema } from "./utils";

export const loopStep = createStep({
  id: "loop",
  description:
    "Dify-style loop: Sequential execution with state persistence and termination conditions",
  inputSchema: z.object({
    loopVariables: z
      .array(
        z.object({
          name: z.string(),
          initialValue: z.any().optional(),
        }),
      )
      .optional()
      .default([]),
    loopCondition: z.string().optional(),
    maxLoops: z.number().optional().default(10),
    subNodes: z.any().optional(),
    subEdges: z.any().optional(),
    input: z.any().optional(),
    companyId: z.string().optional(),
  }),
  outputSchema: stepOutputSchema,
  execute: async ({ inputData }) => {
    console.log(
      "[Mastra:Loop] execute inputData:",
      JSON.stringify(inputData, null, 2),
    );

    try {
      const { executeMastraWorkflow } = await import("../index");
      const maxLoops = inputData.maxLoops || 10;
      const loopCondition = inputData.loopCondition;

      // 1. Initialize Loop State
      const loopState: Record<string, any> = {};
      if (inputData.loopVariables) {
        inputData.loopVariables.forEach((v: any) => {
          loopState[v.name] = v.initialValue;
        });
      }

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
        }
      }

      if (subNodes.length === 0) {
        subNodes = inputData.subNodes || [];
        subEdges = inputData.subEdges || [];
      }

      if (subNodes.length === 0) {
        throw new Error("循环节点内部没有定义子工作流");
      }

      const workflowDefinition = { nodes: subNodes, edges: subEdges };
      const employeeId = "loop_" + Date.now();

      const iterations: any[] = [];
      let currentIteration = 0;
      let shouldBreak = false;

      // 2. Main Loop
      while (currentIteration < maxLoops && !shouldBreak) {
        console.log(`[Mastra:Loop] Starting iteration ${currentIteration}`);

        // Prepare input for this iteration (current state)
        const iterationInput = {
          iterationIndex: currentIteration,
          state: loopState,
          ...loopState, // Flatten state for easier access in nodes
        };

        const execRes = await executeMastraWorkflow(
          workflowDefinition as any,
          typeof iterationInput === "object"
            ? JSON.stringify(iterationInput)
            : String(iterationInput),
          employeeId,
          { companyId: inputData.companyId, modelConfig: {} },
        );

        if (!execRes.success) {
          throw new Error(
            `第 ${currentIteration} 次循环失败: ${execRes.error}`,
          );
        }

        // 3. Update State from Iteration Results
        // In Dify-style, we might look for specific updates or just take the final output
        const iterationOutput = execRes.finalOutput;
        iterations.push(iterationOutput);

        // Check for 'exit_loop' signal
        const hasExitNode = execRes.nodeResults.some(
          (nr) =>
            (nr.nodeType as any) === "exit_loop" && nr.status === "completed",
        );
        if (hasExitNode) {
          console.log(`[Mastra:Loop] Exit signal received from sub-workflow`);
          shouldBreak = true;
          break;
        }

        // If iteration output is an object, update state variables if they match
        if (iterationOutput && typeof iterationOutput === "object") {
          Object.keys(loopState).forEach((key) => {
            if (key in iterationOutput) {
              loopState[key] = iterationOutput[key];
            }
          });
        }

        currentIteration++;

        // 4. Evaluate Termination Condition
        if (loopCondition && !shouldBreak) {
          try {
            // Simple JS evaluation (Use with caution in production)
            // Use current state for evaluation
            const context = {
              ...loopState,
              input: iterationOutput,
              iterationIndex: currentIteration - 1,
            };
            const isFinished = new Function(
              ...Object.keys(context),
              `return !!(${loopCondition})`,
            )(...Object.values(context));

            if (isFinished) {
              console.log(
                `[Mastra:Loop] Termination condition met: ${loopCondition}`,
              );
              shouldBreak = true;
            }
          } catch (e: any) {
            console.warn(
              `[Mastra:Loop] Condition evaluation failed: ${e.message}`,
            );
          }
        }
      }

      return formatStepOutput(iterations, {
        finalState: loopState,
        iterations: iterations.length,
        totalIterations: currentIteration,
        items: iterations,
      });
    } catch (e: any) {
      console.error("[Mastra:Loop] Error:", e);
      return formatStepOutput([], {
        error: e.message,
        items: [],
        success: false,
      });
    }
  },
});
