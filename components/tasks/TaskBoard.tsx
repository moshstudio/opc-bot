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

const COLUMNS: { status: TaskStatus; label: string }[] = [
  { status: "PENDING", label: "待办" },
  { status: "IN_PROGRESS", label: "进行中" },
  { status: "COMPLETED", label: "已完成" },
];

export function TaskBoard({ initialTasks }: TaskBoardProps) {
  const [tasks, setTasks] = useState<Task[]>(initialTasks);

  useEffect(() => {
    setTasks(initialTasks);
  }, [initialTasks]);

  const handleStatusChange = async (taskId: string, newStatus: TaskStatus) => {
    // Optimistic update
    setTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, status: newStatus } : t)),
    );

    const result = await updateTaskStatus(taskId, newStatus);
    if (!result.success) {
      // Revert if failed
      setTasks(initialTasks);
      console.error("Failed to update status");
    }
  };

  return (
    <div className='grid grid-cols-1 md:grid-cols-3 gap-6 h-full overflow-hidden'>
      {COLUMNS.map((col) => (
        <div
          key={col.status}
          className='flex flex-col h-full'
        >
          <div className='flex items-center justify-between mb-4'>
            <h3 className='font-semibold text-lg'>{col.label}</h3>
            <Badge variant='secondary'>
              {tasks.filter((t) => t.status === col.status).length}
            </Badge>
          </div>

          <div className='flex-1 bg-muted/50 rounded-lg p-4 space-y-4 overflow-y-auto'>
            {tasks
              .filter((t) => t.status === col.status)
              .map((task) => (
                <Card
                  key={task.id}
                  className='bg-card hover:bg-accent/50 transition-colors'
                >
                  <CardHeader className='p-4 pb-2'>
                    <div className='flex justify-between items-start'>
                      <CardTitle className='text-base font-medium leading-none'>
                        {task.title}
                      </CardTitle>
                    </div>
                    {task.description && (
                      <CardDescription className='text-xs line-clamp-2 mt-1'>
                        {task.description}
                      </CardDescription>
                    )}
                  </CardHeader>
                  <CardContent className='p-4 pt-2'>
                    <div className='flex items-center justify-between mt-2 text-xs text-muted-foreground'>
                      <div className='flex items-center gap-2'>
                        {task.assignedTo ? (
                          <Badge
                            variant='outline'
                            className='text-[10px] h-5'
                          >
                            {task.assignedTo.name}
                          </Badge>
                        ) : (
                          <span className='opacity-50'>未分配</span>
                        )}
                      </div>
                      <span>
                        {formatDistanceToNow(new Date(task.createdAt), {
                          addSuffix: true,
                          locale: zhCN,
                        })}
                      </span>
                    </div>

                    <div className='mt-4'>
                      <Select
                        value={task.status}
                        onValueChange={(val) =>
                          handleStatusChange(task.id, val as TaskStatus)
                        }
                      >
                        <SelectTrigger className='h-7 text-xs w-full'>
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

            {tasks.filter((t) => t.status === col.status).length === 0 && (
              <div className='text-center py-8 text-muted-foreground text-sm opacity-50'>
                暂无任务
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
