import { createStep } from "@mastra/core/workflows";
import { z } from "zod";
import { formatStepOutput, stepOutputSchema } from "./utils";

export const variableAssignmentStep = createStep({
  id: "variable_assignment",
  description: "Assign a value to a variable and output it",
  inputSchema: z.object({
    variableName: z.string().optional(),
    variableValue: z.any().optional(),
    input: z.any().optional(),
  }),
  outputSchema: stepOutputSchema,
  execute: async ({ inputData }) => {
    const value = inputData.variableValue ?? inputData.input;
    const name = inputData.variableName || "result";

    return formatStepOutput(
      {
        [name]: value,
        value: value,
      },
      {
        variableName: name,
        success: true,
      },
    );
  },
});
