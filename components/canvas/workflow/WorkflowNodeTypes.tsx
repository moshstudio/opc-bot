import { BaseNodeTypes } from "./BaseNode";
import { IterationNode } from "./IterationNode";

export const WorkflowNodeTypes: Record<string, React.ComponentType<any>> = {
  ...BaseNodeTypes,
  iteration: IterationNode,
};
