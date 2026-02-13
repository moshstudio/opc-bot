"use client";

import React, { useCallback, useState } from "react";
import {
  ReactFlow,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  addEdge,
  Connection,
  Node,
  ReactFlowProvider,
  Panel,
  useReactFlow,
  MiniMap,
} from "@xyflow/react";
import { Grid3X3, Lock, Unlock, Map as MapIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import "@xyflow/react/dist/style.css";
import { NodeDialogs } from "./NodeDialogs";
import { NodeDetailsPanel } from "./NodeDetailsPanel";
import { AddNodePanel } from "./AddNodePanel";
import { WorkflowNodeTypes } from "./WorkflowNodeTypes";
import { NODE_THEMES, type NodeTheme } from "./nodeTypeConfig";
import { useModelContext } from "@/components/ModelContext";
import { Button } from "@/components/ui/button";
import { testExecuteWorkflow } from "@/app/actions/workflow-actions";
import { Play, Loader2, Save, Plus } from "lucide-react";
import { toast } from "sonner";
import {
  WorkflowDefinition,
  WorkflowNode,
  WorkflowEdge,
} from "@/lib/workflow/types";

const EDGE_COLORS: Record<string, string> = {
  emerald: "#10b981",
  violet: "#8b5cf6",
  blue: "#3b82f6",
  amber: "#f59e0b",
  yellow: "#eab308",
  cyan: "#06b6d4",
  rose: "#f43f5e",
  indigo: "#6366f1",
  teal: "#14b8a6",
};

const getNodeColor = (type?: string) => {
  const theme = NODE_THEMES[type || "process"] || NODE_THEMES.process;
  return EDGE_COLORS[theme.color] || "#94a3b8";
};

interface WorkflowCanvasProps {
  initialWorkflow?: WorkflowDefinition;
  onSave: (workflow: WorkflowDefinition) => void;
  allEmployees: { id: string; name: string; role: string }[];
  currentEmployeeId: string;
}

function WorkflowCanvasContent({
  initialWorkflow,
  onSave,
  allEmployees,
  currentEmployeeId,
}: WorkflowCanvasProps) {
  const [nodes, setNodes, onNodesChange] = useNodesState(
    (initialWorkflow?.nodes || []) as any[],
  );
  const [edges, setEdges, onEdgesChange] = useEdgesState(
    (initialWorkflow?.edges?.map((e) => {
      const targetNode = initialWorkflow.nodes.find((n) => n.id === e.target);
      return {
        ...e,
        animated: true,
        style: {
          ...(e as any).style,
          stroke: getNodeColor(targetNode?.type as string),
        },
      };
    }) || []) as any[],
  );
  const [activeDialog, setActiveDialog] = useState<string | null>(null);
  const [addPanelOpen, setAddPanelOpen] = useState(false);
  const { models } = useModelContext();
  const { getNode, screenToFlowPosition } = useReactFlow();

  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [showMiniMap, setShowMiniMap] = useState(true);
  const [showGrid, setShowGrid] = useState(true);
  const [isLocked, setIsLocked] = useState(false);
  const [isExecuting, setIsExecuting] = useState(false);

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
  }, []);

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();

      const type = event.dataTransfer.getData("application/reactflow");
      if (!type) return;

      const position = screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });

      const theme = NODE_THEMES[type] || NODE_THEMES.process;

      const newNode: Node = {
        id: crypto.randomUUID(),
        type,
        position,
        data: {
          label: theme.defaultLabel,
          status: "idle",
        },
      };

      const newNodes = nodes.concat(newNode);
      setNodes(newNodes);
      onSave({ nodes: newNodes, edges });
    },
    [nodes, edges, screenToFlowPosition, onSave, setNodes],
  );

  const onConnect = useCallback(
    (params: Connection) => {
      const targetNode = getNode(params.target);
      const color = getNodeColor(targetNode?.type);
      const newEdges = addEdge(
        { ...params, animated: true, style: { stroke: color } },
        edges,
      );
      setEdges(newEdges);
      onSave({
        nodes: nodes as any as WorkflowNode[],
        edges: newEdges as any as WorkflowEdge[],
      });
    },
    [setEdges, getNode, edges, nodes, onSave],
  );

  const onNodeClick = useCallback((_: React.MouseEvent, node: Node) => {
    setSelectedNodeId(node.id);
    setAddPanelOpen(false);
  }, []);

  const onPaneClick = useCallback(() => {
    setSelectedNodeId(null);
  }, []);

  const handleUpdateNode = useCallback(
    (id: string, data: any) => {
      const newNodes = nodes.map((node) => {
        if (node.id === id) {
          return { ...node, data: { ...node.data, ...data } };
        }
        return node;
      });
      setNodes(newNodes);
      onSave({
        nodes: newNodes as any as WorkflowNode[],
        edges: edges as any as WorkflowEdge[],
      });
    },
    [nodes, edges, setNodes, onSave],
  );

  const handleDeleteNode = useCallback(
    (id: string) => {
      const newNodes = nodes.filter((node) => node.id !== id);
      const newEdges = edges.filter(
        (edge) => edge.source !== id && edge.target !== id,
      );
      setNodes(newNodes);
      setEdges(newEdges);
      setSelectedNodeId(null);
      onSave({
        nodes: newNodes as any as WorkflowNode[],
        edges: newEdges as any as WorkflowEdge[],
      });
    },
    [nodes, edges, setNodes, setEdges, onSave],
  );

  const handleCreateNode = useCallback(
    (type: string, data: any) => {
      const newNode: Node = {
        id: crypto.randomUUID(),
        type,
        position: {
          x: Math.random() * 500 + 150,
          y: Math.random() * 500 + 150,
        },
        data: { label: data.label, ...data },
      };
      const newNodes = nodes.concat(newNode);
      setNodes(newNodes);
      onSave({ nodes: newNodes, edges });
    },
    [nodes, edges, setNodes, onSave],
  );

  const handleSelectNodeType = useCallback(
    (type: string, theme: NodeTheme) => {
      if (theme.needsDialog) {
        // For types with a dialog, open the dialog for configuration
        setActiveDialog(type);
        setAddPanelOpen(false);
      } else {
        // For simple types, create node directly with defaults
        handleCreateNode(type, {
          label: theme.defaultLabel,
        });
        setAddPanelOpen(false);
      }
    },
    [handleCreateNode],
  );

  const handleSave = useCallback(() => {
    onSave({
      nodes: nodes as any as WorkflowNode[],
      edges: edges as any as WorkflowEdge[],
    });
  }, [nodes, edges, onSave]);

  const handleRunWorkflow = useCallback(async () => {
    if (isExecuting) return;

    setIsExecuting(true);
    toast.info("正在启动工作流测试...");

    try {
      // 1. 重置所有节点状态
      setNodes((nds) =>
        nds.map((node) => ({
          ...node,
          data: { ...node.data, status: "idle", output: undefined },
        })),
      );

      // 2. 执行工作流
      const result = await testExecuteWorkflow(
        currentEmployeeId,
        {
          nodes: nodes as any as WorkflowNode[],
          edges: edges as any as WorkflowEdge[],
        },
        "测试输入", // 这里可以以后改为弹窗让用户输入
      );

      if (result.success) {
        toast.success("工作流预览运行成功");
      } else {
        toast.error(`工作流运行失败: ${result.error}`);
      }

      // 3. 更新节点状态
      setNodes((nds) =>
        nds.map((node) => {
          const nodeResult = result.nodeResults.find(
            (r) => r.nodeId === node.id,
          );
          if (nodeResult) {
            return {
              ...node,
              data: {
                ...node.data,
                status: nodeResult.status === "completed" ? "success" : "error",
                output: nodeResult.output,
                error: nodeResult.error,
              },
            };
          }
          return node;
        }),
      );
    } catch (error: any) {
      toast.error(`执行出错: ${error.message}`);
    } finally {
      setIsExecuting(false);
    }
  }, [nodes, edges, currentEmployeeId, isExecuting, setNodes]);

  const selectedNode = nodes.find((n) => n.id === selectedNodeId);

  return (
    <div className='h-full w-full relative bg-slate-50 dark:bg-slate-950/50'>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeClick={onNodeClick}
        onPaneClick={onPaneClick}
        onDrop={onDrop}
        onDragOver={onDragOver}
        nodeTypes={WorkflowNodeTypes}
        fitView
        fitViewOptions={{ padding: 0.4, maxZoom: 0.8 }}
        minZoom={0.2}
        className='bg-slate-50 dark:bg-slate-950/50'
        defaultEdgeOptions={{ animated: true }}
        nodesDraggable={!isLocked}
        nodesConnectable={!isLocked}
        elementsSelectable={!isLocked}
      >
        {showGrid && (
          <Background
            color='#94a3b8'
            gap={16}
            size={1}
            className='opacity-20'
          />
        )}

        {showMiniMap && (
          <MiniMap
            position='bottom-right'
            className='!bg-white dark:!bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg shadow-lg overflow-hidden'
            nodeColor={(n) => {
              const theme =
                NODE_THEMES[n.type || "process"] || NODE_THEMES.process;
              return EDGE_COLORS[theme.color] || "#94a3b8";
            }}
            maskColor='rgba(148, 163, 184, 0.1)'
          />
        )}

        <Controls
          showInteractive={false}
          className='bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-lg !flex !flex-row !gap-0.5 !p-1 !rounded-lg'
        >
          <Button
            variant='ghost'
            size='icon'
            className='w-7 h-7'
            onClick={() => setShowGrid(!showGrid)}
            title={showGrid ? "隐藏网格" : "显示网格"}
          >
            <Grid3X3
              className={cn(
                "w-3.5 h-3.5",
                showGrid ? "text-violet-600" : "text-slate-500",
              )}
            />
          </Button>
          <Button
            variant='ghost'
            size='icon'
            className='w-7 h-7'
            onClick={() => setShowMiniMap(!showMiniMap)}
            title={showMiniMap ? "隐藏缩略图" : "显示缩略图"}
          >
            <MapIcon
              className={cn(
                "w-3.5 h-3.5",
                showMiniMap ? "text-violet-600" : "text-slate-500",
              )}
            />
          </Button>
          <Button
            variant='ghost'
            size='icon'
            className='w-7 h-7'
            onClick={() => setIsLocked(!isLocked)}
            title={isLocked ? "解锁画布" : "锁定画布"}
          >
            {isLocked ? (
              <Lock className='w-3.5 h-3.5 text-amber-600' />
            ) : (
              <Unlock className='w-3.5 h-3.5 text-slate-500' />
            )}
          </Button>
        </Controls>

        <Panel
          position='top-left'
          className='flex gap-2'
        >
          <Button
            onClick={handleRunWorkflow}
            disabled={isExecuting}
            className='bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-500/20'
            size='sm'
          >
            {isExecuting ? (
              <Loader2 className='w-4 h-4 mr-2 animate-spin' />
            ) : (
              <Play className='w-4 h-4 mr-2' />
            )}
            测试运行
          </Button>
          <Button
            onClick={handleSave}
            className='bg-violet-600 hover:bg-violet-700 text-white shadow-lg shadow-violet-500/20'
            size='sm'
          >
            <Save className='w-4 h-4 mr-2' />
            保存工作流
          </Button>
          <Button
            onClick={() => {
              setAddPanelOpen(!addPanelOpen);
              setSelectedNodeId(null);
            }}
            variant={addPanelOpen ? "secondary" : "outline"}
            size='sm'
            className='shadow-lg'
          >
            <Plus className='w-4 h-4 mr-2' />
            添加节点
          </Button>
        </Panel>
      </ReactFlow>

      {/* Add Node Panel */}
      <AddNodePanel
        open={addPanelOpen && !selectedNode}
        onClose={() => setAddPanelOpen(false)}
        onSelectNode={handleSelectNodeType}
      />

      {/* Node Details Panel */}
      {selectedNode && (
        <NodeDetailsPanel
          key={selectedNode.id}
          node={selectedNode}
          onUpdate={handleUpdateNode}
          onDelete={handleDeleteNode}
          onClose={() => setSelectedNodeId(null)}
          allEmployees={allEmployees}
        />
      )}

      <NodeDialogs
        activeDialog={activeDialog}
        setActiveDialog={setActiveDialog}
        onCreateNode={handleCreateNode}
        models={models}
        availableSubEmployees={allEmployees.filter(
          (e) => e.id !== currentEmployeeId,
        )}
        allEmployees={allEmployees}
      />
    </div>
  );
}

export default function WorkflowCanvas(props: WorkflowCanvasProps) {
  return (
    <ReactFlowProvider>
      <WorkflowCanvasContent {...props} />
    </ReactFlowProvider>
  );
}
