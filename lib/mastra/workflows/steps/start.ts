import { createStep } from "@mastra/core/workflows";
import { z } from "zod";
import { formatStepOutput, stepOutputSchema } from "./utils";

/**
 * Start Step - 用于用户手动触发
 */
export const startStep = createStep({
  id: "start",
  inputSchema: z.object({
    input: z.any().optional().default(""),
    companyId: z.string().optional(),
  }),
  outputSchema: stepOutputSchema,
  execute: async ({ inputData }) => {
    // 如果 inputData.input 已经是对象且包含 output，尝试解构一层
    const rawInput = inputData.input;
    const finalInput =
      rawInput && typeof rawInput === "object" && "output" in rawInput
        ? rawInput.output
        : rawInput;

    return formatStepOutput(finalInput || "");
  },
});

/**
 * Cron Trigger Step - 用于定时触发
 */
export const cronTriggerStep = createStep({
  id: "cron_trigger",
  inputSchema: z.object({
    input: z.any().optional(),
    companyId: z.string().optional(),
  }),
  outputSchema: stepOutputSchema,
  execute: async ({ inputData }) => {
    const now = new Date();
    const triggerTime = now.toLocaleString("zh-CN", { hour12: false });
    const timestamp = now.getTime();

    // 定时触发的主要输出可以是触发时间描述
    const primaryOutput = `定时任务触发于 ${triggerTime}`;

    return formatStepOutput(primaryOutput, {
      triggerTime,
      timestamp,
      type: "cron",
    });
  },
});

/**
 * Output Step - 用于工作流最终输出
 * 这里不再重复包装 formatStepOutput，或者确保解构
 */
export const outputStep = createStep({
  id: "output",
  inputSchema: z.object({
    input: z.any().optional(),
  }),
  outputSchema: stepOutputSchema,
  execute: async ({ inputData }) => {
    const rawInput = inputData.input;
    // 解构可能存在的嵌套 wrapper
    let finalOutput = rawInput;
    if (rawInput && typeof rawInput === "object") {
      if ("output" in rawInput) {
        finalOutput = rawInput.output;
      }
    }

    return formatStepOutput(finalOutput);
  },
});
