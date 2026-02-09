"use client";
import React, { useCallback, useMemo } from "react";
import {
  ReactFlow,
  MiniMap,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  addEdge,
  Connection,
  Edge,
  Node,
  BackgroundVariant,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import EmployeeNode from "./EmployeeNode";
import { AddEmployeeDialog } from "./AddEmployeeDialog";
import { v4 as uuidv4 } from "uuid";

const initialNodes: Node[] = [
  {
    id: "1",
    position: { x: 250, y: 0 },
    data: { label: "CEO (You)", role: "ceo", status: "active" },
    type: "employee",
  },
];
const initialEdges: Edge[] = [];

interface EmployeeCanvasProps {
  onNodeClick?: (node: Node) => void;
}

export function EmployeeCanvas({ onNodeClick }: EmployeeCanvasProps) {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  const nodeTypes = useMemo(() => ({ employee: EmployeeNode }), []);

  const onConnect = useCallback(
    (params: Connection) => setEdges((eds) => addEdge(params, eds)),
    [setEdges],
  );

  const handleAddEmployee = (data: { name: string; role: string }) => {
    const newNode: Node = {
      id: uuidv4(),
      position: { x: Math.random() * 400, y: Math.random() * 400 + 100 },
      data: {
        label: data.name,
        role: data.role,
        status: "idle",
      },
      type: "employee",
    };
    setNodes((nds) => nds.concat(newNode));
  };

  return (
    <div style={{ width: "100%", height: "100%", position: "relative" }}>
      <AddEmployeeDialog onAdd={handleAddEmployee} />
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        nodeTypes={nodeTypes}
        onNodeClick={(_, node) => onNodeClick?.(node)}
        fitView
      >
        <Controls />
        <MiniMap />
        <Background
          variant={BackgroundVariant.Dots}
          gap={12}
          size={1}
        />
      </ReactFlow>
    </div>
  );
}
