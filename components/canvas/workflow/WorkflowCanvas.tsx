"use client";

import React, { useCallback, useState, useEffect, useRef } from "react";
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
  Edge,
  NodeChange,
  EdgeChange,
} from "@xyflow/react";
import {
  Grid3X3,
  Lock,
  Unlock,
  Map as MapIcon,
  RotateCcw,
  RotateCw,
} from "lucide-react";
import { nanoid } from "nanoid";
import { cn } from "@/lib/utils";
import "@xyflow/react/dist/style.css";

import { NodeDetailsPanel } from "./NodeDetailsPanel";
import { AddNodePanel } from "./AddNodePanel";
import { WorkflowNodeTypes } from "./WorkflowNodeTypes";
import { NODE_THEMES, type NodeTheme } from "./nodeTypeConfig";
import { Button } from "@/components/ui/button";
import { Play, Loader2, Save, Plus, Terminal } from "lucide-react";
import { toast } from "sonner";
import {
  WorkflowDefinition,
  WorkflowNode,
  WorkflowEdge,
  WorkflowExecutionResult,
  NodeExecutionResult,
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

const getEdgeColor = (
  sourceNode: any,
  targetNode: any,
  sourceHandle?: string | null,
) => {
  if (!sourceNode) return "#94a3b8";

  // 1. Condition Node
  if (sourceNode.type === "condition") {
    if (sourceHandle === "true") return EDGE_COLORS.emerald;
    if (sourceHandle === "false") return EDGE_COLORS.rose;
  }

  // 2. Question Classifier Node
  if (sourceNode.type === "question_classifier") {
    const categories = (sourceNode.data.categories as any[]) || [];
    const idx = categories.findIndex((c: any) => c.key === sourceHandle);
    if (idx !== -1) {
      const colorKeys = [
        "blue",
        "violet",
        "emerald",
        "amber",
        "rose",
        "cyan",
        "indigo",
        "teal",
      ];
      const key = colorKeys[idx % colorKeys.length];
      return EDGE_COLORS[key] || EDGE_COLORS.blue;
    }
  }

  // 3. Default: Target Node Color
  return getNodeColor(targetNode?.type);
};

interface WorkflowCanvasProps {
  initialWorkflow?: WorkflowDefinition;
  onSave: (workflow: WorkflowDefinition) => void;
  allEmployees: { id: string; name: string; role: string }[];
  currentEmployeeId: string;
}

interface HistoryItem {
  nodes: Node[];
  edges: Edge[];
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
      const sourceNode = initialWorkflow.nodes.find((n) => n.id === e.source);
      const targetNode = initialWorkflow.nodes.find((n) => n.id === e.target);
      return {
        ...e,
        animated: true,
        style: {
          ...(e as any).style,
          stroke: getEdgeColor(sourceNode, targetNode, e.sourceHandle),
        },
      };
    }) || []) as any[],
  );

  // History State
  const [history, setHistory] = useState<{
    past: HistoryItem[];
    future: HistoryItem[];
  }>({
    past: [],
    future: [],
  });

  // Refs for current nodes/edges to access in callbacks without dependencies
  const nodesRef = useRef(nodes);
  const edgesRef = useRef(edges);

  useEffect(() => {
    nodesRef.current = nodes;
  }, [nodes]);

  useEffect(() => {
    edgesRef.current = edges;
  }, [edges]);

  // Clear history when switching employees
  useEffect(() => {
    setHistory({ past: [], future: [] });
  }, [currentEmployeeId]);

  const recordHistory = useCallback(() => {
    setHistory((prev) => {
      const newPast = [
        ...prev.past,
        {
          nodes: JSON.parse(JSON.stringify(nodesRef.current)),
          edges: JSON.parse(JSON.stringify(edgesRef.current)),
        },
      ];
      // Limit history size to 50
      if (newPast.length > 50) {
        newPast.shift();
      }
      return {
        past: newPast,
        future: [],
      };
    });
  }, []);

  const undo = useCallback(() => {
    if (history.past.length === 0) return;

    const previousState = history.past[history.past.length - 1];
    const newPast = history.past.slice(0, -1);

    const current = {
      nodes: JSON.parse(JSON.stringify(nodesRef.current)),
      edges: JSON.parse(JSON.stringify(edgesRef.current)),
    };

    setHistory({
      past: newPast,
      future: [current, ...history.future],
    });

    setNodes(previousState.nodes);
    setEdges(previousState.edges);
    onSave({
      nodes: previousState.nodes as any as WorkflowNode[],
      edges: previousState.edges as any as WorkflowEdge[],
    });
  }, [history, setNodes, setEdges, onSave]);

  const redo = useCallback(() => {
    if (history.future.length === 0) return;

    const nextState = history.future[0];
    const newFuture = history.future.slice(1);

    const current = {
      nodes: JSON.parse(JSON.stringify(nodesRef.current)),
      edges: JSON.parse(JSON.stringify(edgesRef.current)),
    };

    setHistory({
      past: [...history.past, current],
      future: newFuture,
    });

    setNodes(nextState.nodes);
    setEdges(nextState.edges);
    onSave({
      nodes: nextState.nodes as any as WorkflowNode[],
      edges: nextState.edges as any as WorkflowEdge[],
    });
  }, [history, setNodes, setEdges, onSave]);

  // Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Ignore if input/textarea is focused
      if (
        event.target instanceof HTMLInputElement ||
        event.target instanceof HTMLTextAreaElement ||
        (event.target as HTMLElement).isContentEditable
      ) {
        return;
      }

      if (event.ctrlKey || event.metaKey) {
        if (event.key === "z") {
          event.preventDefault();
          if (event.shiftKey) {
            redo();
          } else {
            undo();
          }
        } else if (event.key === "y") {
          event.preventDefault();
          redo();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [undo, redo]);

  const [addPanelOpen, setAddPanelOpen] = useState(false);
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

      recordHistory();

      const position = screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });

      const theme = NODE_THEMES[type] || NODE_THEMES.process;

      const newNode: Node = {
        id: nanoid(6),
        type,
        position,
        data: {
          label: theme.defaultLabel,
          status: "idle",
          ...(theme.defaultData || {}),
        },
      };

      const newNodes = nodes.concat(newNode);
      setNodes(newNodes);
      onSave({ nodes: newNodes, edges });
    },
    [nodes, edges, screenToFlowPosition, onSave, setNodes, recordHistory],
  );

  const onConnect = useCallback(
    (params: Connection) => {
      recordHistory();
      const sourceNode = getNode(params.source);
      const targetNode = getNode(params.target);
      const color = getEdgeColor(sourceNode, targetNode, params.sourceHandle);

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
    [setEdges, getNode, edges, nodes, onSave, recordHistory],
  );

  const onNodeClick = useCallback((_: React.MouseEvent, node: Node) => {
    setSelectedNodeId(node.id);
    // setTestDrawerOpen(false); // 保持测试抽屉开启，方便查看
    setAddPanelOpen(false);
  }, []);

  const onPaneClick = useCallback(() => {
    setSelectedNodeId(null);
  }, []);

  const handleUpdateNode = useCallback(
    (id: string, data: any) => {
      recordHistory();
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
    [nodes, edges, setNodes, onSave, recordHistory],
  );

  const handleDeleteNode = useCallback(
    (id: string) => {
      recordHistory();
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
    [nodes, edges, setNodes, setEdges, onSave, recordHistory],
  );

  const handleCreateNode = useCallback(
    (type: string, data: any) => {
      recordHistory();
      const theme = NODE_THEMES[type] || NODE_THEMES.process;
      const newNode: Node = {
        id: nanoid(6),
        type,
        position: {
          x: Math.random() * 500 + 150,
          y: Math.random() * 500 + 150,
        },
        data: { label: data.label, ...(theme.defaultData || {}), ...data },
      };
      const newNodes = nodes.concat(newNode);
      setNodes(newNodes);
      onSave({ nodes: newNodes, edges });
    },
    [nodes, edges, setNodes, onSave, recordHistory],
  );

  const handleSelectNodeType = useCallback(
    (type: string, theme: NodeTheme) => {
      // Create node directly with defaults
      handleCreateNode(type, {
        label: theme.defaultLabel,
      });
      setTestDrawerOpen(false);
      setAddPanelOpen(false);
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
      setTestResult({
        success: false,
        finalOutput: null,
        nodeResults: [],
        totalDuration: 0,
      });

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

                // 同时也更新 TestDrawer 的 result，以便实时显示列表
                setTestResult((prev) => {
                  const currentResults = prev ? [...prev.nodeResults] : [];
                  const existingIndex = currentResults.findIndex(
                    (r) => r.nodeId === chunk.nodeId,
                  );
                  const nodeDef = nodes.find((n) => n.id === chunk.nodeId);

                  // 映射状态
                  let statusStr = "running";
                  if (chunk.status === "completed") statusStr = "completed";
                  else if (chunk.status === "failed") statusStr = "failed";
                  else if (chunk.status === "skipped") statusStr = "skipped";

                  const newItem: NodeExecutionResult = {
                    nodeId: chunk.nodeId,
                    nodeType: (nodeDef?.type as any) || "process",
                    nodeLabel: nodeDef?.data?.label || "未知节点",
                    status: statusStr as any,
                    output: chunk.output,
                    error: chunk.error,
                    startTime: Date.now(),
                    // 注意：流式 update 中没有 duration，暂时不填或计算差值
                  };

                  if (existingIndex >= 0) {
                    currentResults[existingIndex] = {
                      ...currentResults[existingIndex],
                      ...newItem,
                      startTime: currentResults[existingIndex].startTime, // 保留原始开始时间
                    };
                  } else {
                    currentResults.push(newItem);
                  }

                  return {
                    success: false, // 运行中暂时为 false
                    finalOutput: null,
                    nodeResults: currentResults,
                    totalDuration: 0,
                  };
                });
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

  // Trigger history recording when nodes are dragged
  const onNodeDragStart = useCallback(() => {
    recordHistory();
  }, [recordHistory]);

  const onNodesChangeWithHistory = useCallback(
    (changes: NodeChange[]) => {
      const isRemoval = changes.some((c) => c.type === "remove");
      if (isRemoval) {
        recordHistory();
      }
      onNodesChange(changes);
    },
    [onNodesChange, recordHistory],
  );

  const onEdgesChangeWithHistory = useCallback(
    (changes: EdgeChange[]) => {
      const isRemoval = changes.some((c) => c.type === "remove");
      if (isRemoval) {
        recordHistory();
      }
      onEdgesChange(changes);
    },
    [onEdgesChange, recordHistory],
  );

  return (
    <div className='h-full w-full relative bg-slate-50 dark:bg-slate-950/50'>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChangeWithHistory}
        onEdgesChange={onEdgesChangeWithHistory}
        onConnect={onConnect}
        onNodeClick={onNodeClick}
        onPaneClick={onPaneClick}
        onDrop={onDrop}
        onDragOver={onDragOver}
        onNodeDragStart={onNodeDragStart}
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
            pannable
            zoomable
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
            onClick={undo}
            disabled={history.past.length === 0}
            title='撤销 (Ctrl+Z)'
          >
            <RotateCcw className='w-3.5 h-3.5 text-slate-500' />
          </Button>
          <Button
            variant='ghost'
            size='icon'
            className='w-7 h-7'
            onClick={redo}
            disabled={history.future.length === 0}
            title='重做 (Ctrl+Shift+Z)'
          >
            <RotateCw className='w-3.5 h-3.5 text-slate-500' />
          </Button>
          <div className='w-px h-4 bg-slate-200 dark:bg-slate-700 mx-0.5 my-auto' />
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
          {!testDrawerOpen && testResult && !isExecuting && (
            <Button
              onClick={() => setTestDrawerOpen(true)}
              variant='secondary'
              size='sm'
              className='shadow-lg'
              title='查看上次运行结果'
            >
              <Terminal className='w-4 h-4 mr-2' />
              运行结果
            </Button>
          )}
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

      <TestRunDrawer
        isOpen={testDrawerOpen}
        onClose={() => setTestDrawerOpen(false)}
        result={testResult}
        isRunning={isExecuting}
      />

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

      <TestRunDialog
        open={testDialogOpen}
        onOpenChange={setTestDialogOpen}
        nodes={nodes as any as WorkflowNode[]}
        onRun={executeWorkflowTest}
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
