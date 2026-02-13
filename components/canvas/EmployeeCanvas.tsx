"use client";
import React, { useMemo, useCallback, useState } from "react";
import {
  ReactFlow,
  MiniMap,
  Controls,
  Background,
  Node,
  Edge,
  BackgroundVariant,
  OnNodesChange,
  OnEdgesChange,
  OnConnect,
  Panel,
  useReactFlow,
  Position,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import EmployeeNode from "./EmployeeNode";
import { AddEmployeeDialog } from "./AddEmployeeDialog";
import { Button } from "@/components/ui/button";
import { LayoutGrid, Maximize2, MousePointer2, UserPlus } from "lucide-react";
import dagre from "dagre";

interface EmployeeCanvasProps {
  nodes: Node[];
  edges: Edge[];
  onNodesChange: OnNodesChange;
  onEdgesChange: OnEdgesChange;
  onConnect: OnConnect;
  onAddEmployee: (data: {
    name: string;
    role: string;
    prompt?: string;
    model?: string;
    modelName?: string;
    modelConfig?: any;
    workflow?: any;
  }) => void;
  onNodeClick?: (node: Node) => void;
  onSelectionChange?: (selectedNodes: Node[]) => void;
  onNodeDragStop?: (event: React.MouseEvent, node: Node) => void;
  onEdgesDelete?: (edges: Edge[]) => void;
  setNodes: (nodes: Node[] | ((nds: Node[]) => Node[])) => void;
}

const nodeWidth = 260;
const nodeHeight = 160;

const getLayoutedElements = (
  nodes: Node[],
  edges: Edge[],
  direction = "TB",
) => {
  const dagreGraph = new dagre.graphlib.Graph();
  dagreGraph.setDefaultEdgeLabel(() => ({}));

  const isHorizontal = direction === "LR";
  dagreGraph.setGraph({ rankdir: direction, ranksep: 100, nodesep: 80 });

  nodes.forEach((node) => {
    dagreGraph.setNode(node.id, { width: nodeWidth, height: nodeHeight });
  });

  edges.forEach((edge) => {
    dagreGraph.setEdge(edge.source, edge.target);
  });

  dagre.layout(dagreGraph);

  const newNodes = nodes.map((node) => {
    const nodeWithPosition = dagreGraph.node(node.id);
    return {
      ...node,
      targetPosition: isHorizontal ? Position.Left : Position.Top,
      sourcePosition: isHorizontal ? Position.Right : Position.Bottom,
      position: {
        x: nodeWithPosition.x - nodeWidth / 2,
        y: nodeWithPosition.y - nodeHeight / 2,
      },
    };
  });

  return { nodes: newNodes, edges };
};

export function EmployeeCanvas({
  nodes,
  edges,
  onNodesChange,
  onEdgesChange,
  onConnect,
  onAddEmployee,
  onNodeClick,
  onSelectionChange,
  onNodeDragStop,
  onEdgesDelete,
  setNodes,
}: EmployeeCanvasProps) {
  const nodeTypes = useMemo(() => ({ employee: EmployeeNode }), []);
  const { fitView } = useReactFlow();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);

  const onLayout = useCallback(
    (direction: string) => {
      const { nodes: layoutedNodes } = getLayoutedElements(
        nodes,
        edges,
        direction,
      );
      setNodes([...layoutedNodes]);
      setTimeout(() => fitView({ duration: 800 }), 50);
    },
    [nodes, edges, setNodes, fitView],
  );

  return (
    <div className='w-full h-full relative overflow-hidden bg-slate-50 dark:bg-slate-950'>
      {/* Premium background effects */}
      <div className='absolute inset-0 pointer-events-none overflow-hidden'>
        <div className='absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/5 blur-[120px] rounded-full animate-pulse' />
        <div className='absolute bottom-[-10%] right-[-10%] w-[45%] h-[45%] bg-purple-500/5 blur-[120px] rounded-full animate-pulse delay-700' />
      </div>

      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeDragStop={onNodeDragStop}
        onEdgesDelete={onEdgesDelete}
        nodeTypes={nodeTypes}
        onNodeClick={(_, node) => onNodeClick?.(node)}
        onSelectionChange={({ nodes }) => onSelectionChange?.(nodes)}
        fitView
        deleteKeyCode={["Backspace", "Delete"]}
        defaultEdgeOptions={{
          type: "smoothstep",
          animated: true,
          style: {
            strokeWidth: 2,
            stroke: "#7c3aed",
            opacity: 0.6,
          },
        }}
      >
        <Panel
          position='top-right'
          className='flex flex-col sm:flex-row gap-2 p-1.5 bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl rounded-2xl border border-white/20 dark:border-slate-800/50 shadow-2xl'
        >
          <AddEmployeeDialog
            open={isAddDialogOpen}
            onOpenChange={setIsAddDialogOpen}
            onAdd={onAddEmployee}
          />
          <Button
            onClick={() => setIsAddDialogOpen(true)}
            className='gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-lg shadow-violet-500/20 hover:shadow-violet-500/40 transition-all hover:scale-105 active:scale-95'
            size='sm'
          >
            <UserPlus className='w-4 h-4' />
            <span>添加员工</span>
          </Button>

          <div className='flex gap-2'>
            <Button
              variant='secondary'
              size='sm'
              onClick={() => onLayout("TB")}
              className='flex items-center gap-2 rounded-xl transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]'
            >
              <LayoutGrid className='w-4 h-4 text-primary' />
              <span className='hidden md:inline'>自动排布</span>
            </Button>
            <Button
              variant='outline'
              size='sm'
              onClick={() => fitView({ duration: 800 })}
              className='flex items-center gap-2 rounded-xl bg-white/50 dark:bg-slate-900/50 transition-all hover:bg-white dark:hover:bg-slate-800'
            >
              <Maximize2 className='w-4 h-4' />
              <span className='hidden md:inline'>居中</span>
            </Button>
          </div>
        </Panel>

        <Controls className='!left-4 !bottom-4 !bg-white/70 dark:!bg-slate-900/70 !backdrop-blur-xl !border-slate-200/50 dark:!border-slate-800/50 !rounded-2xl !shadow-2xl !p-1 overflow-hidden' />

        <MiniMap
          className='!right-4 !bottom-4 !bg-white/70 dark:!bg-slate-900/70 !backdrop-blur-xl !border-slate-200/50 dark:!border-slate-800/50 !rounded-2xl !shadow-2xl !m-0 overflow-hidden'
          nodeColor={(node) => {
            switch (node.data.role) {
              case "ceo":
                return "#3b82f6";
              case "product_manager":
                return "#10b981";
              case "assistant":
                return "#a855f7";
              default:
                return "#94a3b8";
            }
          }}
          maskColor='rgba(0, 0, 0, 0.05)'
          ariaLabel='Team Overview Map'
        />

        <Background
          variant={BackgroundVariant.Dots}
          gap={28}
          size={1.5}
          color='rgba(0, 100, 255, 0.08)'
        />

        {/* Visual cues for empty state or interaction */}
        {nodes.length <= 1 && (
          <div className='absolute inset-0 flex items-center justify-center pointer-events-none'>
            <div className='text-center space-y-6 animate-in fade-in zoom-in duration-1000'>
              <div className='relative inline-block'>
                <MousePointer2 className='w-16 h-16 mx-auto text-primary/20 animate-bounce' />
                <div className='absolute inset-0 bg-primary/10 blur-2xl rounded-full' />
              </div>
              <div className='space-y-2'>
                <p className='text-2xl font-bold tracking-tight text-slate-800 dark:text-slate-200'>
                  开始构建你的 AI 团队
                </p>
                <p className='text-sm text-slate-500 max-w-[300px] mx-auto leading-relaxed'>
                  点击右上角按钮添加员工，或者将现有员工进行排布连接。
                </p>
              </div>
            </div>
          </div>
        )}
      </ReactFlow>
    </div>
  );
}
