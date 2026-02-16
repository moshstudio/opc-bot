import React, { useState, useMemo, memo } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import {
  X,
  CheckCircle2,
  XCircle,
  Clock,
  AlertCircle,
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
          {isRunning ? (
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
                    <div className='px-6 pb-6 space-y-4'>
                      {result.nodeResults && result.nodeResults.length > 0 ? (
                        result.nodeResults.map((nodeResult, index) => (
                          <NodeTraceItem
                            key={nodeResult.nodeId}
                            result={nodeResult}
                            isLast={index === result.nodeResults.length - 1}
                          />
                        ))
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

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed":
      case "success":
        return <CheckCircle2 className='w-4 h-4 text-emerald-500' />;
      case "failed":
      case "error":
        return <XCircle className='w-4 h-4 text-red-500' />;
      case "running":
        return <Loader2 className='w-4 h-4 animate-spin text-blue-500' />;
      case "skipped":
        return <AlertCircle className='w-4 h-4 text-slate-400' />;
      default:
        return <Clock className='w-4 h-4 text-slate-400' />;
    }
  };

  const statusColors: any = {
    completed:
      "bg-emerald-50 border-emerald-200 dark:bg-emerald-950/20 dark:border-emerald-900",
    success:
      "bg-emerald-50 border-emerald-200 dark:bg-emerald-950/20 dark:border-emerald-900",
    failed: "bg-red-50 border-red-200 dark:bg-red-950/20 dark:border-red-900",
    error: "bg-red-50 border-red-200 dark:bg-red-950/20 dark:border-red-900",
    running:
      "bg-blue-50 border-blue-200 dark:bg-blue-950/20 dark:border-blue-900",
    skipped:
      "bg-slate-50 border-slate-200 dark:bg-slate-900 dark:border-slate-800",
    pending:
      "bg-slate-50 border-slate-200 dark:bg-slate-900 dark:border-slate-800",
  };

  const statusColor =
    statusColors[result.status as keyof typeof statusColors] ||
    statusColors.pending;

  return (
    <div className='relative pl-4'>
      {/* Connector Line */}
      {!isLast && (
        <div className='absolute left-[23px] top-8 bottom-[-16px] w-[2px] bg-slate-200 dark:bg-slate-800' />
      )}

      <div
        className={cn(
          "rounded-lg border p-3 cursor-pointer transition-all hover:shadow-sm mb-3",
          statusColor,
        )}
        onClick={() => setExpanded(!expanded)}
      >
        <div className='flex items-center justify-between'>
          <div className='flex items-center gap-3'>
            {getStatusIcon(result.status)}
            <div>
              <div className='font-medium text-sm'>
                {result.nodeLabel || "未知节点"}
              </div>
              <div className='flex items-center gap-2 mt-1'>
                <Badge
                  variant='outline'
                  className='text-[10px] h-4 px-1 py-0 font-normal bg-white/50 dark:bg-black/20'
                >
                  {result.nodeType}
                </Badge>
                {result.duration && (
                  <span className='text-[10px] text-slate-500'>
                    {result.duration}ms
                  </span>
                )}
              </div>
            </div>
          </div>
          {expanded ? (
            <ChevronDown className='w-4 h-4 text-slate-400' />
          ) : (
            <ChevronRight className='w-4 h-4 text-slate-400' />
          )}
        </div>

        {expanded && (
          <div className='mt-3 pt-3 border-t border-black/5 dark:border-white/5 space-y-3 animate-in fade-in duration-200'>
            {/* Output Section */}
            {result.output !== undefined && result.output !== null && (
              <div>
                <div className='text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1'>
                  Output
                </div>
                <div
                  className='max-w-full bg-white/50 dark:bg-black/20 rounded p-2 text-xs font-mono overflow-x-auto whitespace-pre-wrap max-h-[200px] overflow-y-auto break-all cursor-text select-text'
                  onClick={(e) => e.stopPropagation()}
                >
                  {formattedOutput}
                </div>
              </div>
            )}

            {/* Error Section */}
            {result.error && (
              <div>
                <div className='text-[10px] font-semibold text-red-500 uppercase tracking-wider mb-1'>
                  Error
                </div>
                <div
                  className='max-w-full bg-red-100/50 dark:bg-red-950/30 text-red-600 dark:text-red-400 rounded p-2 text-xs font-mono break-all cursor-text select-text'
                  onClick={(e) => e.stopPropagation()}
                >
                  {formattedError}
                </div>
              </div>
            )}

            <div className='text-[9px] text-slate-400 text-right font-mono'>
              {result.nodeId}
            </div>
          </div>
        )}
      </div>
    </div>
  );
});
