"use client";

import { useState } from "react";
import useSWR from "swr";
import { format } from "date-fns";
import { zhCN } from "date-fns/locale";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  getEmployeeLogs,
  deleteEmployeeLog,
  deleteEmployeeLogsBefore,
  clearEmployeeLogs,
} from "@/app/actions/employee-actions";
import {
  Loader2,
  AlertCircle,
  CheckCircle2,
  Info,
  Activity,
  Trash2,
  MoreVertical,
  History,
  Eraser,
  AlertTriangle,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface EmployeeLog {
  id: string;
  type: string;
  title: string;
  content: string;
  level: string;
  createdAt: string | Date; // Adjusting to handle both from DB/API
  metadata: string | null;
}

interface EmployeeLogPanelProps {
  employeeId: string;
}

export function EmployeeLogPanel({ employeeId }: EmployeeLogPanelProps) {
  // 使用 SWR 获取日志，每 10 秒刷新一次，窗口聚焦时自动刷新
  const {
    data,
    error: swrError,
    isLoading,
    mutate,
  } = useSWR(
    employeeId ? ["employee-logs", employeeId] : null,
    async () => {
      const result = await getEmployeeLogs(employeeId);
      if (result.success) return result as any;
      throw new Error(result.error || "获取日志失败");
    },
    {
      refreshInterval: 3000,
      revalidateOnFocus: true,
    },
  );

  const logs = (data?.logs as EmployeeLog[]) || [];
  const error = swrError?.message || null;

  // Confirmation states
  const [confirmClearOpen, setConfirmClearOpen] = useState(false);
  const [confirmDeleteBeforeOpen, setConfirmDeleteBeforeOpen] = useState(false);
  const [selectedLogForDeleteBefore, setSelectedLogForDeleteBefore] =
    useState<EmployeeLog | null>(null);

  const handleDeleteLog = async (logId: string) => {
    // 乐观更新：在服务器响应前更新本地数据
    mutate(
      {
        ...data!,
        logs: logs.filter((l) => l.id !== logId) as any,
      },
      false, // 不立即重新拉取，等请求完成后由 SWR 处理
    );

    const result = await deleteEmployeeLog(logId);
    if (!result.success) {
      // 如果失败，回滚数据
      mutate();
    }
  };

  const handleDeleteBefore = async () => {
    if (!selectedLogForDeleteBefore) return;

    const threshold = new Date(selectedLogForDeleteBefore.createdAt);

    // 乐观更新
    mutate(
      {
        ...data!,
        logs: logs.filter((l) => new Date(l.createdAt) >= threshold) as any,
      },
      false,
    );

    const result = await deleteEmployeeLogsBefore(employeeId, threshold);
    if (result.success) {
      setConfirmDeleteBeforeOpen(false);
      setSelectedLogForDeleteBefore(null);
    } else {
      // 失败回滚
      mutate();
    }
  };

  const handleClearAll = async () => {
    // 乐观更新
    mutate(
      {
        ...data!,
        logs: [],
      },
      false,
    );

    const result = await clearEmployeeLogs(employeeId);
    if (result.success) {
      setConfirmClearOpen(false);
    } else {
      // 失败回滚
      mutate();
    }
  };

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

  if (isLoading && logs.length === 0) {
    return (
      <div className='flex flex-col items-center justify-center h-full text-muted-foreground gap-2'>
        <Loader2 className='w-6 h-6 animate-spin' />
        <p className='text-sm'>加载日志中...</p>
      </div>
    );
  }

  return (
    <div className='flex flex-col h-full'>
      <div className='flex items-center justify-between mb-4'>
        <h3 className='text-sm font-medium flex items-center gap-2'>
          <Activity className='w-4 h-4 opacity-70' />
          执行日志
        </h3>
        {logs.length > 0 && (
          <Button
            variant='ghost'
            size='sm'
            className='h-8 text-xs text-muted-foreground hover:text-destructive gap-1.5'
            onClick={() => setConfirmClearOpen(true)}
          >
            <Eraser className='w-3.5 h-3.5' />
            清空日志
          </Button>
        )}
      </div>

      <ScrollArea className='flex-1 min-h-0'>
        {error && logs.length === 0 ? (
          <div className='flex flex-col items-center justify-center h-full text-destructive gap-2'>
            <AlertCircle className='w-6 h-6' />
            <p className='text-sm'>{error}</p>
          </div>
        ) : logs.length === 0 ? (
          <div className='flex flex-col items-center justify-center py-12 text-muted-foreground gap-2'>
            <Activity className='w-6 h-6 opacity-20' />
            <p className='text-sm'>暂无日志记录</p>
          </div>
        ) : (
          <div className='space-y-4 pb-4 pr-4'>
            {logs.map((log) => (
              <div
                key={log.id}
                className='group relative flex flex-col gap-1.5 p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors'
              >
                <div className='flex items-center justify-between gap-2'>
                  <div className='flex items-center gap-2 overflow-hidden'>
                    {getLevelIcon(log.level)}
                    <span className='font-medium text-sm truncate'>
                      {log.title}
                    </span>
                  </div>
                  <div className='flex items-center gap-2 flex-shrink-0'>
                    <span className='text-[10px] text-muted-foreground whitespace-nowrap'>
                      {format(new Date(log.createdAt), "HH:mm:ss", {
                        locale: zhCN,
                      })}
                    </span>

                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant='ghost'
                          size='icon'
                          className='h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity'
                        >
                          <MoreVertical className='h-3 w-3' />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent
                        align='end'
                        className='w-40'
                      >
                        <DropdownMenuItem
                          className='text-xs'
                          onClick={() => handleDeleteLog(log.id)}
                        >
                          <Trash2 className='w-3.5 h-3.5 mr-2 text-destructive' />
                          删除此条
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className='text-xs'
                          onClick={() => {
                            setSelectedLogForDeleteBefore(log);
                            setConfirmDeleteBeforeOpen(true);
                          }}
                        >
                          <History className='w-3.5 h-3.5 mr-2' />
                          删除之前所有
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>

                <p className='text-xs text-muted-foreground whitespace-pre-wrap leading-relaxed break-words'>
                  {log.content}
                </p>

                <div className='flex items-center justify-between mt-1'>
                  <div className='flex gap-2 items-center'>
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
        )}
      </ScrollArea>

      {/* Confirmation Dialogs */}
      <Dialog
        open={confirmClearOpen}
        onOpenChange={setConfirmClearOpen}
      >
        <DialogContent className='sm:max-w-[425px]'>
          <DialogHeader>
            <DialogTitle className='flex items-center gap-2'>
              <AlertTriangle className='w-5 h-5 text-destructive' />
              确认清空日志
            </DialogTitle>
            <DialogDescription
              className='py-4'
              asChild
            >
              <div>
                此操作将永久删除该员工的所有执行日志。
                <div className='mt-2 font-semibold text-destructive'>
                  操作不可撤销，请谨慎操作。
                </div>
              </div>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className='gap-2 sm:gap-0'>
            <Button
              variant='ghost'
              onClick={() => setConfirmClearOpen(false)}
            >
              取消
            </Button>
            <Button
              variant='destructive'
              onClick={handleClearAll}
            >
              确定清空
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={confirmDeleteBeforeOpen}
        onOpenChange={setConfirmDeleteBeforeOpen}
      >
        <DialogContent className='sm:max-w-[425px]'>
          <DialogHeader>
            <DialogTitle className='flex items-center gap-2'>
              <History className='w-5 h-5 text-destructive' />
              确认删除历史日志
            </DialogTitle>
            <DialogDescription
              className='py-4'
              asChild
            >
              <div>
                此操作将删除{" "}
                <span className='font-semibold'>
                  {selectedLogForDeleteBefore &&
                    format(
                      new Date(selectedLogForDeleteBefore.createdAt),
                      "yyyy-MM-dd HH:mm:ss",
                      { locale: zhCN },
                    )}
                </span>{" "}
                之前的所有执行记录。
                <div className='mt-2 font-semibold text-destructive'>
                  删除后无法恢复。
                </div>
              </div>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className='gap-2 sm:gap-0'>
            <Button
              variant='ghost'
              onClick={() => {
                setConfirmDeleteBeforeOpen(false);
                setSelectedLogForDeleteBefore(null);
              }}
            >
              取消
            </Button>
            <Button
              variant='destructive'
              onClick={handleDeleteBefore}
            >
              确定删除
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
