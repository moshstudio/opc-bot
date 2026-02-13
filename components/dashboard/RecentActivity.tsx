import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Clock, Activity } from "lucide-react";

interface Task {
  id: string;
  title: string;
  status: string;
  updatedAt: Date;
  assignedTo?: {
    name: string;
  } | null;
}

interface RecentActivityProps {
  tasks: Task[];
}

const statusMap: Record<string, { label: string; className: string }> = {
  PENDING: {
    label: "待办",
    className:
      "bg-amber-50 text-amber-600 border-amber-200 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-800/50",
  },
  IN_PROGRESS: {
    label: "进行中",
    className:
      "bg-blue-50 text-blue-600 border-blue-200 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800/50",
  },
  COMPLETED: {
    label: "已完成",
    className:
      "bg-green-50 text-green-600 border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800/50",
  },
  FAILED: {
    label: "失败",
    className:
      "bg-red-50 text-red-600 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800/50",
  },
};

export function RecentActivity({ tasks }: RecentActivityProps) {
  return (
    <Card className='col-span-4 border-0 shadow-sm bg-white dark:bg-slate-900 rounded-2xl'>
      <CardHeader className='pb-4'>
        <div className='flex items-center gap-2'>
          <div className='p-1.5 rounded-lg bg-violet-100 dark:bg-violet-900/20'>
            <Activity className='h-4 w-4 text-violet-600 dark:text-violet-400' />
          </div>
          <CardTitle className='text-base font-semibold'>近期活动</CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        <div className='space-y-1'>
          {tasks.length === 0 ? (
            <div className='flex flex-col items-center justify-center py-12 text-center'>
              <div className='w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-3'>
                <Clock className='w-5 h-5 text-slate-400' />
              </div>
              <p className='text-sm text-muted-foreground'>暂无近期活动</p>
            </div>
          ) : (
            tasks.map((task) => {
              const status = statusMap[task.status] || statusMap.PENDING;
              return (
                <div
                  key={task.id}
                  className='flex items-center gap-3 p-3 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors group'
                >
                  <Avatar className='h-8 w-8 rounded-lg bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-700'>
                    <AvatarFallback className='rounded-lg text-xs font-semibold bg-transparent text-slate-600 dark:text-slate-300'>
                      {task.assignedTo?.name?.[0] || "?"}
                    </AvatarFallback>
                  </Avatar>
                  <div className='flex-1 min-w-0'>
                    <p className='text-sm font-medium text-slate-900 dark:text-slate-100 truncate'>
                      {task.title}
                    </p>
                    <p className='text-[11px] text-slate-500 dark:text-slate-400'>
                      {task.assignedTo
                        ? `分配给 ${task.assignedTo.name}`
                        : "未分配"}
                    </p>
                  </div>
                  <div className='flex items-center gap-2 flex-shrink-0'>
                    <Badge
                      variant='outline'
                      className={`text-[10px] font-medium rounded-md px-1.5 py-0 h-5 ${status.className}`}
                    >
                      {status.label}
                    </Badge>
                    <span className='text-[10px] text-slate-400 dark:text-slate-500 w-16 text-right'>
                      {new Date(task.updatedAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </CardContent>
    </Card>
  );
}
