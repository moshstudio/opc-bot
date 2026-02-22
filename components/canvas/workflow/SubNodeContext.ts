import { createContext } from "react";
import { Node, Edge } from "@xyflow/react";

export const SubNodeContext = createContext<{
  onSelectSubNode: (
    node: Node,
    parentId: string,
    subNodes: Node[],
    subEdges: Edge[],
  ) => void;
  onUpdateSubFlow: (
    parentId: string,
    subNodes: Node[],
    subEdges: Edge[],
  ) => void;
  deselectTrigger: number;
} | null>(null);
