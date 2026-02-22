"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  getTasks,
  retryTask,
  deleteTask,
  pauseTask,
  resumeTask,
} from "@/app/actions/task-actions";
import { formatDistanceToNow } from "date-fns";
import { zhCN } from "date-fns/locale";
import {
  Clock,
  Loader2,
  CheckCircle2,
  XCircle,
  Brain,
  ChevronDown,
  ChevronRight,
  RotateCcw,
  Trash2,
  User,
  Eye,
  Pause,
  Play,
} from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";

interface SubTask {
  id: string;
  title: string;
  description: string | null;
  status: string;
  result: string | null;
  assignedTo: { id: string; name: string; role: string } | null;
  createdAt: Date;
}

interface Task {
  id: string;
  title: string;
  description: string | null;
  status: string;
  result: string | null;
  context: string | null;
  assignedTo: { id: string; name: string; role: string } | null;
  subTasks: SubTask[];
  _count: { subTasks: number; messages: number };
  createdAt: Date;
}

interface TaskBoardProps {
  initialTasks: Task[];
  companyId: string;
  onViewDetail?: (taskId: string) => void;
}

const STATUS_CONFIG: Record<
  string,
  {
    label: string;
    icon: React.ElementType;
    color: string;
    bgColor: string;
    dotColor: string;
  }
> = {
  PENDING: {
    label: "待办",
    icon: Clock,
    color: "text-amber-600 dark:text-amber-400",
    bgColor: "bg-amber-50/80 dark:bg-amber-900/10",
    dotColor: "bg-amber-500",
  },
  Brain_Processing: {
    label: "大脑分析中",
    icon: Brain,
    color: "text-purple-600 dark:text-purple-400",
    bgColor: "bg-purple-50/80 dark:bg-purple-900/10",
    dotColor: "bg-purple-500",
  },
  IN_PROGRESS: {
    label: "执行中",
    icon: Loader2,
    color: "text-blue-600 dark:text-blue-400",
    bgColor: "bg-blue-50/80 dark:bg-blue-900/10",
    dotColor: "bg-blue-500",
  },
  COMPLETED: {
    label: "已完成",
    icon: CheckCircle2,
    color: "text-green-600 dark:text-green-400",
    bgColor: "bg-green-50/80 dark:bg-green-900/10",
    dotColor: "bg-green-500",
  },
  FAILED: {
    label: "失败",
    icon: XCircle,
    color: "text-red-600 dark:text-red-400",
    bgColor: "bg-red-50/80 dark:bg-red-900/10",
    dotColor: "bg-red-500",
  },
  PAUSED: {
    label: "已暂停",
    icon: Pause,
    color: "text-slate-600 dark:text-slate-400",
    bgColor: "bg-slate-100 dark:bg-slate-800",
    dotColor: "bg-slate-500",
  },
};

function getStatusConfig(status: string) {
  return (
    STATUS_CONFIG[status] || {
      label: status,
      icon: Clock,
      color: "text-slate-500",
      bgColor: "bg-slate-50",
      dotColor: "bg-slate-500",
    }
  );
}

function SubTaskProgress({ subTasks }: { subTasks: SubTask[] }) {
  if (subTasks.length === 0) return null;

  const completed = subTasks.filter((st) => st.status === "COMPLETED").length;
  const failed = subTasks.filter((st) => st.status === "FAILED").length;
  const inProgress = subTasks.filter(
    (st) => st.status === "IN_PROGRESS",
  ).length;
  const total = subTasks.length;
  const percent = Math.round((completed / total) * 100);

  return (
    <div className='mt-3 space-y-1.5'>
      <div className='flex items-center justify-between text-[11px] text-slate-500'>
        <span>
          子任务 {completed}/{total}
          {failed > 0 && (
            <span className='text-red-500 ml-1'>({failed} 失败)</span>
          )}
          {inProgress > 0 && (
            <span className='text-blue-500 ml-1'>({inProgress} 执行中)</span>
          )}
        </span>
        <span>{percent}%</span>
      </div>
      <div className='h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden'>
        <div className='h-full flex'>
          {completed > 0 && (
            <div
              className='bg-green-500 transition-all duration-500'
              style={{ width: `${(completed / total) * 100}%` }}
            />
          )}
          {inProgress > 0 && (
            <div
              className='bg-blue-500 transition-all duration-500'
              style={{ width: `${(inProgress / total) * 100}%` }}
            />
          )}
          {failed > 0 && (
            <div
              className='bg-red-500 transition-all duration-500'
              style={{ width: `${(failed / total) * 100}%` }}
            />
          )}
        </div>
      </div>
    </div>
  );
}

function SubTaskList({ subTasks }: { subTasks: SubTask[] }) {
  return (
    <div className='mt-2 space-y-1.5'>
      {subTasks.map((st) => {
        const cfg = getStatusConfig(st.status);
        const StatusIcon = cfg.icon;
        return (
          <div
            key={st.id}
            className='flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-slate-50/50 dark:bg-slate-800/50 text-xs'
          >
            <StatusIcon
              className={`h-3 w-3 flex-shrink-0 ${cfg.color} ${st.status === "IN_PROGRESS" ? "animate-spin" : ""}`}
            />
            <span className='flex-1 truncate text-slate-700 dark:text-slate-300'>
              {st.title}
            </span>
            {st.assignedTo && (
              <span className='flex items-center gap-1 text-[10px] text-slate-400 flex-shrink-0'>
                <User className='h-2.5 w-2.5' />
                {st.assignedTo.name}
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}

function TaskCard({
  task,
  onRetry,
  onDelete,
  onViewDetail,
  onPause,
  onResume,
}: {
  task: Task;
  onRetry: (taskId: string) => void;
  onDelete: (taskId: string) => void;
  onViewDetail?: (taskId: string) => void;
  onPause?: (taskId: string) => void;
  onResume?: (taskId: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const cfg = getStatusConfig(task.status);
  const StatusIcon = cfg.icon;
  const hasSubTasks = task.subTasks.length > 0;
  const isActive =
    task.status === "IN_PROGRESS" || task.status === "Brain_Processing";

  // 解析 brain analysis
  let brainAnalysis = "";
  if (task.context) {
    try {
      const ctx = JSON.parse(task.context);
      brainAnalysis = ctx.brainAnalysis || "";
    } catch {}
  }

  return (
    <Card className='group border-0 shadow-sm hover:shadow-lg bg-white dark:bg-slate-900 rounded-xl transition-all duration-200 hover:-translate-y-0.5'>
      <CardHeader className='p-4 pb-2'>
        <div className='flex items-start justify-between gap-2'>
          <div className='flex items-center gap-2 min-w-0 flex-1'>
            <StatusIcon
              className={`h-4 w-4 flex-shrink-0 ${cfg.color} ${isActive ? "animate-spin" : ""}`}
            />
            <CardTitle className='text-sm font-semibold leading-snug text-slate-900 dark:text-slate-100 truncate'>
              {task.title}
            </CardTitle>
          </div>
          <Badge
            className={`text-[10px] px-1.5 py-0 h-5 rounded-md flex-shrink-0 border-0 ${cfg.bgColor} ${cfg.color}`}
          >
            {cfg.label}
          </Badge>
        </div>
        {task.description && (
          <CardDescription className='text-xs text-slate-500 line-clamp-2 mt-1 pl-6'>
            {task.description}
          </CardDescription>
        )}
        {brainAnalysis && (
          <p className='text-xs text-purple-600 dark:text-purple-400 mt-1 pl-6 line-clamp-2'>
            {brainAnalysis}
          </p>
        )}
      </CardHeader>

      <CardContent className='p-4 pt-0'>
        {/* 子任务进度 */}
        {hasSubTasks && <SubTaskProgress subTasks={task.subTasks} />}

        {/* 展开/收起子任务列表 */}
        {hasSubTasks && (
          <button
            onClick={() => setExpanded(!expanded)}
            className='flex items-center gap-1 mt-2 text-xs text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 transition-colors'
          >
            {expanded ? (
              <ChevronDown className='h-3 w-3' />
            ) : (
              <ChevronRight className='h-3 w-3' />
            )}
            {expanded ? "收起" : "展开"} {task.subTasks.length} 个子任务
          </button>
        )}

        {expanded && hasSubTasks && <SubTaskList subTasks={task.subTasks} />}

        {/* 结果预览 */}
        {task.result && task.status === "COMPLETED" && (
          <p className='mt-2 text-xs text-green-600 dark:text-green-400 line-clamp-2 pl-0.5'>
            {task.result}
          </p>
        )}
        {task.result && task.status === "FAILED" && (
          <p className='mt-2 text-xs text-red-500 line-clamp-2 pl-0.5'>
            {task.result}
          </p>
        )}

        {/* 底部：元信息 + 操作按钮 */}
        <div className='flex items-center justify-between mt-3 pt-2 border-t border-slate-100 dark:border-slate-800/50'>
          <div className='flex items-center gap-2'>
            {task.assignedTo && (
              <Badge
                variant='outline'
                className='text-[10px] h-5 rounded-md border-slate-200 dark:border-slate-700 font-medium'
              >
                {task.assignedTo.name}
              </Badge>
            )}
            <span className='text-[10px] text-slate-400'>
              {formatDistanceToNow(new Date(task.createdAt), {
                addSuffix: true,
                locale: zhCN,
              })}
            </span>
          </div>

          <div className='flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity'>
            {onViewDetail && (
              <Button
                variant='ghost'
                size='icon'
                className='h-6 w-6 rounded-lg'
                onClick={() => onViewDetail(task.id)}
                title='查看详情'
              >
                <Eye className='h-3 w-3' />
              </Button>
            )}
            {task.status === "FAILED" && (
              <Button
                variant='ghost'
                size='icon'
                className='h-6 w-6 rounded-lg text-amber-600 hover:text-amber-700 hover:bg-amber-50'
                onClick={() => onRetry(task.id)}
                title='重试'
              >
                <RotateCcw className='h-3 w-3' />
              </Button>
            )}
            {task.status === "PAUSED" ? (
              <Button
                variant='ghost'
                size='icon'
                className='h-6 w-6 rounded-lg text-blue-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30'
                onClick={() => onResume?.(task.id)}
                title='继续执行'
              >
                <Play className='h-3 w-3' />
              </Button>
            ) : isActive || task.status === "PENDING" ? (
              <Button
                variant='ghost'
                size='icon'
                className='h-6 w-6 rounded-lg text-slate-500 hover:text-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800'
                onClick={() => onPause?.(task.id)}
                title='暂停'
              >
                <Pause className='h-3 w-3' />
              </Button>
            ) : null}
            <Button
              variant='ghost'
              size='icon'
              className='h-6 w-6 rounded-lg text-red-500 hover:text-red-600 hover:bg-red-50'
              onClick={() => onDelete(task.id)}
              title='删除'
            >
              <Trash2 className='h-3 w-3' />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function TaskBoard({
  initialTasks,
  companyId,
  onViewDetail,
}: TaskBoardProps) {
  const [tasks, setTasks] = useState<Task[]>(initialTasks);
  const [deletingTaskId, setDeletingTaskId] = useState<string | null>(null);
  const pollRef = useRef<NodeJS.Timeout | null>(null);

  // 刷新任务列表
  const refreshTasks = useCallback(async () => {
    try {
      const result = await getTasks(companyId);
      if (result.success && result.tasks) {
        setTasks(result.tasks as unknown as Task[]);
      }
    } catch (err) {
      console.error("Failed to refresh tasks:", err);
    }
  }, [companyId]);

  // 初始数据同步
  useEffect(() => {
    setTasks(initialTasks);
  }, [initialTasks]);

  // 自动轮询：当有活跃任务时每 3s 刷新
  useEffect(() => {
    const hasActiveTasks = tasks.some(
      (t) =>
        t.status === "IN_PROGRESS" ||
        t.status === "Brain_Processing" ||
        t.status === "PENDING" ||
        t.subTasks?.some(
          (st) => st.status === "IN_PROGRESS" || st.status === "PENDING",
        ),
    );

    if (hasActiveTasks) {
      pollRef.current = setInterval(refreshTasks, 3000);
    }

    return () => {
      if (pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
    };
  }, [tasks, refreshTasks]);

  const handleRetry = async (taskId: string) => {
    await retryTask(taskId);
    await refreshTasks();
  };

  const handlePause = async (taskId: string) => {
    await pauseTask(taskId);
    await refreshTasks();
  };

  const handleResume = async (taskId: string) => {
    await resumeTask(taskId);
    await refreshTasks();
  };

  const handleDelete = (taskId: string) => {
    setDeletingTaskId(taskId);
  };

  const confirmDelete = async () => {
    if (!deletingTaskId) return;
    try {
      const result = await deleteTask(deletingTaskId);
      if (result.success) {
        toast.success("任务已删除");
        await refreshTasks();
      } else {
        toast.error(`删除失败: ${result.error}`);
      }
    } catch (error) {
      console.error("Delete task error:", error);
      toast.error("删除任务时发生错误");
    } finally {
      setDeletingTaskId(null);
    }
  };

  // 分列：活跃 = PENDING + Brain_Processing + IN_PROGRESS + PAUSED
  const activeTasks = tasks.filter(
    (t) =>
      t.status === "PENDING" ||
      t.status === "Brain_Processing" ||
      t.status === "IN_PROGRESS" ||
      t.status === "PAUSED",
  );
  const completedTasks = tasks.filter((t) => t.status === "COMPLETED");
  const failedTasks = tasks.filter((t) => t.status === "FAILED");

  const columnData = [
    {
      key: "ACTIVE",
      label: "进行中",
      tasks: activeTasks,
      icon: Loader2,
      color: "text-blue-600 dark:text-blue-400",
      bgColor: "bg-blue-50/80 dark:bg-blue-900/10",
    },
    {
      key: "COMPLETED",
      label: "已完成",
      tasks: completedTasks,
      icon: CheckCircle2,
      color: "text-green-600 dark:text-green-400",
      bgColor: "bg-green-50/80 dark:bg-green-900/10",
    },
    {
      key: "FAILED",
      label: "失败",
      tasks: failedTasks,
      icon: XCircle,
      color: "text-red-600 dark:text-red-400",
      bgColor: "bg-red-50/80 dark:bg-red-900/10",
    },
  ];

  return (
    <>
      <div className='flex md:grid md:grid-cols-3 gap-5 h-full min-h-0 overflow-x-auto md:overflow-hidden p-1 scrollbar-custom'>
        {columnData.map((col) => {
          const ColIcon = col.icon;
          return (
            <div
              key={col.key}
              className='flex flex-col h-full min-h-0 min-w-[300px] md:min-w-0 flex-shrink-0 md:flex-shrink-1 flex-1'
            >
              {/* Column Header */}
              <div className='flex items-center justify-between mb-4 px-1'>
                <div className='flex items-center gap-2'>
                  <ColIcon className={`h-4 w-4 ${col.color}`} />
                  <h3 className='font-semibold text-sm text-slate-700 dark:text-slate-300'>
                    {col.label}
                  </h3>
                </div>
                <Badge
                  variant='secondary'
                  className='rounded-lg text-[11px] font-semibold px-2 py-0 h-5 bg-slate-100 dark:bg-slate-800 text-slate-500'
                >
                  {col.tasks.length}
                </Badge>
              </div>

              {/* Column Body */}
              <div
                className={`flex-1 min-h-0 ${col.bgColor} rounded-2xl p-3 space-y-3 overflow-y-auto scrollbar-custom border border-slate-100 dark:border-slate-800/50`}
              >
                {col.tasks.map((task) => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    onRetry={handleRetry}
                    onPause={handlePause}
                    onResume={handleResume}
                    onDelete={handleDelete}
                    onViewDetail={onViewDetail}
                  />
                ))}

                {col.tasks.length === 0 && (
                  <div className='flex flex-col items-center justify-center py-12 text-center'>
                    <div className='w-10 h-10 rounded-full bg-white dark:bg-slate-800 shadow-sm flex items-center justify-center mb-2'>
                      <ColIcon className={`w-4 h-4 ${col.color} opacity-50`} />
                    </div>
                    <span className='text-xs text-slate-400 dark:text-slate-500'>
                      暂无任务
                    </span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <AlertDialog
        open={!!deletingTaskId}
        onOpenChange={(open) => !open && setDeletingTaskId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除任务？</AlertDialogTitle>
            <AlertDialogDescription>
              确定要删除此任务及其所有子任务吗？此操作不可逆。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className='bg-red-600 hover:bg-red-700 text-white'
            >
              确定删除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
