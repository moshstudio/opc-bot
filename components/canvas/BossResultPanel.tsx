"use client";

import { useState } from "react";
import {
  X,
  CheckCircle2,
  XCircle,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Clock,
  Loader2,
  FastForward,
  Bot,
  GitBranch,
  Globe,
  Code2,
  FileText,
  MessageCircle,
  Users,
  Zap,
  ArrowRightFromLine,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

export interface NodeResult {
  nodeId: string;
  nodeType: string;
  nodeLabel: string;
  status: "pending" | "running" | "completed" | "failed" | "skipped";
  output?: string;
  error?: string;
  duration?: number;
}

export interface DispatchResult {
  employeeName: string;
  response: string;
  status: "success" | "error";
  /** 工作流执行详情（如果有的话） */
  nodeResults?: NodeResult[];
  totalDuration?: number;
}

interface BossResultPanelProps {
  results: DispatchResult[];
  command: string;
  onClose: () => void;
}

const nodeTypeIcons: Record<string, any> = {
  start: Zap,
  process: Bot,
  sub_employee: Users,
  output: ArrowRightFromLine,
  condition: GitBranch,
  http_request: Globe,
  code: Code2,
  text_template: FileText,
  message: MessageCircle,
};

const nodeTypeColors: Record<string, string> = {
  start: "text-emerald-500",
  process: "text-violet-500",
  sub_employee: "text-blue-500",
  output: "text-amber-500",
  condition: "text-yellow-500",
  http_request: "text-cyan-500",
  code: "text-rose-500",
  text_template: "text-indigo-500",
  message: "text-teal-500",
};

const statusIcons: Record<string, any> = {
  pending: Clock,
  running: Loader2,
  completed: CheckCircle2,
  failed: XCircle,
  skipped: FastForward,
};

const statusColors: Record<string, string> = {
  pending: "text-slate-400",
  running: "text-amber-500 animate-spin",
  completed: "text-emerald-500",
  failed: "text-red-500",
  skipped: "text-slate-300",
};

export function BossResultPanel({
  results,
  command,
  onClose,
}: BossResultPanelProps) {
  const [expandedIndex, setExpandedIndex] = useState<number | null>(
    results.length === 1 ? 0 : null,
  );
  const [expandedNodes, setExpandedNodes] = useState<Record<string, boolean>>(
    {},
  );

  if (results.length === 0) return null;

  const successCount = results.filter((r) => r.status === "success").length;
  const errorCount = results.filter((r) => r.status === "error").length;

  const toggleNodeExpand = (key: string) => {
    setExpandedNodes((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <div className='absolute top-4 right-4 bottom-20 w-[460px] z-30 animate-in slide-in-from-right-5 fade-in duration-300'>
      <div className='h-full flex flex-col bg-white/90 dark:bg-slate-950/90 backdrop-blur-xl border border-slate-200/60 dark:border-slate-800/60 shadow-2xl rounded-2xl overflow-hidden'>
        {/* Header */}
        <div className='flex items-center justify-between px-4 py-3 border-b border-slate-100 dark:border-slate-800/50 bg-gradient-to-r from-violet-50 to-indigo-50 dark:from-violet-950/30 dark:to-indigo-950/30'>
          <div className='flex items-center gap-2'>
            <div className='p-1.5 rounded-lg bg-gradient-to-br from-violet-500 to-indigo-500 shadow-sm'>
              <Sparkles className='w-3.5 h-3.5 text-white' />
            </div>
            <div>
              <h3 className='text-sm font-bold text-slate-800 dark:text-slate-200'>
                工作流执行结果
              </h3>
              <div className='flex items-center gap-2 mt-0.5'>
                {successCount > 0 && (
                  <span className='text-[10px] text-emerald-600 dark:text-emerald-400 flex items-center gap-0.5'>
                    <CheckCircle2 className='w-3 h-3' />
                    {successCount} 成功
                  </span>
                )}
                {errorCount > 0 && (
                  <span className='text-[10px] text-red-500 flex items-center gap-0.5'>
                    <XCircle className='w-3 h-3' />
                    {errorCount} 失败
                  </span>
                )}
              </div>
            </div>
          </div>
          <Button
            variant='ghost'
            size='icon'
            className='h-7 w-7 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800'
            onClick={onClose}
          >
            <X className='h-3.5 w-3.5' />
          </Button>
        </div>

        {/* Command */}
        <div className='px-4 py-2.5 border-b border-slate-100 dark:border-slate-800/50 bg-slate-50/50 dark:bg-slate-900/50'>
          <p className='text-[10px] text-slate-400 uppercase tracking-wider font-semibold mb-1'>
            指令
          </p>
          <p className='text-xs text-slate-600 dark:text-slate-300 truncate'>
            {command}
          </p>
        </div>

        {/* Results */}
        <ScrollArea className='flex-1'>
          <div className='p-3 space-y-2'>
            {results.map((result, index) => {
              const isExpanded = expandedIndex === index;
              const hasWorkflowDetails =
                result.nodeResults && result.nodeResults.length > 0;

              return (
                <div
                  key={index}
                  className={cn(
                    "rounded-xl border transition-all duration-200",
                    result.status === "success"
                      ? "border-emerald-200/60 dark:border-emerald-800/40 bg-emerald-50/40 dark:bg-emerald-950/20"
                      : "border-red-200/60 dark:border-red-800/40 bg-red-50/40 dark:bg-red-950/20",
                  )}
                >
                  {/* Result Header */}
                  <button
                    onClick={() => setExpandedIndex(isExpanded ? null : index)}
                    className='w-full flex items-center justify-between p-3 text-left'
                  >
                    <div className='flex items-center gap-2'>
                      {result.status === "success" ? (
                        <CheckCircle2 className='w-4 h-4 text-emerald-500 flex-shrink-0' />
                      ) : (
                        <XCircle className='w-4 h-4 text-red-500 flex-shrink-0' />
                      )}
                      <span className='text-sm font-medium text-slate-700 dark:text-slate-200'>
                        {result.employeeName}
                      </span>
                      {result.totalDuration && (
                        <span className='text-[10px] text-slate-400 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded-full'>
                          {(result.totalDuration / 1000).toFixed(1)}s
                        </span>
                      )}
                      {hasWorkflowDetails && (
                        <span className='text-[9px] text-violet-500 bg-violet-50 dark:bg-violet-900/20 px-1.5 py-0.5 rounded-full'>
                          工作流
                        </span>
                      )}
                    </div>
                    {isExpanded ? (
                      <ChevronUp className='w-4 h-4 text-slate-400' />
                    ) : (
                      <ChevronDown className='w-4 h-4 text-slate-400' />
                    )}
                  </button>

                  {/* Result Content */}
                  {isExpanded && (
                    <div className='px-3 pb-3 pt-0 animate-in slide-in-from-top-1 duration-200 space-y-2'>
                      {/* 工作流节点执行详情 */}
                      {hasWorkflowDetails && (
                        <div className='space-y-1'>
                          <p className='text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5'>
                            节点执行详情
                          </p>
                          {result.nodeResults!.map((nr) => {
                            const NodeIcon = nodeTypeIcons[nr.nodeType] || Bot;
                            const nodeColor =
                              nodeTypeColors[nr.nodeType] || "text-slate-500";
                            const StatusIcon = statusIcons[nr.status] || Clock;
                            const statusColor =
                              statusColors[nr.status] || "text-slate-400";
                            const nodeKey = `${index}-${nr.nodeId}`;
                            const isNodeExpanded = expandedNodes[nodeKey];

                            return (
                              <div
                                key={nr.nodeId}
                                className='rounded-lg border border-slate-200/50 dark:border-slate-800/50 bg-white/60 dark:bg-slate-900/60 overflow-hidden'
                              >
                                <button
                                  onClick={() => toggleNodeExpand(nodeKey)}
                                  className='w-full flex items-center gap-2 px-2.5 py-1.5 text-left hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors'
                                >
                                  <NodeIcon
                                    className={cn(
                                      "w-3 h-3 flex-shrink-0",
                                      nodeColor,
                                    )}
                                  />
                                  <span className='text-[11px] font-medium text-slate-700 dark:text-slate-300 truncate flex-1'>
                                    {nr.nodeLabel}
                                  </span>
                                  <StatusIcon
                                    className={cn(
                                      "w-3 h-3 flex-shrink-0",
                                      statusColor,
                                    )}
                                  />
                                  {nr.duration !== undefined && (
                                    <span className='text-[9px] text-slate-400'>
                                      {nr.duration < 1000
                                        ? `${nr.duration}ms`
                                        : `${(nr.duration / 1000).toFixed(1)}s`}
                                    </span>
                                  )}
                                </button>

                                {isNodeExpanded && nr.output && (
                                  <div className='px-2.5 pb-2 pt-0.5'>
                                    <div className='p-2 rounded-md bg-slate-50 dark:bg-slate-800/70'>
                                      <p className='text-[10px] text-slate-600 dark:text-slate-300 whitespace-pre-wrap leading-relaxed max-h-[120px] overflow-auto'>
                                        {nr.output.substring(0, 500)}
                                        {nr.output.length > 500 ? "..." : ""}
                                      </p>
                                    </div>
                                  </div>
                                )}

                                {isNodeExpanded && nr.error && (
                                  <div className='px-2.5 pb-2 pt-0.5'>
                                    <div className='p-2 rounded-md bg-red-50 dark:bg-red-900/20'>
                                      <p className='text-[10px] text-red-600 dark:text-red-400 whitespace-pre-wrap'>
                                        {nr.error}
                                      </p>
                                    </div>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}

                      {/* 最终输出 */}
                      <div>
                        <p className='text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5'>
                          {hasWorkflowDetails ? "最终输出" : "回复"}
                        </p>
                        <div className='p-3 bg-white/60 dark:bg-slate-900/60 rounded-lg border border-slate-200/40 dark:border-slate-800/40'>
                          <p className='text-xs text-slate-600 dark:text-slate-300 whitespace-pre-wrap leading-relaxed'>
                            {result.response}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </ScrollArea>
      </div>
    </div>
  );
}
