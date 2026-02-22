import { createStep } from "@mastra/core/workflows";
import { z } from "zod";
import { formatStepOutput, stepOutputSchema } from "./utils";

export const exitLoopStep = createStep({
  id: "exit_loop",
  description: "Terminate the current loop immediately",
  inputSchema: z.object({
    message: z.string().optional().default("Exit Loop signal"),
  }),
  outputSchema: stepOutputSchema,
  execute: async ({ inputData }) => {
    return formatStepOutput(
      {
        signal: "break",
        message: inputData.message,
      },
      {
        status: "completed",
        isExitSignal: true,
      },
    );
  },
});
