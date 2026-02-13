import { Mastra } from "@mastra/core";
import { workflow } from "./workflows";
import { agents } from "./agents";

export const mastra = new Mastra({
  workflows: {
    workflow,
  },
  agents: agents,
});
