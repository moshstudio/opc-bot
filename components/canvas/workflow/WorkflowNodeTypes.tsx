import React, { memo, useState, useMemo, useEffect } from "react";
import { nanoid } from "nanoid";
import {
  Handle,
  Position,
  NodeProps,
  Node,
  NodeToolbar,
  useReactFlow,
  useUpdateNodeInternals,
} from "@xyflow/react";
import {
  NODE_THEMES,
  getColorClasses,
  MODEL_PROVIDER_ICONS,
} from "./nodeTypeConfig";
import { getReadableDescription } from "@/lib/workflow/cron-utils";
import { cn } from "@/lib/utils";
import {
  Copy,
  Trash2,
  Info,
  Loader2,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useModelContext } from "@/components/ModelContext";

interface WorkflowNodeData extends Record<string, unknown> {
  label?: string;
  desc?: string;
  employeeName?: string;
  isUnreachable?: boolean;
  status?: "idle" | "running" | "success" | "error";
  error?: string;
  modelProvider?: string;
  cron?: string;
  frequency?: any;
  model?: string;
  codeLanguage?: string;
  method?: string;
  url?: string;
  variable?: string;
  toolName?: string;
  subject?: string;
  categories?: any[];
}

type WorkflowNode = Node<WorkflowNodeData>;

const BaseNode = ({ data, type, selected, id }: NodeProps<WorkflowNode>) => {
  const theme = NODE_THEMES[type || "process"] || NODE_THEMES.process;
  const colors = getColorClasses(theme.color);
  const Icon = theme.icon;
  const [isHovered, setIsHovered] = useState(false);
  const { deleteElements, getNode, addNodes } = useReactFlow();
  const updateNodeInternals = useUpdateNodeInternals();

  useEffect(() => {
    if (type === "question_classifier") {
      // 立即更新
      updateNodeInternals(id);
      // 稍微延迟再次更新，确保渲染完全稳定
      const timer = setTimeout(() => updateNodeInternals(id), 50);
      return () => clearTimeout(timer);
    }
  }, [type, id, data.categories, updateNodeInternals]);

  // Get models from context to resolve IDs
  const { models } = useModelContext();

  // Resolve model name if it's an ID
  const displayModelName = useMemo(() => {
    if (type === "llm" && data.model) {
      const found = models.find((m) => m.id === data.model);
      return found ? found.name : data.model;
    }
    return data.model;
  }, [models, type, data.model]);

  // ... rest of the component

  // 判断是否为起始类型节点（无需 target handle）
  const isStartType = theme.tab === "start";
  // 判断是否为输出节点（无需 source handle）
  const isOutputType = type === "output";

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

  return (
    <div
      className='relative group/node'
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Node Toolbar */}
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
        <Button
          variant='ghost'
          size='icon'
          className='w-7 h-7 hover:bg-slate-100 dark:hover:bg-slate-800'
          title='节点信息'
        >
          <Info className='w-3.5 h-3.5 text-slate-500' />
        </Button>
      </NodeToolbar>

      <div
        className={cn(
          "rounded-xl border bg-white dark:bg-slate-900 shadow-sm min-w-[200px] transition-all duration-200",
          selected
            ? `ring-2 ring-offset-1 ${colors.borderSelected}`
            : "hover:shadow-md",
          colors.border,
          data.isUnreachable && "opacity-60 grayscale-[0.2] border-dashed",
        )}
      >
        {/* 顶部标题栏 */}
        <div
          className={cn(
            "flex items-center justify-between px-3 py-2 border-b text-xs font-medium text-white rounded-t-xl",
            colors.topBar,
          )}
        >
          <div className='flex items-center gap-2'>
            <Icon className='w-3.5 h-3.5' />
            <span>{theme.typeLabel}</span>
          </div>

          {/* Status Indicators */}
          {(data.status && data.status !== "idle") || data.isUnreachable ? (
            <div className='flex items-center gap-1.5'>
              {data.isUnreachable && (
                <div
                  className='flex items-center gap-1 bg-amber-500/20 px-1.5 rounded text-[10px] text-white/90'
                  title='该节点未连接到主流程，将不会被执行'
                >
                  <AlertCircle className='w-2.5 h-2.5' />
                  <span>不可达</span>
                </div>
              )}
              {data.status === "running" && (
                <Loader2 className='w-3 h-3 animate-spin' />
              )}
              {data.status === "success" && (
                <CheckCircle2 className='w-3 h-3' />
              )}
              {data.status === "error" && <AlertCircle className='w-3 h-3' />}
            </div>
          ) : null}
        </div>

        {/* 内容区域 */}
        <div className='p-3 space-y-2'>
          <div className='text-sm font-semibold text-slate-700 dark:text-slate-200 line-clamp-1'>
            {(data.label as string) || theme.defaultLabel}
          </div>

          {(data.desc ||
            (type === "sub_employee" && data.employeeName) ||
            (type === "cron_trigger" && data.cron)) && (
            <div className='flex flex-wrap gap-1.5'>
              {data.desc && (
                <div className='text-[10px] text-slate-500 line-clamp-2 w-full'>
                  {data.desc as string}
                </div>
              )}

              {/* 子员工特定展示 */}
              {type === "sub_employee" && data.employeeName && (
                <div className='text-[10px] bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-full px-2 py-0.5 flex items-center gap-1 border border-blue-100 dark:border-blue-800'>
                  <span className='w-1 h-1 rounded-full bg-blue-500'></span>
                  {data.employeeName as string}
                </div>
              )}

              {/* 定时触发特定展示 */}
              {theme.showSchedule && data.cron && (
                <div className='text-[10px] bg-teal-50 dark:bg-teal-950/30 text-teal-600 dark:text-teal-400 rounded-full px-2 py-0.5 flex items-center gap-1 border border-teal-100 dark:border-teal-800'>
                  <span className='w-1 h-1 rounded-full bg-teal-500'></span>
                  {getReadableDescription(data as any)}
                </div>
              )}
            </div>
          )}

          {/* 问题分类器 - 嵌入式分类列表 (Row-based Handles) */}
          {type === "question_classifier" &&
            Array.isArray(data.categories) &&
            (data.categories as any[]).length > 0 && (
              <div className='flex flex-col mt-2 -mx-3 border-y border-slate-100 dark:border-slate-800 divide-y divide-slate-100 dark:divide-slate-800'>
                {(data.categories as any[]).map((cat: any, idx: number) => {
                  const handleColors = [
                    "!bg-blue-500",
                    "!bg-violet-500",
                    "!bg-emerald-500",
                    "!bg-amber-500",
                    "!bg-rose-500",
                    "!bg-cyan-500",
                    "!bg-indigo-500",
                    "!bg-teal-500",
                  ];
                  return (
                    <div
                      key={cat.key || idx}
                      className='relative flex items-center justify-between px-3 py-2 bg-slate-50/50 dark:bg-slate-900/50 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors group'
                    >
                      <span className='text-[10px] text-slate-600 dark:text-slate-300 font-medium truncate max-w-[140px]'>
                        {cat.label || cat.key}
                      </span>

                      {/* Line connecting to handle visual only */}
                      <div className='flex-1 h-px border-t border-dashed border-slate-200 dark:border-slate-700 mx-2 opacity-0 group-hover:opacity-100 transition-opacity' />

                      {/* Embedded Handle */}
                      <Handle
                        type='source'
                        position={Position.Right}
                        id={cat.key}
                        className={cn(
                          "w-2.5 h-2.5 border-2 border-white dark:border-slate-950 shadow-sm transition-[transform,opacity] duration-200 z-50",
                          handleColors[idx % handleColors.length],
                          isHovered || selected
                            ? "opacity-100 scale-125"
                            : "opacity-80 scale-100",
                        )}
                        style={{ right: -6, top: "50%" }}
                      />
                    </div>
                  );
                })}
              </div>
            )}

          {/* Metadata Footer */}
          <div className='flex items-center justify-between gap-1.5 mt-2 pt-2 border-t border-slate-100 dark:border-slate-800/50 min-h-[20px]'>
            <div className='flex items-center gap-1.5 flex-1 min-w-0'>
              {/* Model Provider Icon */}
              {data.modelProvider &&
                MODEL_PROVIDER_ICONS[data.modelProvider] && (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img
                    src={MODEL_PROVIDER_ICONS[data.modelProvider]}
                    alt={data.modelProvider}
                    className='w-3.5 h-3.5 rounded-sm object-contain shrink-0'
                  />
                )}

              {/* Specific Node Info */}
              {type === "llm" && displayModelName && (
                <span
                  className='text-[10px] text-slate-500 font-mono truncate'
                  title={displayModelName as string}
                >
                  {displayModelName as string}
                </span>
              )}
              {type === "code" && data.codeLanguage && (
                <span className='text-[10px] text-slate-500 font-mono uppercase truncate'>
                  {data.codeLanguage as string}
                </span>
              )}
              {type === "http_request" && (
                <div className='flex items-center gap-1 overflow-hidden'>
                  {data.method && (
                    <span className='text-[9px] font-bold text-slate-600 uppercase shrink-0'>
                      {data.method as string}
                    </span>
                  )}
                  {data.url && (
                    <span
                      className='text-[9px] text-slate-400 truncate max-w-[80px]'
                      title={data.url as string}
                    >
                      {data.url as string}
                    </span>
                  )}
                </div>
              )}
              {type === "variable_assignment" && data.variable && (
                <span
                  className='text-[10px] text-slate-500 font-mono truncate'
                  title={data.variable as string}
                >
                  $ {data.variable as string}
                </span>
              )}
              {(type === "tool_node" || type === "custom_tool") &&
                data.toolName && (
                  <span
                    className='text-[10px] text-slate-500 truncate'
                    title={data.toolName as string}
                  >
                    {data.toolName as string}
                  </span>
                )}
              {type === "notification" && data.subject && (
                <span
                  className='text-[10px] text-slate-500 truncate max-w-[120px]'
                  title={data.subject as string}
                >
                  {data.subject as string}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Handles */}
        {!isStartType && (
          <Handle
            type='target'
            position={Position.Left}
            className={cn(
              "w-3 h-3 border-2 border-white dark:border-slate-900 shadow-sm transition-all duration-200 hover:scale-125",
              isHovered || selected ? "opacity-100 scale-110" : "opacity-40",
              colors.handleBg,
            )}
            style={{ left: -6, top: "50%" }}
          />
        )}

        {!isOutputType && (
          <>
            {type === "condition" ? (
              <>
                <Handle
                  type='source'
                  position={Position.Right}
                  id='true'
                  className={cn(
                    "w-3 h-3 !bg-emerald-500 border-2 border-white dark:border-slate-950 !top-[35%] shadow-sm transition-[transform,opacity] duration-200 hover:scale-125",
                    isHovered || selected
                      ? "opacity-100 scale-110"
                      : "opacity-60",
                  )}
                  style={{ right: -6 }}
                />
                <Handle
                  type='source'
                  position={Position.Right}
                  id='false'
                  className={cn(
                    "w-3 h-3 !bg-rose-500 border-2 border-white dark:border-slate-950 !top-[65%] shadow-sm transition-[transform,opacity] duration-200 hover:scale-125",
                    isHovered || selected
                      ? "opacity-100 scale-110"
                      : "opacity-60",
                  )}
                  style={{ right: -6 }}
                />
              </>
            ) : type === "question_classifier" ? null : (
              <Handle
                type='source'
                position={Position.Right}
                className={cn(
                  "w-3 h-3 border-2 border-white dark:border-slate-900 shadow-sm transition-[transform,opacity] duration-200 hover:scale-125",
                  isHovered || selected
                    ? "opacity-100 scale-110"
                    : "opacity-40",
                  colors.handleBg,
                )}
                style={{ right: -6, top: "50%" }}
              />
            )}
          </>
        )}
      </div>
    </div>
  );
};

// 为所有已注册的节点类型生成映射
const MemoizedBaseNode = memo(BaseNode);

export const WorkflowNodeTypes: Record<
  string,
  React.ComponentType<any>
> = Object.fromEntries(
  Object.keys(NODE_THEMES).map((key) => [key, MemoizedBaseNode]),
);
