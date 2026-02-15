import { createStep, createWorkflow } from "@mastra/core/workflows";
import { z } from "zod";

const step1 = createStep({
  id: "format-step",
  inputSchema: z.object({ message: z.string() }),
  outputSchema: z.object({ formatted: z.string() }),
  execute: async ({ inputData }) => ({
    formatted: inputData.message.toUpperCase(),
  }),
});

const step2 = createStep({
  id: "count-step",
  inputSchema: z.object({ message: z.string() }),
  outputSchema: z.object({ count: z.number() }),
  execute: async ({ inputData }) => ({
    count: inputData.message.length,
  }),
});

const step3 = createStep({
  id: "combine-step",
  // The inputSchema must match the structure of parallel outputs
  inputSchema: z.object({
    "format-step": z.object({ formatted: z.string() }),
    "count-step": z.object({ count: z.number() }),
  }),
  outputSchema: z.object({ result: z.string() }),
  execute: async ({ inputData }) => {
    // Access each parallel step's output by its id
    const formatted = inputData["format-step"].formatted;
    const count = inputData["count-step"].count;
    return {
      result: `${formatted} (${count} characters)`,
    };
  },
});

export const parallelWorkflow = createWorkflow({
  id: "parallel-output-example",
  inputSchema: z.object({ message: z.string() }),
  outputSchema: z.object({ result: z.string() }),
})
  .parallel([step1, step2])
  .then(step3)
  .commit();
