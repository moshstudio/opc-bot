import { createStep } from "@mastra/core/workflows";
import { z } from "zod";

/**
 * Start Step
 */
export const startStep = createStep({
  id: "start",
  inputSchema: z.object({
    input: z.string().optional().default(""),
    companyId: z.string().optional(),
  }),
  outputSchema: z.object({
    output: z.string(),
    companyId: z.string().optional(),
  }),
  execute: async ({ inputData }) => {
    return {
      output: inputData.input || "",
    };
  },
});
