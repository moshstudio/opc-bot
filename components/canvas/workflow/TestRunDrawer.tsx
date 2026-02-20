import React, { useState, useMemo, memo, useRef, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import {
  X,
  CheckCircle2,
  XCircle,
  Clock,
  ChevronRight,
  ChevronDown,
  Loader2,
  Terminal,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  WorkflowExecutionResult,
  NodeExecutionResult,
} from "@/lib/workflow/types";

interface TestRunDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  result: WorkflowExecutionResult | null;
  isRunning: boolean;
}

export function TestRunDrawer({
  isOpen,
  onClose,
  result,
  isRunning,
}: TestRunDrawerProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new results arrive
  useEffect(() => {
    if (isOpen && result?.nodeResults?.length) {
      setTimeout(() => {
        scrollRef.current?.scrollIntoView({ behavior: "smooth" });
      }, 100);
    }
  }, [result?.nodeResults?.length, isOpen]);

  if (!isOpen) return null;

  return (
    <div className='absolute right-0 top-0 bottom-0 w-[400px] sm:w-[540px] bg-white dark:bg-slate-950 border-l border-slate-200 dark:border-slate-800 shadow-2xl z-50 flex flex-col animate-in slide-in-from-right duration-300'>
      <div className='flex flex-col h-full relative'>
        <div className='px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between'>
          <div className='flex flex-col'>
            <div className='flex items-center gap-4'>
              <h2 className='text-lg font-semibold'>测试运行结果</h2>
              {!isRunning && result && (
                <Badge
                  variant={result.success ? "default" : "destructive"}
                  className={cn(
                    result.success ? "bg-emerald-600" : "bg-red-600",
                    "text-white",
                  )}
                >
                  {result.success ? "运行成功" : "运行失败"}
                </Badge>
              )}
            </div>
            <p className='text-sm text-slate-500'>
              {isRunning
                ? "工作流正在执行中..."
                : result
                  ? `执行耗时: ${result.totalDuration}ms`
                  : "准备就开始测试"}
            </p>
          </div>
          <Button
            variant='ghost'
            size='icon'
            onClick={onClose}
            className='rounded-full'
          >
            <X className='w-5 h-5' />
          </Button>
        </div>

        <div className='flex-1 overflow-hidden h-full relative'>
          {isRunning &&
          (!result ||
            !result.nodeResults ||
            result.nodeResults.length === 0) ? (
            <div className='flex flex-col items-center justify-center h-full text-slate-500 gap-4'>
              <Loader2 className='w-8 h-8 animate-spin text-violet-600' />
              <p>正在执行工作流节点...</p>
            </div>
          ) : !result ? (
            <div className='flex flex-col items-center justify-center h-full text-slate-400 gap-4 p-8 text-center'>
              <Terminal className='w-12 h-12 opacity-20' />
              <p>点击上方 &quot;测试运行&quot; 按钮开始测试工作流</p>
            </div>
          ) : (
            <Tabs
              defaultValue='trace'
              className='h-full flex flex-col'
            >
              <div className='px-6 pt-4'>
                <TabsList className='w-full grid grid-cols-2'>
                  <TabsTrigger value='trace'>执行追踪</TabsTrigger>
                  <TabsTrigger value='details'>结果详情</TabsTrigger>
                </TabsList>
              </div>

              <div className='flex-1 overflow-hidden mt-4'>
                <TabsContent
                  value='trace'
                  className='h-full m-0 border-0 flex flex-col'
                >
                  <ScrollArea className='flex-1 h-full'>
                    <div className='px-6 py-6'>
                      {result.nodeResults && result.nodeResults.length > 0 ? (
                        <>
                          {result.nodeResults.map((nodeResult, index) => (
                            <NodeTraceItem
                              key={nodeResult.nodeId}
                              result={nodeResult}
                              isLast={index === result.nodeResults.length - 1}
                            />
                          ))}
                          <div ref={scrollRef} />
                        </>
                      ) : (
                        <div className='text-center text-slate-500 py-8'>
                          暂无节点执行记录
                        </div>
                      )}
                    </div>
                  </ScrollArea>
                </TabsContent>

                <TabsContent
                  value='details'
                  className='h-full m-0 border-0'
                >
                  <ScrollArea className='h-full'>
                    <div className='px-6 pb-6 space-y-6'>
                      <div>
                        <h4 className='text-sm font-medium mb-2 text-slate-500'>
                          最终输出
                        </h4>
                        <div className='max-w-full bg-slate-950 text-slate-50 p-4 rounded-lg font-mono text-xs overflow-x-auto whitespace-pre-wrap dark:bg-black border border-slate-800 break-all'>
                          {renderOutput(result.finalOutput)}
                        </div>
                      </div>

                      {result.error && (
                        <div>
                          <h4 className='text-sm font-medium mb-2 text-red-500'>
                            错误信息
                          </h4>
                          <div className='max-w-full bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400 p-4 rounded-lg text-sm border border-red-200 dark:border-red-900 break-all'>
                            {result.error}
                          </div>
                        </div>
                      )}
                    </div>
                  </ScrollArea>
                </TabsContent>
              </div>
            </Tabs>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * 格式化输出内容，支持 JSON 解析和深度美化
 */
function renderOutput(output: any) {
  if (output === undefined || output === null) return "(无输出)";

  // 递归解析可能的 JSON 字符串
  const smartParse = (input: any): any => {
    if (typeof input === "string") {
      const trimmed = input.trim();
      if (
        (trimmed.startsWith("{") && trimmed.endsWith("}")) ||
        (trimmed.startsWith("[") && trimmed.endsWith("]"))
      ) {
        try {
          const parsed = JSON.parse(input);
          // 只有解析结果还是对象或数组时才继续递归，避免解析数字/布尔等
          if (parsed !== null && typeof parsed === "object") {
            return smartParse(parsed);
          }
          return parsed;
        } catch {
          return input;
        }
      }
      return input;
    }

    if (Array.isArray(input)) {
      return input.map((item) => smartParse(item));
    }

    if (input !== null && typeof input === "object") {
      const result: any = {};
      for (const key in input) {
        result[key] = smartParse(input[key]);
      }
      return result;
    }

    return input;
  };

  const data = smartParse(output);

  // 如果是对象，美化输出
  if (typeof data === "object") {
    try {
      const json = JSON.stringify(data, null, 2);
      // 如果 JSON 字符串过大（超过 100KB），进行截断，防止 DOM 渲染崩溃
      if (json.length > 102400) {
        return json.substring(0, 102400) + "\n\n... (内容过多，已截断)";
      }
      return json;
    } catch {
      return "[无法序列化的对象]";
    }
  }

  const str = String(data);
  if (str.length > 102400) {
    return str.substring(0, 102400) + "\n\n... (内容过多，已截断)";
  }
  return str;
}

const NodeTraceItem = memo(function NodeTraceItem({
  result,
  isLast,
}: {
  result: NodeExecutionResult;
  isLast: boolean;
}) {
  const [expanded, setExpanded] = useState(false);

  // Memoize formatted output to avoid re-parsing large JSON on every render
  const formattedOutput = useMemo(() => {
    if (!expanded) return null;
    return renderOutput(result.output);
  }, [expanded, result.output]);

  const formattedError = useMemo(() => {
    if (!expanded || !result.error) return null;
    return result.error;
  }, [expanded, result.error]);

  const getStatusConfig = (status: string) => {
    switch (status) {
      case "completed":
      case "success":
        return {
          icon: CheckCircle2,
          color: "text-emerald-600 dark:text-emerald-500",
          borderColor: "border-emerald-200 dark:border-emerald-800",
          bgColor: "bg-emerald-50 dark:bg-emerald-950/20",
          cardBorderColor: "border-emerald-200 dark:border-emerald-800",
          cardBgColor: "bg-emerald-50/50 dark:bg-emerald-900/10",
        };
      case "failed":
      case "error":
        return {
          icon: XCircle,
          color: "text-red-600 dark:text-red-500",
          borderColor: "border-red-200 dark:border-red-800",
          bgColor: "bg-red-50 dark:bg-red-950/20",
          cardBorderColor: "border-red-200 dark:border-red-800",
          cardBgColor: "bg-red-50/50 dark:bg-red-900/10",
        };
      case "running":
        return {
          icon: Loader2,
          color: "text-blue-600 dark:text-blue-500",
          borderColor: "border-blue-200 dark:border-blue-800",
          bgColor: "bg-blue-50 dark:bg-blue-950/20",
          cardBorderColor: "border-blue-200 dark:border-blue-800",
          cardBgColor: "bg-blue-50/50 dark:bg-blue-900/10",
        };
      default:
        return {
          icon: Clock,
          color: "text-slate-500 dark:text-slate-400",
          borderColor: "border-slate-200 dark:border-slate-700",
          bgColor: "bg-slate-50 dark:bg-slate-900",
          cardBorderColor: "border-slate-200 dark:border-slate-800",
          cardBgColor: "bg-white dark:bg-slate-950",
        };
    }
  };

  const config = getStatusConfig(result.status);
  const Icon = config.icon;

  return (
    <div className='relative flex gap-4'>
      {/* Timeline Column */}
      <div className='flex flex-col items-center'>
        {/* Connector Line - only show if there IS a next item (not last) */}
        {!isLast && (
          <div className='absolute top-[30px] bottom-[-16px] w-[2px] bg-slate-200 dark:bg-slate-800 left-[15px]' />
        )}

        {/* Status Icon - Aligned with Card Header Center (approx 14px down) */}
        <div
          className={cn(
            "relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 transition-colors mt-[14px]",
            config.borderColor,
            config.color,
            config.bgColor,
          )}
        >
          <Icon
            className={cn(
              "w-4 h-4",
              result.status === "running" && "animate-spin",
            )}
          />
        </div>
      </div>

      {/* Content Card */}
      <div className='flex-1 pb-6 min-w-0'>
        <div
          className={cn(
            "group relative overflow-hidden rounded-xl border transition-all duration-200",
            expanded
              ? "ring-1 ring-slate-200 dark:ring-slate-800 shadow-md"
              : "hover:shadow-sm",
            config.cardBorderColor,
            config.cardBgColor,
          )}
        >
          {/* Card Header */}
          <div
            className='flex items-center justify-between p-3 cursor-pointer select-none'
            onClick={() => setExpanded(!expanded)}
          >
            <div className='flex items-center gap-3'>
              <div className='flex flex-col'>
                <span className='font-semibold text-sm text-slate-900 dark:text-slate-100'>
                  {result.nodeLabel || "未知节点"}
                </span>
                <div className='flex items-center gap-2 mt-0.5'>
                  <span className='text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400 tracking-wider bg-white/50 dark:bg-black/20 px-1.5 py-0.5 rounded-sm border border-black/5 dark:border-white/5'>
                    {result.nodeType}
                  </span>
                  {result.duration && (
                    <span className='text-[10px] text-slate-400 font-mono'>
                      {result.duration}ms
                    </span>
                  )}
                </div>
              </div>
            </div>

            {expanded ? (
              <ChevronDown className='w-4 h-4 text-slate-400' />
            ) : (
              <ChevronRight className='w-4 h-4 text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-300' />
            )}
          </div>

          {/* Expanded Content */}
          {expanded && (
            <div className='border-t border-black/5 dark:border-white/5 bg-white/50 dark:bg-black/20'>
              <div className='p-3 space-y-3'>
                {/* Output */}
                {result.output !== undefined && result.output !== null && (
                  <div className='space-y-1.5'>
                    <div className='flex items-center justify-between'>
                      <label className='text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1'>
                        <span className='w-1.5 h-1.5 rounded-full bg-slate-400' />
                        Result Output
                      </label>
                    </div>
                    <div
                      className='max-w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-md p-2.5 text-xs font-mono text-slate-600 dark:text-slate-300 overflow-x-auto whitespace-pre-wrap max-h-[300px] overflow-y-auto break-all shadow-sm cursor-text'
                      onClick={(e) => e.stopPropagation()}
                    >
                      {formattedOutput}
                    </div>
                  </div>
                )}

                {/* Error */}
                {result.error && (
                  <div className='space-y-1.5'>
                    <label className='text-[10px] font-bold text-red-500 uppercase tracking-wider flex items-center gap-1'>
                      <span className='w-1.5 h-1.5 rounded-full bg-red-400' />
                      Error Details
                    </label>
                    <div
                      className='max-w-full bg-red-50 dark:bg-red-950/20 border border-red-100 dark:border-red-900/50 rounded-md p-2.5 text-xs font-mono text-red-600 dark:text-red-400 break-all cursor-text'
                      onClick={(e) => e.stopPropagation()}
                    >
                      {formattedError}
                    </div>
                  </div>
                )}

                <div className='flex justify-end pt-1'>
                  <span className='text-[9px] text-slate-300 dark:text-slate-600 font-mono select-all'>
                    ID: {result.nodeId}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
});
