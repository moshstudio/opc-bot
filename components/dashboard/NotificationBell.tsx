"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Bell,
  Check,
  Info,
  AlertTriangle,
  XCircle,
  Sparkles,
  Loader2,
  RefreshCw,
} from "lucide-react";
import {
  getMyNotifications,
  readNotification,
  readAllNotifications,
  triggerIvyAnalysis,
} from "@/app/actions/notification-actions";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { zhCN } from "date-fns/locale";

export function NotificationBell() {
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [open, setOpen] = useState(false);

  const fetchNotifications = useCallback(async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    try {
      const res = await getMyNotifications({ limit: 20 });
      if (res.success) {
        setNotifications(res.notifications || []);
        setUnreadCount(res.unreadCount || 0);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchNotifications(true);
    // 每 1 分钟轮询一次
    const timer = setInterval(() => fetchNotifications(true), 60000);
    return () => clearInterval(timer);
  }, [fetchNotifications]);

  const handleRead = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const res = await readNotification(id);
    if (res.success) {
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, isRead: true } : n)),
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    }
  };

  const handleReadAll = async () => {
    const res = await readAllNotifications();
    if (res.success) {
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setUnreadCount(0);
      toast.success("已标记所有通知为已读");
    }
  };

  const handleTriggerIvy = async () => {
    if (analyzing) return;
    setAnalyzing(true);
    toast.info("艾薇 (Ivy) 正在扫描动态并生成总结...");

    const res = await triggerIvyAnalysis();
    if (res.success) {
      if (res.processedCount > 0) {
        toast.success(
          `分析完成！艾薇处理了 ${res.processedCount} 条日志，生成了 ${res.notificationCount} 条新通知。`,
        );
        fetchNotifications();
      } else {
        toast.info("一切正常，暂无新变动需要分析。");
      }
    } else {
      toast.error(`分析失败: ${res.error}`);
    }
    setAnalyzing(false);
  };

  const getIcon = (type: string) => {
    switch (type) {
      case "error":
        return <XCircle className='w-4 h-4 text-red-500' />;
      case "warning":
        return <AlertTriangle className='w-4 h-4 text-amber-500' />;
      case "success":
        return <Check className='w-4 h-4 text-emerald-500' />;
      case "summary":
        return <Sparkles className='w-4 h-4 text-violet-500' />;
      default:
        return <Info className='w-4 h-4 text-blue-500' />;
    }
  };

  return (
    <Popover
      open={open}
      onOpenChange={setOpen}
    >
      <PopoverTrigger asChild>
        <Button
          variant='ghost'
          size='icon'
          className='relative h-9 w-9 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-all'
        >
          <Bell className='h-[1.1rem] w-[1.1rem] text-slate-600 dark:text-slate-400' />
          {unreadCount > 0 && (
            <span className='absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-red-500 border-2 border-white dark:border-slate-900 animate-pulse' />
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className='w-80 p-0 overflow-hidden border-slate-200/60 dark:border-slate-800/60 shadow-2xl rounded-2xl bg-white/95 dark:bg-slate-950/95 backdrop-blur-xl'
        align='end'
        sideOffset={8}
      >
        <div className='flex items-center justify-between p-4 border-b border-slate-100 dark:border-slate-800'>
          <h3 className='font-bold text-sm tracking-tight text-slate-900 dark:text-slate-100'>
            通知中心
          </h3>
          <div className='flex items-center gap-1'>
            <Button
              variant='ghost'
              size='icon'
              className='h-7 w-7 rounded-lg'
              onClick={handleTriggerIvy}
              disabled={analyzing}
            >
              {analyzing ? (
                <Loader2 className='h-3.5 w-3.5 animate-spin' />
              ) : (
                <RefreshCw className='h-3.5 w-3.5' />
              )}
            </Button>
            {unreadCount > 0 && (
              <Button
                variant='ghost'
                className='text-[11px] h-7 px-2 font-medium text-violet-600 hover:text-violet-700 hover:bg-violet-50 dark:text-violet-400 dark:hover:bg-violet-900/20 rounded-lg'
                onClick={handleReadAll}
              >
                全部已读
              </Button>
            )}
          </div>
        </div>

        <ScrollArea className='h-[380px]'>
          {loading && notifications.length === 0 ? (
            <div className='p-10 text-center space-y-3'>
              <Loader2 className='w-8 h-8 text-violet-500 animate-spin mx-auto opacity-50' />
              <p className='text-[11px] text-slate-400'>正在同步动态...</p>
            </div>
          ) : notifications.length === 0 ? (
            <div className='p-10 text-center space-y-3'>
              <div className='w-10 h-10 bg-slate-50 dark:bg-slate-900 rounded-2xl flex items-center justify-center mx-auto'>
                <Bell className='w-5 h-5 text-slate-300 dark:text-slate-700' />
              </div>
              <p className='text-[11px] text-slate-400'>暂无通知</p>
            </div>
          ) : (
            <div className='divide-y divide-slate-50 dark:divide-slate-900'>
              {notifications.map((n) => (
                <div
                  key={n.id}
                  className={`p-4 hover:bg-slate-50/50 dark:hover:bg-slate-900/50 transition-colors group relative cursor-default ${!n.isRead ? "bg-violet-50/20 dark:bg-violet-900/5" : ""}`}
                >
                  <div className='flex gap-3'>
                    <div className='mt-0.5'>{getIcon(n.type)}</div>
                    <div className='flex-1 space-y-1'>
                      <div className='flex items-start justify-between gap-2'>
                        <p
                          className={`text-xs font-semibold leading-none ${!n.isRead ? "text-slate-900 dark:text-slate-100" : "text-slate-600 dark:text-slate-400"}`}
                        >
                          {n.title}
                        </p>
                        {!n.isRead && (
                          <button
                            onClick={(e) => handleRead(n.id, e)}
                            className='text-[10px] text-violet-500 hover:text-violet-600 opacity-0 group-hover:opacity-100 transition-opacity'
                          >
                            已读
                          </button>
                        )}
                      </div>
                      <p className='text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed'>
                        {n.content}
                      </p>
                      <div className='flex items-center justify-between pt-1'>
                        <p className='text-[9px] text-slate-400 uppercase tracking-wider'>
                          {formatDistanceToNow(new Date(n.createdAt), {
                            addSuffix: true,
                            locale: zhCN,
                          })}
                        </p>
                        {n.source === "ivy" && (
                          <Badge
                            variant='outline'
                            className='h-4 px-1 text-[8px] border-violet-200 dark:border-violet-800 text-violet-600 dark:text-violet-400 bg-violet-50/50 dark:bg-violet-950/50'
                          >
                            艾薇助理
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>

        <div className='p-3 border-t border-slate-100 dark:border-slate-800 bg-slate-50/30 dark:bg-slate-900/30 flex items-center justify-center'>
          <p className='text-[10px] text-slate-400 flex items-center gap-1.5 font-medium'>
            <Sparkles className='w-2.5 h-2.5 text-violet-400' />
            AI 助理 Ivy 正在全天候监控您的业务日志
          </p>
        </div>
      </PopoverContent>
    </Popover>
  );
}
