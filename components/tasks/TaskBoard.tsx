"use client";

import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { TaskStatus, updateTaskStatus } from "@/app/actions/task-actions";
import { formatDistanceToNow } from "date-fns";
import { zhCN } from "date-fns/locale";
import { Clock, Loader2, CheckCircle2 } from "lucide-react";

interface Task {
  id: string;
  title: string;
  description: string | null;
  status: string;
  assignedTo: {
    name: string;
    role: string;
  } | null;
  createdAt: Date;
}

interface TaskBoardProps {
  initialTasks: Task[];
}

const COLUMNS: {
  status: TaskStatus;
  label: string;
  icon: React.ElementType;
  color: string;
  bgColor: string;
}[] = [
  {
    status: "PENDING",
    label: "待办",
    icon: Clock,
    color: "text-amber-600 dark:text-amber-400",
    bgColor: "bg-amber-50/80 dark:bg-amber-900/10",
  },
  {
    status: "IN_PROGRESS",
    label: "进行中",
    icon: Loader2,
    color: "text-blue-600 dark:text-blue-400",
    bgColor: "bg-blue-50/80 dark:bg-blue-900/10",
  },
  {
    status: "COMPLETED",
    label: "已完成",
    icon: CheckCircle2,
    color: "text-green-600 dark:text-green-400",
    bgColor: "bg-green-50/80 dark:bg-green-900/10",
  },
];

export function TaskBoard({ initialTasks }: TaskBoardProps) {
  const [tasks, setTasks] = useState<Task[]>(initialTasks);

  useEffect(() => {
    setTasks(initialTasks);
  }, [initialTasks]);

  const handleStatusChange = async (taskId: string, newStatus: TaskStatus) => {
    setTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, status: newStatus } : t)),
    );

    const result = await updateTaskStatus(taskId, newStatus);
    if (!result.success) {
      setTasks(initialTasks);
      console.error("Failed to update status");
    }
  };

  return (
    <div className='flex md:grid md:grid-cols-3 gap-5 h-full min-h-0 overflow-x-auto md:overflow-hidden p-1 scrollbar-custom'>
      {COLUMNS.map((col) => {
        const columnTasks = tasks.filter((t) => t.status === col.status);
        const ColIcon = col.icon;
        return (
          <div
            key={col.status}
            className='flex flex-col h-full min-h-0 min-w-[280px] md:min-w-0 flex-shrink-0 md:flex-shrink-1 flex-1'
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
                {columnTasks.length}
              </Badge>
            </div>

            {/* Column Body */}
            <div
              className={`flex-1 min-h-0 ${col.bgColor} rounded-2xl p-3 space-y-3 overflow-y-auto scrollbar-custom border border-slate-100 dark:border-slate-800/50`}
            >
              {columnTasks.map((task) => (
                <Card
                  key={task.id}
                  className='group border-0 shadow-sm hover:shadow-lg bg-white dark:bg-slate-900 rounded-xl transition-all duration-200 hover:-translate-y-0.5'
                >
                  <CardHeader className='p-4 pb-2'>
                    <CardTitle className='text-sm font-semibold leading-snug text-slate-900 dark:text-slate-100'>
                      {task.title}
                    </CardTitle>
                    {task.description && (
                      <CardDescription className='text-xs text-slate-500 line-clamp-2 mt-1'>
                        {task.description}
                      </CardDescription>
                    )}
                  </CardHeader>
                  <CardContent className='p-4 pt-2'>
                    <div className='flex items-center justify-between mt-1'>
                      <div className='flex items-center gap-2'>
                        {task.assignedTo ? (
                          <Badge
                            variant='outline'
                            className='text-[10px] h-5 rounded-md border-slate-200 dark:border-slate-700 font-medium'
                          >
                            {task.assignedTo.name}
                          </Badge>
                        ) : (
                          <span className='text-[11px] text-slate-400'>
                            未分配
                          </span>
                        )}
                      </div>
                      <span className='text-[10px] text-slate-400'>
                        {formatDistanceToNow(new Date(task.createdAt), {
                          addSuffix: true,
                          locale: zhCN,
                        })}
                      </span>
                    </div>

                    <div className='mt-3'>
                      <Select
                        value={task.status}
                        onValueChange={(val) =>
                          handleStatusChange(task.id, val as TaskStatus)
                        }
                      >
                        <SelectTrigger className='h-7 text-xs w-full rounded-lg border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950'>
                          <SelectValue placeholder='状态' />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value='PENDING'>待办</SelectItem>
                          <SelectItem value='IN_PROGRESS'>进行中</SelectItem>
                          <SelectItem value='COMPLETED'>已完成</SelectItem>
                          <SelectItem value='FAILED'>失败</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </CardContent>
                </Card>
              ))}

              {columnTasks.length === 0 && (
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
  );
}
