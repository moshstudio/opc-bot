import React, {
  memo,
  useCallback,
  useEffect,
  useRef,
  useMemo,
  useContext,
} from "react";
import { useWorkflowSync } from "@/hooks/use-workflow-save";
import {
  Handle,
  Position,
  NodeProps,
  ReactFlow,
  ReactFlowProvider,
  Background,
  Controls,
  useNodesState,
  useEdgesState,
  addEdge,
  Connection,
  Node,
  useReactFlow,
  NodeToolbar,
  NodeResizer,
  useUpdateNodeInternals,
  useStore,
} from "@xyflow/react";
import { nanoid } from "nanoid";
import { BaseNodeTypes } from "./BaseNode";
import {
  NODE_THEMES,
  getVisibleNodesByTab,
  type NodeTheme,
} from "./nodeTypeConfig";
import { cn } from "@/lib/utils";
import { RefreshCw, Copy, Trash2, Info, MoreHorizontal } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
  DropdownMenuPortal,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import CustomEdge from "./CustomEdge";
import { SubNodeContext } from "./SubNodeContext";

const edgeTypes = {
  workflow: CustomEdge,
};

// Local node types for the sub-canvas to break circular dependency
const subNodeTypes: Record<string, React.ComponentType<any>> = {
  ...BaseNodeTypes,
};

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

  const theme =
    NODE_THEMES[targetNode?.type || "process"] || NODE_THEMES.process;
  return EDGE_COLORS[theme.color] || "#94a3b8";
};

const InnerLoopNode = memo(
  ({
    id,
    initialSubNodes,
    initialSubEdges,
    onUpdateOuterData,
    onInteractionStart,
    outerZoom = 1,
  }: any) => {
    const { screenToFlowPosition } = useReactFlow();
    const wrapperRef = useRef<HTMLDivElement>(null);
    const updateNodeInternals = useUpdateNodeInternals();

    const [nodes, setNodes, onNodesChange] = useNodesState(
      initialSubNodes && initialSubNodes.length > 0
        ? initialSubNodes
        : [
            {
              id: "start",
              type: "start",
              position: { x: 50, y: 150 },
              data: { label: "循环索引 (index)", status: "idle" },
              deletable: false,
            },
          ],
    );
    const [edges, setEdges, onEdgesChange] = useEdgesState(
      (initialSubEdges || []).map((e: any) => ({ ...e, type: "workflow" })),
    );

    console.log(`[LoopNode:${id}] InnerLoopNode received:`, {
      initialSubNodes,
      initialSubEdges,
    });

    const context = useContext(SubNodeContext);

    // Force re-measurement of all nodes when the sub-canvas is scaled or resized
    // This fixes Handle position calculation in nested flows
    useEffect(() => {
      const nodeIds = nodes.map((n) => n.id);
      nodeIds.forEach((id) => updateNodeInternals(id));

      const observer = new ResizeObserver(() => {
        nodeIds.forEach((id) => updateNodeInternals(id));
      });

      if (wrapperRef.current) {
        observer.observe(wrapperRef.current);
      }
      return () => observer.disconnect();
    }, [nodes, outerZoom, updateNodeInternals]);

    // Pull changes from parent (Undo/Redo support or updates from parent)
    useEffect(() => {
      if (initialSubNodes) {
        setNodes((currNodes) => {
          const targetNodes =
            initialSubNodes.length > 0
              ? initialSubNodes
              : [
                  {
                    id: "start",
                    type: "start",
                    position: { x: 50, y: 150 },
                    data: { label: "循环索引 (index)", status: "idle" },
                    deletable: false,
                  },
                ];
          // Compare current state with incoming parent data
          if (JSON.stringify(currNodes) !== JSON.stringify(targetNodes)) {
            return targetNodes;
          }
          return currNodes;
        });
      }
    }, [initialSubNodes, setNodes]);

    useEffect(() => {
      if (initialSubEdges) {
        setEdges((currEdges) => {
          const mappedEdges = initialSubEdges.map((e: any) => ({
            ...e,
            type: "workflow",
          }));
          if (JSON.stringify(currEdges) !== JSON.stringify(mappedEdges)) {
            return mappedEdges;
          }
          return currEdges;
        });
      }
    }, [initialSubEdges, setEdges]);

    // Clear selection when signaled by main canvas
    useEffect(() => {
      if (context?.deselectTrigger) {
        setNodes((nds) =>
          nds.map((n) => (n.selected ? { ...n, selected: false } : n)),
        );
        setEdges((eds) =>
          eds.map((e) => (e.selected ? { ...e, selected: false } : e)),
        );
      }
    }, [context?.deselectTrigger, setNodes, setEdges]);

    // 监听结构性变化，更新子节点“不可达”状态
    // 通过 memoize 节点 ID 和类型的组合字符串来避免在子节点拖放位置时触发更新
    const nodeIdsAndTypes = nodes.map((n) => `${n.id}:${n.type}`).join(",");
    const graphStructureKey = useMemo(() => {
      const edgesKey = edges
        .map((e) => `${e.source}-${e.target}-${e.sourceHandle || ""}`)
        .join(",");
      return `${nodeIdsAndTypes}|${edgesKey}`;
    }, [nodeIdsAndTypes, edges]);

    useEffect(() => {
      // 在子画布中，我们将没有入边的节点标记为潜在起点（或者包含特定触发类型的节点）
      const hasIncomingEdge = new Set<string>();
      edges.forEach((e) => hasIncomingEdge.add(e.target));

      const startNodes = nodes.filter((n) => !hasIncomingEdge.has(n.id));

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

      // 更新节点不可达状态
      setNodes((nds) => {
        let changed = false;
        const newNodes = nds.map((node) => {
          const isUnreachable =
            reachableIds.size > 0 && !reachableIds.has(node.id);
          if (node.data.isUnreachable !== isUnreachable) {
            changed = true;
            return {
              ...node,
              data: { ...node.data, isUnreachable },
            };
          }
          return node;
        });
        return changed ? newNodes : nds;
      });
    }, [graphStructureKey, nodes, edges, setNodes]);

    useWorkflowSync({
      id,
      nodes,
      edges,
      onSync: (nds, eds) => {
        onUpdateOuterData(nds, eds);
        if (context?.onUpdateSubFlow) {
          context.onUpdateSubFlow(id, nds, eds);
        }
      },
      debounceMs: 500,
    });

    const onConnect = useCallback(
      (params: Connection) => {
        const sourceNode = nodes.find((n) => n.id === params.source);
        const targetNode = nodes.find((n) => n.id === params.target);
        const color = getEdgeColor(sourceNode, targetNode, params.sourceHandle);

        setEdges((eds: any) =>
          addEdge(
            {
              ...params,
              animated: true,
              type: "workflow",
              style: { stroke: color, strokeWidth: 1.5 },
            } as any,
            eds,
          ),
        );
      },
      [nodes, setEdges],
    );

    const onInit = useCallback((instance: any) => {
      // Force a fitView after a short delay to ensure container size is settled
      setTimeout(() => {
        instance.fitView({ padding: 0.5, maxZoom: 0.7 });
      }, 50);
    }, []);

    const onDragOver = useCallback((event: React.DragEvent) => {
      event.preventDefault();
      event.stopPropagation();
      event.dataTransfer.dropEffect = "move";
    }, []);

    const onDrop = useCallback(
      (event: React.DragEvent) => {
        event.preventDefault();
        event.stopPropagation();
        onInteractionStart?.();

        const type = event.dataTransfer.getData("application/reactflow");
        if (!type) return;

        // When dragging into a nested canvas, we must adjust for the inner zoom factor
        const position = screenToFlowPosition({
          x: event.clientX,
          y: event.clientY,
        });

        const theme = NODE_THEMES[type] || NODE_THEMES.process;

        const newNode: Node = {
          id: nanoid(6),
          type,
          position,
          style: theme.defaultStyle,
          data: {
            label: theme.defaultLabel,
            status: "idle",
            ...(theme.defaultData || {}),
          },
        };

        setNodes((nds: any) => nds.concat(newNode));
      },
      [setNodes, screenToFlowPosition, onInteractionStart],
    );

    const stopEvent = useCallback((e: React.SyntheticEvent | Event) => {
      e.stopPropagation();
    }, []);

    const handleInteraction = useCallback(
      (...args: any[]) => {
        // Stop bubbling so outer React Flow doesn't try to drag or select the LoopNode
        // but allow React Flow internal logic to run
        onInteractionStart?.();
        const e = args[0];
        if (e && typeof e.stopPropagation === "function") {
          e.stopPropagation();
        }

        // Handle sub-node/edge selection for the details panel
        if (context) {
          const type = args.length > 1 && args[1]?.id ? "node" : "other";
          if (type === "node") {
            context.onSelectSubNode(args[1], id, nodes, edges);
          }
        }
      },
      [onInteractionStart, context, id, nodes, edges],
    );

    return (
      <div
        ref={wrapperRef}
        className='w-full h-full relative'
        style={{
          transform: `scale(${1 / outerZoom})`,
          transformOrigin: "0 0",
          width: `${100 * outerZoom}%`,
          height: `${100 * outerZoom}%`,
        }}
        onKeyDown={stopEvent}
        onKeyUp={stopEvent}
        onPointerDown={handleInteraction}
        onMouseDown={handleInteraction}
      >
        <ReactFlow
          id={`loop-subflow-${id}`}
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onDrop={onDrop}
          onDragOver={onDragOver}
          onInit={onInit}
          onNodeClick={handleInteraction}
          onEdgeClick={handleInteraction}
          onPaneClick={handleInteraction}
          onSelectionDragStart={handleInteraction}
          onMoveStart={handleInteraction}
          onKeyDown={stopEvent}
          nodeTypes={subNodeTypes}
          edgeTypes={edgeTypes}
          className='w-full h-full bg-slate-50 dark:bg-slate-950/20 nodrag nopan nowheel'
          fitView
          fitViewOptions={{ padding: 0.3, maxZoom: 0.7 }}
          minZoom={0.2}
          maxZoom={1.5}
          proOptions={{ hideAttribution: true }}
          noDragClassName='inner-nodrag'
          noPanClassName='inner-nopan'
          noWheelClassName='inner-nowheel'
          defaultEdgeOptions={{
            animated: true,
            type: "workflow",
            style: { strokeWidth: 1.5, stroke: "#94a3b8" },
          }}
          connectionLineStyle={{ stroke: "#06b6d4", strokeWidth: 2 }}
        >
          <Background
            gap={16}
            size={1}
            className='opacity-20'
          />
          <Controls
            showInteractive={false}
            className='z-50'
            position='bottom-right'
          />
        </ReactFlow>
      </div>
    );
  },
);
InnerLoopNode.displayName = "InnerLoopNode";

const LoopNodeBase = ({ id, data, selected }: NodeProps) => {
  const {
    deleteElements,
    getNode,
    addNodes,
    setNodes: setOuterNodes,
  } = useReactFlow();
  const updateNodeInternals = useUpdateNodeInternals();

  console.log(`[LoopNode:${id}] Base data:`, data);

  // Detect if a connection is starting on the main canvas
  const isOuterConnecting = useStore((s: any) => !!s.connectionStartHandle);
  const outerZoom = useStore((s: any) => s.transform[2]);

  const handleUpdateOuterData = useCallback(
    (nodes: any, edges: any) => {
      setOuterNodes((nds) =>
        nds.map((n) =>
          n.id === id
            ? { ...n, data: { ...n.data, subNodes: nodes, subEdges: edges } }
            : n,
        ),
      );
    },
    [id, setOuterNodes],
  );

  const handleInteractionStart = useCallback(() => {
    setOuterNodes((nds) => {
      const node = nds.find((n) => n.id === id);
      if (node?.selected) {
        return nds.map((n) => (n.id === id ? { ...n, selected: false } : n));
      }
      return nds;
    });
  }, [id, setOuterNodes]);

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    const node = getNode(id);
    if (node) {
      const newNode = {
        ...node,
        id: nanoid(6),
        position: { x: node.position.x + 40, y: node.position.y + 40 },
        selected: false,
      };
      addNodes(newNode);
    }
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    deleteElements({ nodes: [{ id }] });
  };

  const handleChangeType = (newType: string) => {
    setOuterNodes((nodes) =>
      nodes.map((node) => {
        if (node.id === id) {
          const newTheme = NODE_THEMES[newType];
          return {
            ...node,
            type: newType,
            style: newTheme.defaultStyle,
            data: {
              ...node.data,
              ...(newTheme.defaultData || {}),
            },
          };
        }
        return node;
      }),
    );
    setTimeout(() => updateNodeInternals(id), 50);
  };

  const availableTypes = useMemo(() => {
    const types: Record<string, [string, NodeTheme][]> = {};
    types["基础节点"] = getVisibleNodesByTab("node");
    types["工具"] = getVisibleNodesByTab("tool");
    return types;
  }, []);

  return (
    <div
      className={cn(
        "relative flex flex-col rounded-xl border bg-white dark:bg-slate-900 shadow-sm transition-[box-shadow,ring,border-color] duration-200 group/node",
        selected
          ? "ring-2 ring-offset-1 border-cyan-400"
          : "hover:shadow-md border-cyan-200/60 dark:border-cyan-800/40",
      )}
      style={{
        zIndex: selected ? 100 : 0,
        minWidth: 300,
        minHeight: 225,
        width: "100%",
        height: "100%",
      }}
    >
      <Handle
        type='target'
        position={Position.Left}
        className='w-3 h-3 border-2 border-white dark:border-slate-900 bg-cyan-500 shadow-sm !z-50'
        style={{ left: -6, top: "50%" }}
      />
      <Handle
        type='source'
        position={Position.Right}
        className='w-3 h-3 border-2 border-white dark:border-slate-900 bg-cyan-500 shadow-sm !z-50'
        style={{ right: -6, top: "50%" }}
      />

      <NodeResizer
        color='#06b6d4'
        isVisible={selected}
        minWidth={300}
        minHeight={225}
      />

      <NodeToolbar
        isVisible={selected}
        position={Position.Top}
        className='flex items-center gap-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-1 rounded-lg shadow-xl'
      >
        <Button
          variant='ghost'
          size='icon'
          className='w-7 h-7 hover:bg-slate-100 dark:hover:bg-slate-800'
          onClick={handleCopy}
          title='复制节点'
        >
          <Copy className='w-3.5 h-3.5 text-slate-500' />
        </Button>
        <Button
          variant='ghost'
          size='icon'
          className='w-7 h-7 hover:bg-rose-50 dark:hover:bg-rose-900/20 group/del'
          onClick={handleDelete}
          title='删除节点'
        >
          <Trash2 className='w-3.5 h-3.5 text-slate-500 group-hover/del:text-rose-500' />
        </Button>
        <div className='w-px h-4 bg-slate-200 dark:bg-slate-800 mx-0.5' />
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant='ghost'
              size='icon'
              className='w-7 h-7 hover:bg-slate-100 dark:hover:bg-slate-800'
              title='更多操作'
            >
              <MoreHorizontal className='w-3.5 h-3.5 text-slate-500' />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align='start'
            className='w-48'
          >
            <DropdownMenuItem className='flex items-center gap-2'>
              <Info className='w-4 h-4 text-slate-500' />
              <span>节点信息</span>
            </DropdownMenuItem>

            <DropdownMenuSeparator />

            <DropdownMenuSub>
              <DropdownMenuSubTrigger className='flex items-center gap-2'>
                <RefreshCw className='w-4 h-4 text-slate-500' />
                <span>更改节点</span>
              </DropdownMenuSubTrigger>
              <DropdownMenuPortal>
                <DropdownMenuSubContent className='w-56 max-h-[400px] overflow-y-auto'>
                  {Object.entries(availableTypes).map(([group, types]) => (
                    <div key={group}>
                      <DropdownMenuLabel className='text-[10px] text-slate-500 uppercase tracking-wider px-2 py-1'>
                        {group}
                      </DropdownMenuLabel>
                      {types.map(([key, theme]: [string, NodeTheme]) => {
                        const TypeIcon = theme.icon;
                        return (
                          <DropdownMenuItem
                            key={key}
                            className='flex items-center gap-2'
                            onClick={() => handleChangeType(key)}
                            disabled={key === "loop"}
                          >
                            <TypeIcon className='w-4 h-4' />
                            <div className='flex flex-col'>
                              <span className='text-sm leading-none'>
                                {theme.typeLabel}
                              </span>
                              {theme.menuDesc && (
                                <span className='text-[10px] text-slate-500 mt-1 whitespace-normal text-wrap'>
                                  {theme.menuDesc}
                                </span>
                              )}
                            </div>
                          </DropdownMenuItem>
                        );
                      })}
                      <DropdownMenuSeparator className='last:hidden' />
                    </div>
                  ))}
                </DropdownMenuSubContent>
              </DropdownMenuPortal>
            </DropdownMenuSub>
          </DropdownMenuContent>
        </DropdownMenu>
      </NodeToolbar>

      {/* Header occupies fixed height */}
      <div className='flex-none flex items-center justify-between px-3 py-2 border-b text-xs font-medium text-white rounded-t-xl bg-gradient-to-r from-cyan-400 to-teal-400'>
        <div className='flex items-center gap-2'>
          <RefreshCw className='w-3.5 h-3.5' />
          <span>循环 (子画布)</span>
        </div>
      </div>

      {/* Embedded ReactFlow takes absolute remaining area */}
      <div
        className={cn(
          "flex-1 w-full relative h-[calc(100%-36px)]",
          isOuterConnecting && "pointer-events-none",
        )}
      >
        <ReactFlowProvider>
          <InnerLoopNode
            id={id}
            initialSubNodes={data.subNodes || []}
            initialSubEdges={data.subEdges || []}
            onUpdateOuterData={handleUpdateOuterData}
            onInteractionStart={handleInteractionStart}
            outerZoom={outerZoom}
          />
        </ReactFlowProvider>
      </div>
    </div>
  );
};

export const LoopNode = memo(LoopNodeBase);

// Handle recursion for nested iteration/loop nodes
(subNodeTypes as any).iteration = (BaseNodeTypes as any).iteration;
(subNodeTypes as any).loop = LoopNode;
