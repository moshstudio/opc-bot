"use client";

import { useEffect, useState } from "react";
import { format } from "date-fns";
import { zhCN } from "date-fns/locale";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { getEmployeeLogs } from "@/app/actions/employee-actions";
import {
  Loader2,
  AlertCircle,
  CheckCircle2,
  Info,
  Activity,
} from "lucide-react";

interface EmployeeLog {
  id: string;
  type: string;
  title: string;
  content: string;
  level: string;
  createdAt: Date;
  metadata: string | null;
}

interface EmployeeLogPanelProps {
  employeeId: string;
}

export function EmployeeLogPanel({ employeeId }: EmployeeLogPanelProps) {
  const [logs, setLogs] = useState<EmployeeLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchLogs(isInitial = false) {
      if (!isInitial) setLoading(true);
      try {
        const result = await getEmployeeLogs(employeeId);
        if (result.success) {
          setLogs(result.logs as any);
        } else {
          setError(result.error || "获取日志失败");
        }
      } finally {
        setLoading(false);
      }
    }

    fetchLogs(true);

    // 每 10 秒刷新一次日志
    const timer = setInterval(() => fetchLogs(false), 10000);
    return () => clearInterval(timer);
  }, [employeeId]);

  const getLevelIcon = (level: string) => {
    switch (level) {
      case "success":
        return <CheckCircle2 className='w-4 h-4 text-green-500' />;
      case "error":
        return <AlertCircle className='w-4 h-4 text-destructive' />;
      case "warning":
        return <AlertCircle className='w-4 h-4 text-yellow-500' />;
      case "info":
      default:
        return <Info className='w-4 h-4 text-blue-500' />;
    }
  };

  const getLevelBadge = (level: string) => {
    switch (level) {
      case "success":
        return (
          <Badge className='bg-green-500/10 text-green-500 hover:bg-green-500/20 border-green-500/20'>
            成功
          </Badge>
        );
      case "error":
        return (
          <Badge
            variant='destructive'
            className='bg-destructive/10 text-destructive border-destructive/20'
          >
            错误
          </Badge>
        );
      case "warning":
        return (
          <Badge className='bg-yellow-500/10 text-yellow-500 hover:bg-yellow-500/20 border-yellow-500/20'>
            警告
          </Badge>
        );
      default:
        return <Badge variant='outline'>信息</Badge>;
    }
  };

  if (loading && logs.length === 0) {
    return (
      <div className='flex flex-col items-center justify-center h-full text-muted-foreground gap-2'>
        <Loader2 className='w-6 h-6 animate-spin' />
        <p className='text-sm'>加载日志中...</p>
      </div>
    );
  }

  if (error && logs.length === 0) {
    return (
      <div className='flex flex-col items-center justify-center h-full text-destructive gap-2'>
        <AlertCircle className='w-6 h-6' />
        <p className='text-sm'>{error}</p>
      </div>
    );
  }

  if (logs.length === 0) {
    return (
      <div className='flex flex-col items-center justify-center h-full text-muted-foreground gap-2'>
        <Activity className='w-6 h-6 opacity-20' />
        <p className='text-sm'>暂无日志记录</p>
      </div>
    );
  }

  return (
    <ScrollArea className='h-full pr-4'>
      <div className='space-y-4'>
        {logs.map((log) => (
          <div
            key={log.id}
            className='flex flex-col gap-1.5 p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors'
          >
            <div className='flex items-center justify-between gap-2'>
              <div className='flex items-center gap-2'>
                {getLevelIcon(log.level)}
                <span className='font-medium text-sm'>{log.title}</span>
              </div>
              <span className='text-[10px] text-muted-foreground whitespace-nowrap'>
                {format(new Date(log.createdAt), "HH:mm:ss", { locale: zhCN })}
              </span>
            </div>

            <p className='text-xs text-muted-foreground whitespace-pre-wrap leading-relaxed'>
              {log.content}
            </p>

            <div className='flex items-center justify-between mt-1'>
              <div className='flex gap-2'>
                {getLevelBadge(log.level)}
                <Badge
                  variant='secondary'
                  className='text-[10px] h-4 px-1.5 uppercase'
                >
                  {log.type.replace("_", " ")}
                </Badge>
              </div>
              <span className='text-[10px] text-muted-foreground'>
                {format(new Date(log.createdAt), "yyyy-MM-dd", {
                  locale: zhCN,
                })}
              </span>
            </div>
          </div>
        ))}
      </div>
    </ScrollArea>
  );
}
