import { createStep } from "@mastra/core/workflows";
import { z } from "zod";

/**
 * 变量聚合 Step
 */
export const variableAggregatorStep = createStep({
  id: "variable_aggregator",
  inputSchema: z.object({
    aggregateVariables: z.array(z.string()).optional(),
    aggregateStrategy: z
      .enum(["concat", "merge", "array"])
      .optional()
      .default("concat"),
  }),
  outputSchema: z.any(),
  execute: async ({ inputData, getStepResult }) => {
    const vars = inputData.aggregateVariables || [];
    const strategy = inputData.aggregateStrategy || "concat";

    const rawValues = vars.map((nodeId) => {
      const result = getStepResult(nodeId) as any;
      // 兼容 output/data/result 以及直接结果
      return result?.output ?? result?.data ?? result?.result ?? result;
    });

    let finalOutput: any;
    switch (strategy) {
      case "array":
        // 直接返回数组，包含原始对象，避免二次 Stringify 导致转义爆炸
        finalOutput = rawValues;
        break;
      case "merge":
        // 紧凑合并
        finalOutput = rawValues
          .map((v) =>
            typeof v === "object" && v !== null
              ? JSON.stringify(v)
              : String(v ?? ""),
          )
          .join("");
        break;
      case "concat":
      default:
        // 换行拼接
        finalOutput = rawValues
          .map((v) =>
            typeof v === "object" && v !== null
              ? JSON.stringify(v)
              : String(v ?? ""),
          )
          .join("\n");
    }

    return {
      output: finalOutput,
    };
  },
});
