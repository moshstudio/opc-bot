import { BaseNodeTypes } from "./BaseNode";
import { IterationNode } from "./IterationNode";
import { LoopNode } from "./LoopNode";

export const WorkflowNodeTypes: Record<string, React.ComponentType<any>> = {
  ...BaseNodeTypes,
  iteration: IterationNode,
  loop: LoopNode,
};
