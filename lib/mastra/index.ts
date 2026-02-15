import { Mastra } from "@mastra/core";
import { workflow, parallelWorkflow } from "./workflows";
import { agents } from "./agents";

export const mastra = new Mastra({
  workflows: {
    workflow,
    parallelWorkflow,
  },
  agents: agents,
});
