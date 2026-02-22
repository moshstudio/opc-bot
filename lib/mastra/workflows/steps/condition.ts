import { createStep } from "@mastra/core/workflows";
import { z } from "zod";
import { formatStepOutput, stepOutputSchema } from "./utils";

/**
 * 条件判断 Step
 */
export const conditionStep = createStep({
  id: "condition",
  inputSchema: z.object({
    // New schema
    conditions: z
      .array(
        z.object({
          id: z.string().optional(),
          variable: z.string().optional(),
          operator: z.string().optional(),
          value: z.any().optional(),
        }),
      )
      .optional(),
    logicalOperator: z.enum(["AND", "OR"]).optional().default("AND"),

    // Legacy schema (kept for backward compatibility)
    input: z.any().optional(),
    targetVariable: z.any().optional(),
    conditionType: z.string().optional(),
    conditionValue: z.any().optional(),
    expression: z.string().optional(),
  }),
  outputSchema: stepOutputSchema,
  execute: async ({ inputData, getStepResult }) => {
    try {
      // Helper function to resolve variable value from step results
      const resolveVariable = (varPath: string) => {
        if (!varPath) return undefined;
        if (varPath === "__input__") return inputData.input;

        const parts = varPath.split(".");
        const nodeId = parts[0];
        const path = parts.slice(1);

        // Get step result using the provided helper
        const stepResult = getStepResult?.(nodeId);
        if (!stepResult) return undefined;

        // If no path is specified (just nodeId), try to return the most relevant "main" output
        if (path.length === 0) {
          return (
            (stepResult as any)?.output ??
            (stepResult as any)?.data ??
            (stepResult as any)?.result ??
            stepResult
          );
        }

        // Traverse the path to find the specific field
        let current: any = stepResult;

        // Special consistency check:
        // Some nodes wrap output in an "output" property, others don't.
        // If the first path key is not in current but IS in current.output, dive in.
        if (
          current &&
          typeof current === "object" &&
          !(path[0] in current) &&
          current.output &&
          typeof current.output === "object" &&
          path[0] in current.output
        ) {
          current = current.output;
        }

        for (const p of path) {
          if (current && typeof current === "object" && p in current) {
            current = current[p];
          } else {
            return undefined;
          }
        }
        return current;
      };

      // Check if using new conditions array
      const conditions = inputData.conditions || [];

      // If no new conditions are defined, fallback to legacy logic
      if (conditions.length === 0) {
        // 1. Determine target (Left Operand)
        const target =
          inputData.targetVariable !== undefined
            ? inputData.targetVariable
            : inputData.input;

        // 2. Determine condition type
        let type = inputData.conditionType;
        if (!type && inputData.expression) {
          type = "js_expression";
        }
        if (!type) type = "contains"; // Default

        const value = inputData.conditionValue;

        // Reuse the evaluate function defined below or duplicate logic?
        // Let's implement a single evaluator function to use for both.
        const res = evaluateCondition(
          target,
          type,
          value,
          inputData.expression,
        );
        return formatStepOutput(res, { result: res });
      }

      // 3. Evaluate new condition list
      const results = conditions.map((cond) => {
        const targetValue = resolveVariable(cond.variable || "");
        return evaluateCondition(
          targetValue,
          cond.operator || "contains",
          cond.value,
        );
      });

      const finalResult =
        inputData.logicalOperator === "OR"
          ? results.some((r) => r)
          : results.every((r) => r);

      return formatStepOutput(finalResult, { result: finalResult });
    } catch (e) {
      console.error("Condition evaluation failed:", e);
      return formatStepOutput(false, { result: false, success: false });
    }
  },
});

function evaluateCondition(
  target: any,
  operator: string,
  value: any,
  expression?: string,
): boolean {
  switch (operator) {
    case "js_expression":
      const expr = expression || value;
      if (!expr) return false;
      const fn = new Function("input", `return !!(${expr})`);
      return fn(target);

    case "contains":
      if (target === null || target === undefined) return false;
      if (typeof target === "string" || Array.isArray(target)) {
        return target.includes(value);
      }
      return String(target).includes(String(value));

    case "not_contains":
      if (target === null || target === undefined) return true;
      if (typeof target === "string" || Array.isArray(target)) {
        return !target.includes(value);
      }
      return !String(target).includes(String(value));

    case "equals":
      // Handle boolean vs string (e.g., true vs "true")
      if (typeof target === "boolean" && typeof value === "string") {
        return String(target) === value;
      }
      // Loose equality to handle "1" == 1
      return target == value;

    case "not_equals":
      if (typeof target === "boolean" && typeof value === "string") {
        return String(target) !== value;
      }
      return target != value;

    case "start_with":
      return String(target || "").startsWith(String(value || ""));

    case "end_with":
      return String(target || "").endsWith(String(value || ""));

    case "is_empty":
      if (target === null || target === undefined) return true;
      if (typeof target === "string") return target.trim() === "";
      if (Array.isArray(target)) return target.length === 0;
      if (typeof target === "object") return Object.keys(target).length === 0;
      return false;

    case "not_empty":
      if (target === null || target === undefined) return false;
      if (typeof target === "string") return target.trim() !== "";
      if (Array.isArray(target)) return target.length > 0;
      if (typeof target === "object") return Object.keys(target).length > 0;
      return true;

    case "is_null":
      return target === null || target === undefined;

    case "not_null":
      return target !== null && target !== undefined;

    case "regex":
      try {
        const re = new RegExp(String(value));
        return re.test(String(target));
      } catch {
        return false;
      }

    case "gt":
      return Number(target) > Number(value);
    case "lt":
      return Number(target) < Number(value);
    case "gte":
      return Number(target) >= Number(value);
    case "lte":
      return Number(target) <= Number(value);

    default:
      return false;
  }
}
