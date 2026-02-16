"use client";

import React, { useCallback, useState, useEffect } from "react";
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
import { nanoid } from "nanoid";
import { cn } from "@/lib/utils";
import "@xyflow/react/dist/style.css";
import { NodeDialogs } from "./NodeDialogs";
import { NodeDetailsPanel } from "./NodeDetailsPanel";
import { AddNodePanel } from "./AddNodePanel";
import { WorkflowNodeTypes } from "./WorkflowNodeTypes";
import { NODE_THEMES, type NodeTheme } from "./nodeTypeConfig";
import { useModelContext } from "@/components/ModelContext";
import { Button } from "@/components/ui/button";
import { Play, Loader2, Save, Plus } from "lucide-react";
import { toast } from "sonner";
import {
  WorkflowDefinition,
  WorkflowNode,
  WorkflowEdge,
  WorkflowExecutionResult,
} from "@/lib/workflow/types";
import { TestRunDialog } from "./TestRunDialog";
import { TestRunDrawer } from "./TestRunDrawer";

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
  const [testDialogOpen, setTestDialogOpen] = useState(false);
  const [testResult, setTestResult] = useState<WorkflowExecutionResult | null>(
    null,
  );
  const [testDrawerOpen, setTestDrawerOpen] = useState(false);

  // 监听节点和连线变化，更新节点“不可达”状态
  useEffect(() => {
    const TRIGGER_TYPES = ["start", "cron_trigger", "webhook"];
    const startNodes = nodes.filter((n) =>
      TRIGGER_TYPES.includes(n.type || ""),
    );

    const reachableIds = new Set<string>();
    if (startNodes.length > 0) {
      const queue = [...startNodes];
      startNodes.forEach((n) => reachableIds.add(n.id));

      const adj = new Map<string, string[]>();
      edges.forEach((e) => {
        if (!adj.has(e.source)) adj.set(e.source, []);
        adj.get(e.source)!.push(e.target);
      });

      let head = 0;
      while (head < queue.length) {
        const curr = queue[head++];
        const neighbors = adj.get(curr.id) || [];
        for (const targetId of neighbors) {
          if (!reachableIds.has(targetId)) {
            reachableIds.add(targetId);
            const targetNode = nodes.find((n) => n.id === targetId);
            if (targetNode) queue.push(targetNode);
          }
        }
      }
    }

    // 更新节点数据（仅在状态变化时）
    const needsUpdate = nodes.some((node) => {
      const isUnreachable = !reachableIds.has(node.id);
      return node.data.isUnreachable !== isUnreachable;
    });

    if (needsUpdate) {
      setNodes((nds) =>
        nds.map((node) => {
          const isUnreachable = !reachableIds.has(node.id);
          if (node.data.isUnreachable !== isUnreachable) {
            return {
              ...node,
              data: { ...node.data, isUnreachable },
            };
          }
          return node;
        }),
      );
    }
  }, [nodes, edges, setNodes]); // 监听节点和边的变化

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
        id: nanoid(),
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
    setTestDrawerOpen(false);
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
        id: nanoid(),
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
        setTestDrawerOpen(false);
        setAddPanelOpen(false);
      } else {
        // For simple types, create node directly with defaults
        handleCreateNode(type, {
          label: theme.defaultLabel,
        });
        setTestDrawerOpen(false);
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

  const [lastTestInput, setLastTestInput] = useState<string>("");

  const executeWorkflowTest = useCallback(
    async (input: string) => {
      if (isExecuting) return;

      setIsExecuting(true);
      setTestDialogOpen(false);
      setLastTestInput(input);
      setSelectedNodeId(null);
      setAddPanelOpen(false);
      setTestDrawerOpen(true);
      setTestResult(null);

      try {
        toast.info("正在启动工作流测试...");
      } catch (e) {
        console.warn("Toast failed", e);
      }

      try {
        // 1. 重置所有节点状态
        // 注意：这里使用 functional update 确保状态正确，但后续执行仍需使用当前的 nodes 快照
        setNodes((nds) =>
          nds.map((node) => ({
            ...node,
            data: {
              ...node.data,
              status: "idle",
              output: undefined,
              error: undefined,
            },
          })),
        );

        // 2. 执行工作流
        // 使用 API Route 提供的流式输出
        const response = await fetch("/api/workflow/test/run", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            employeeId: currentEmployeeId,
            definition: {
              nodes: JSON.parse(JSON.stringify(nodes)) as any as WorkflowNode[],
              edges: JSON.parse(JSON.stringify(edges)) as any as WorkflowEdge[],
            },
            input,
          }),
        });

        if (!response.ok) {
          throw new Error("执行请求失败");
        }

        const reader = response.body?.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        if (!reader) {
          throw new Error("无法读取响应流");
        }

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() || "";

          for (const line of lines) {
            if (!line.trim()) continue;
            try {
              const chunk = JSON.parse(line);

              if (chunk.type === "update") {
                // 实时更新单个节点状态
                setNodes((nds) =>
                  nds.map((node) => {
                    if (node.id === chunk.nodeId) {
                      return {
                        ...node,
                        data: {
                          ...node.data,
                          status:
                            chunk.status === "completed"
                              ? "success"
                              : chunk.status === "failed"
                                ? "error"
                                : chunk.status === "skipped"
                                  ? "idle"
                                  : "running",
                          output: chunk.output,
                          error: chunk.error,
                        },
                      };
                    }
                    return node;
                  }),
                );
              } else if (chunk.type === "final") {
                const result = chunk.result;
                setTestResult(result);
                if (result.success) {
                  toast.success("工作流预览运行成功");
                } else {
                  toast.error(`工作流运行失败: ${result.error || "未知原因"}`);
                }
              } else if (chunk.type === "error") {
                throw new Error(chunk.error);
              }
            } catch (e) {
              console.warn("Parse stream chunk error", e);
            }
          }
        }
      } catch (error: any) {
        console.error("Workflow canvas execution error:", error);
        toast.error(`执行出错: ${error.message || "未知错误"}`);
        setTestResult({
          success: false,
          finalOutput: "",
          nodeResults: [],
          totalDuration: 0,
          error: error.message || "未知错误",
        });
      } finally {
        setIsExecuting(false);
      }
    },
    [nodes, edges, currentEmployeeId, isExecuting, setNodes],
  );

  const handleTestClick = () => {
    setTestDialogOpen(true);
  };

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
            onClick={handleTestClick}
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
              setTestDrawerOpen(false);
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
          nodes={nodes}
          edges={edges}
          onUpdate={handleUpdateNode}
          onDelete={handleDeleteNode}
          onClose={() => setSelectedNodeId(null)}
          allEmployees={allEmployees}
          lastTestInput={lastTestInput}
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

      <TestRunDialog
        open={testDialogOpen}
        onOpenChange={setTestDialogOpen}
        nodes={nodes as any as WorkflowNode[]}
        onRun={executeWorkflowTest}
      />

      <TestRunDrawer
        isOpen={testDrawerOpen}
        onClose={() => setTestDrawerOpen(false)}
        result={testResult}
        isRunning={isExecuting}
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
