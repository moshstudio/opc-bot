"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { retryTask } from "@/app/actions/task-actions";
import { formatDistanceToNow, format } from "date-fns";
import { zhCN } from "date-fns/locale";
import {
  Clock,
  Loader2,
  CheckCircle2,
  XCircle,
  Brain,
  RotateCcw,
  User,
  MessageSquare,
  FileText,
  ChevronDown,
  ChevronRight,
} from "lucide-react";

interface TaskDetailPanelProps {
  taskId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface TaskDetail {
  task: {
    id: string;
    title: string;
    description: string | null;
    status: string;
    result: string | null;
    context: string | null;
    createdAt: string;
    updatedAt: string;
    assignedTo: { id: string; name: string; role: string } | null;
  };
  subTasks: {
    id: string;
    title: string;
    description: string | null;
    status: string;
    result: string | null;
    assignedTo: { id: string; name: string; role: string } | null;
    createdAt: string;
  }[];
  messages: {
    id: string;
    role: string;
    content: string;
    createdAt: string;
  }[];
}

const STATUS_CONFIG: Record<
  string,
  { label: string; icon: React.ElementType; color: string; bgColor: string }
> = {
  PENDING: {
    label: "待办",
    icon: Clock,
    color: "text-amber-600 dark:text-amber-400",
    bgColor: "bg-amber-50 dark:bg-amber-900/20",
  },
  Brain_Processing: {
    label: "大脑分析中",
    icon: Brain,
    color: "text-purple-600 dark:text-purple-400",
    bgColor: "bg-purple-50 dark:bg-purple-900/20",
  },
  IN_PROGRESS: {
    label: "执行中",
    icon: Loader2,
    color: "text-blue-600 dark:text-blue-400",
    bgColor: "bg-blue-50 dark:bg-blue-900/20",
  },
  COMPLETED: {
    label: "已完成",
    icon: CheckCircle2,
    color: "text-green-600 dark:text-green-400",
    bgColor: "bg-green-50 dark:bg-green-900/20",
  },
  FAILED: {
    label: "失败",
    icon: XCircle,
    color: "text-red-600 dark:text-red-400",
    bgColor: "bg-red-50 dark:bg-red-900/20",
  },
};

function getStatusCfg(status: string) {
  return (
    STATUS_CONFIG[status] || {
      label: status,
      icon: Clock,
      color: "text-slate-500",
      bgColor: "bg-slate-50",
    }
  );
}

function SubTaskDetail({
  subTask,
}: {
  subTask: TaskDetail["subTasks"][number];
}) {
  const [expanded, setExpanded] = useState(false);
  const cfg = getStatusCfg(subTask.status);
  const Icon = cfg.icon;
  const isActive = subTask.status === "IN_PROGRESS";

  return (
    <div className='rounded-lg border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900/50 overflow-hidden'>
      <button
        onClick={() => setExpanded(!expanded)}
        className='w-full flex items-center gap-2.5 p-3 text-left hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors'
      >
        <Icon
          className={`h-4 w-4 flex-shrink-0 ${cfg.color} ${isActive ? "animate-spin" : ""}`}
        />
        <div className='flex-1 min-w-0'>
          <p className='text-sm font-medium text-slate-800 dark:text-slate-200 truncate'>
            {subTask.title}
          </p>
          <div className='flex items-center gap-2 mt-0.5'>
            {subTask.assignedTo && (
              <span className='flex items-center gap-1 text-[11px] text-slate-400'>
                <User className='h-3 w-3' />
                {subTask.assignedTo.name}
              </span>
            )}
            <Badge
              className={`text-[10px] px-1.5 py-0 h-4 border-0 ${cfg.bgColor} ${cfg.color}`}
            >
              {cfg.label}
            </Badge>
          </div>
        </div>
        {(subTask.result || subTask.description) && (
          expanded ? (
            <ChevronDown className='h-3.5 w-3.5 text-slate-400 flex-shrink-0' />
          ) : (
            <ChevronRight className='h-3.5 w-3.5 text-slate-400 flex-shrink-0' />
          )
        )}
      </button>

      {expanded && (
        <div className='px-3 pb-3 pt-0 space-y-2'>
          {subTask.description && (
            <p className='text-xs text-slate-500 leading-relaxed'>
              {subTask.description}
            </p>
          )}
          {subTask.result && (
            <div className='rounded-md bg-slate-50 dark:bg-slate-800/50 p-2.5'>
              <p className='text-xs font-medium text-slate-600 dark:text-slate-300 mb-1'>
                执行结果:
              </p>
              <p className='text-xs text-slate-600 dark:text-slate-400 whitespace-pre-wrap break-words max-h-48 overflow-y-auto'>
                {subTask.result}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function TaskDetailPanel({
  taskId,
  open,
  onOpenChange,
}: TaskDetailPanelProps) {
  const [data, setData] = useState<TaskDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [retrying, setRetrying] = useState(false);
  const pollRef = useRef<NodeJS.Timeout | null>(null);

  const fetchDetail = useCallback(async () => {
    if (!taskId) return;
    try {
      const res = await fetch(`/api/tasks/${taskId}/status`);
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch (err) {
      console.error("Failed to fetch task detail:", err);
    }
  }, [taskId]);

  // 初始加载
  useEffect(() => {
    if (open && taskId) {
      setLoading(true);
      setData(null);
      fetchDetail().finally(() => setLoading(false));
    }
  }, [open, taskId, fetchDetail]);

  // 自动轮询活跃任务
  useEffect(() => {
    if (!open || !data) return;

    const isActive =
      data.task.status === "IN_PROGRESS" ||
      data.task.status === "Brain_Processing" ||
      data.task.status === "PENDING" ||
      data.subTasks.some(
        (st) => st.status === "IN_PROGRESS" || st.status === "PENDING",
      );

    if (isActive) {
      pollRef.current = setInterval(fetchDetail, 2000);
    }

    return () => {
      if (pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
    };
  }, [open, data, fetchDetail]);

  const handleRetry = async () => {
    if (!taskId) return;
    setRetrying(true);
    await retryTask(taskId);
    await fetchDetail();
    setRetrying(false);
  };

  // 解析 brain analysis
  let brainAnalysis = "";
  if (data?.task.context) {
    try {
      const ctx = JSON.parse(data.task.context);
      brainAnalysis = ctx.brainAnalysis || "";
    } catch {}
  }

  const taskCfg = data ? getStatusCfg(data.task.status) : null;
  const TaskIcon = taskCfg?.icon || Clock;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side='right' className='w-full sm:max-w-lg p-0 flex flex-col'>
        {loading && (
          <div className='flex-1 flex items-center justify-center'>
            <Loader2 className='h-6 w-6 animate-spin text-slate-400' />
          </div>
        )}

        {!loading && data && (
          <>
            {/* Header */}
            <SheetHeader className='px-5 pt-5 pb-4 border-b border-slate-100 dark:border-slate-800'>
              <div className='flex items-start gap-3'>
                <div
                  className={`p-2 rounded-xl ${taskCfg?.bgColor}`}
                >
                  <TaskIcon
                    className={`h-5 w-5 ${taskCfg?.color} ${data.task.status === "IN_PROGRESS" || data.task.status === "Brain_Processing" ? "animate-spin" : ""}`}
                  />
                </div>
                <div className='flex-1 min-w-0'>
                  <SheetTitle className='text-base leading-snug'>
                    {data.task.title}
                  </SheetTitle>
                  <SheetDescription className='mt-1'>
                    <Badge
                      className={`text-[11px] px-2 py-0.5 h-5 border-0 ${taskCfg?.bgColor} ${taskCfg?.color}`}
                    >
                      {taskCfg?.label}
                    </Badge>
                    <span className='text-[11px] text-slate-400 ml-2'>
                      {format(new Date(data.task.createdAt), "yyyy-MM-dd HH:mm", {
                        locale: zhCN,
                      })}
                    </span>
                  </SheetDescription>
                </div>
              </div>

              {/* 操作按钮 */}
              {data.task.status === "FAILED" && (
                <Button
                  variant='outline'
                  size='sm'
                  className='mt-3 gap-1.5 text-amber-600 border-amber-200 hover:bg-amber-50'
                  onClick={handleRetry}
                  disabled={retrying}
                >
                  {retrying ? (
                    <Loader2 className='h-3.5 w-3.5 animate-spin' />
                  ) : (
                    <RotateCcw className='h-3.5 w-3.5' />
                  )}
                  重试任务
                </Button>
              )}
            </SheetHeader>

            {/* Body */}
            <ScrollArea className='flex-1'>
              <div className='px-5 py-4 space-y-5'>
                {/* 任务描述 */}
                {data.task.description && (
                  <div>
                    <h4 className='text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-1.5'>
                      <FileText className='h-3.5 w-3.5' />
                      任务描述
                    </h4>
                    <p className='text-sm text-slate-700 dark:text-slate-300 leading-relaxed'>
                      {data.task.description}
                    </p>
                  </div>
                )}

                {/* 大脑分析 */}
                {brainAnalysis && (
                  <div className='rounded-xl bg-purple-50/50 dark:bg-purple-900/10 p-3.5 border border-purple-100 dark:border-purple-800/30'>
                    <h4 className='text-xs font-semibold text-purple-600 dark:text-purple-400 mb-1.5 flex items-center gap-1.5'>
                      <Brain className='h-3.5 w-3.5' />
                      大脑分析
                    </h4>
                    <p className='text-sm text-purple-700 dark:text-purple-300 leading-relaxed'>
                      {brainAnalysis}
                    </p>
                  </div>
                )}

                {/* 最终结果 */}
                {data.task.result && (
                  <div
                    className={`rounded-xl p-3.5 border ${
                      data.task.status === "COMPLETED"
                        ? "bg-green-50/50 dark:bg-green-900/10 border-green-100 dark:border-green-800/30"
                        : "bg-red-50/50 dark:bg-red-900/10 border-red-100 dark:border-red-800/30"
                    }`}
                  >
                    <h4
                      className={`text-xs font-semibold mb-1.5 ${
                        data.task.status === "COMPLETED"
                          ? "text-green-600 dark:text-green-400"
                          : "text-red-600 dark:text-red-400"
                      }`}
                    >
                      {data.task.status === "COMPLETED"
                        ? "执行结果"
                        : "失败原因"}
                    </h4>
                    <p className='text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap break-words'>
                      {data.task.result}
                    </p>
                  </div>
                )}

                {/* 子任务列表 */}
                {data.subTasks.length > 0 && (
                  <div>
                    <h4 className='text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-1.5'>
                      <FileText className='h-3.5 w-3.5' />
                      子任务 ({data.subTasks.length})
                    </h4>
                    <div className='space-y-2'>
                      {data.subTasks.map((st) => (
                        <SubTaskDetail key={st.id} subTask={st} />
                      ))}
                    </div>
                  </div>
                )}

                {/* 执行日志 */}
                {data.messages.length > 0 && (
                  <div>
                    <h4 className='text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-1.5'>
                      <MessageSquare className='h-3.5 w-3.5' />
                      执行日志 ({data.messages.length})
                    </h4>
                    <div className='space-y-2'>
                      {data.messages.map((msg) => (
                        <div
                          key={msg.id}
                          className={`rounded-lg p-2.5 text-xs ${
                            msg.role === "system"
                              ? "bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800"
                              : "bg-blue-50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-800/30"
                          }`}
                        >
                          <div className='flex items-center justify-between mb-1'>
                            <span
                              className={`font-medium ${
                                msg.role === "system"
                                  ? "text-slate-500"
                                  : "text-blue-600 dark:text-blue-400"
                              }`}
                            >
                              {msg.role === "system" ? "系统" : "员工"}
                            </span>
                            <span className='text-[10px] text-slate-400'>
                              {formatDistanceToNow(new Date(msg.createdAt), {
                                addSuffix: true,
                                locale: zhCN,
                              })}
                            </span>
                          </div>
                          <p className='text-slate-600 dark:text-slate-400 whitespace-pre-wrap break-words max-h-32 overflow-y-auto'>
                            {msg.content}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </ScrollArea>
          </>
        )}

        {!loading && !data && taskId && (
          <div className='flex-1 flex items-center justify-center'>
            <p className='text-sm text-slate-400'>任务数据加载失败</p>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
