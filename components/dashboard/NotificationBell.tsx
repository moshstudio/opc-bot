"use client";

import { useState, useEffect, useRef } from "react";
import useSWR from "swr";
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { zhCN } from "date-fns/locale";

export function NotificationBell() {
  const [shouldAnimate, setShouldAnimate] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [open, setOpen] = useState(false);
  const [selectedNotification, setSelectedNotification] = useState<any>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  // 使用 SWR 获取通知，每 60 秒自动更新，且在窗口聚焦时自动刷新
  const { data, mutate, isLoading } = useSWR(
    "my-notifications",
    async () => {
      const res = await getMyNotifications({ limit: 20 });
      if (res.success) return res;
      throw new Error(res.error);
    },
    {
      refreshInterval: 60000,
      revalidateOnFocus: true,
    },
  );

  const notifications = data?.notifications || [];
  const unreadCount = data?.unreadCount || 0;
  const prevCountRef = useRef(unreadCount);

  // 监听未读数变化，触发动画（仅在增加时触发）
  useEffect(() => {
    if (unreadCount > prevCountRef.current) {
      const timer = setTimeout(() => {
        setShouldAnimate(true);
        setTimeout(() => setShouldAnimate(false), 1000);
      }, 0);
      prevCountRef.current = unreadCount;
      return () => clearTimeout(timer);
    }
    prevCountRef.current = unreadCount;
  }, [unreadCount]);

  const handleRead = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const res = await readNotification(id);
    if (res.success) {
      // 乐观更新：在服务器返回前先更新本地数据
      mutate(
        {
          ...data!,
          unreadCount: Math.max(0, unreadCount - 1),
          notifications: notifications.map((n) =>
            n.id === id ? { ...n, isRead: true } : n,
          ),
        },
        false, // 不立即重新请求
      );
    }
  };

  const handleReadAll = async () => {
    const res = await readAllNotifications();
    if (res.success) {
      mutate(
        {
          ...data!,
          unreadCount: 0,
          notifications: notifications.map((n) => ({ ...n, isRead: true })),
        },
        false,
      );
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
        mutate(); // 触发刷新
      } else {
        toast.info("一切正常，暂无新变动需要分析。");
      }
    } else {
      toast.error(`分析失败: ${res.error}`);
    }
    setAnalyzing(false);
  };

  const handleNotificationClick = async (n: any) => {
    setSelectedNotification(n);
    setDetailOpen(true);
    if (!n.isRead) {
      const res = await readNotification(n.id);
      if (res.success) {
        mutate(
          {
            ...data!,
            unreadCount: Math.max(0, unreadCount - 1),
            notifications: notifications.map((item) =>
              item.id === n.id ? { ...item, isRead: true } : item,
            ),
          },
          false,
        );
      }
    }
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
    <>
      <style
        jsx
        global
      >{`
        @keyframes ring {
          0% {
            transform: rotate(0);
          }
          15% {
            transform: rotate(15deg);
          }
          30% {
            transform: rotate(-15deg);
          }
          45% {
            transform: rotate(10deg);
          }
          60% {
            transform: rotate(-10deg);
          }
          75% {
            transform: rotate(5deg);
          }
          85% {
            transform: rotate(-5deg);
          }
          100% {
            transform: rotate(0);
          }
        }
      `}</style>
      <Popover
        open={open}
        onOpenChange={setOpen}
      >
        <PopoverTrigger asChild>
          <Button
            variant='ghost'
            size='icon'
            className={`relative h-9 w-9 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-all ${shouldAnimate ? "animate-[ring_0.5s_ease-in-out]" : ""}`}
          >
            <Bell
              className={`h-[1.1rem] w-[1.1rem] text-slate-600 dark:text-slate-400 ${shouldAnimate ? "text-violet-500" : ""}`}
            />
            {unreadCount > 0 && (
              <span
                className={`absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-[9px] font-bold text-white border-2 border-white dark:border-slate-900 flex items-center justify-center leading-none transition-transform duration-300 ${shouldAnimate ? "scale-125 shadow-[0_0_12px_rgba(239,68,68,0.5)]" : "scale-100"}`}
              >
                {unreadCount > 99 ? "99+" : unreadCount}
              </span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent
          className='w-80 p-0 overflow-hidden border-slate-200/60 dark:border-slate-800/60 shadow-2xl rounded-2xl bg-white/95 dark:bg-slate-950/95 backdrop-blur-xl'
          align='end'
          sideOffset={8}
        >
          <div className='flex items-center justify-between p-4 border-b border-slate-100 dark:border-slate-800'>
            <h3 className='font-bold text-sm tracking-tight text-slate-900 dark:text-slate-100 flex items-center gap-2'>
              通知中心
              {unreadCount > 0 && (
                <span className='inline-flex items-center justify-center bg-red-500 text-white text-[10px] font-bold px-1.5 min-w-[18px] h-[18px] rounded-full leading-none'>
                  {unreadCount}
                </span>
              )}
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
            {isLoading && notifications.length === 0 ? (
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
                    onClick={() => handleNotificationClick(n)}
                    className={`p-4 hover:bg-slate-50 dark:hover:bg-slate-900 transition-all group relative cursor-pointer ${!n.isRead ? "bg-violet-50/40 dark:bg-violet-900/10 border-l-[3px] border-violet-500" : "border-l-[3px] border-transparent opacity-70"}`}
                  >
                    <div className='flex gap-3'>
                      {!n.isRead && (
                        <div className='absolute top-4 right-4'>
                          <span className='h-2 w-2 rounded-full bg-violet-500 shadow-[0_0_8px_rgba(139,92,246,0.5)]' />
                        </div>
                      )}
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
                              className='text-[10px] font-medium text-violet-600 dark:text-violet-400 hover:underline opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1'
                            >
                              <Check className='w-3 h-3' />
                              标记已读
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

      <Dialog
        open={detailOpen}
        onOpenChange={setDetailOpen}
      >
        <DialogContent className='max-w-md rounded-2xl'>
          <DialogHeader>
            <div className='flex items-center gap-2 mb-2'>
              {selectedNotification && getIcon(selectedNotification.type)}
              <DialogTitle className='text-base font-bold'>
                {selectedNotification?.title}
              </DialogTitle>
            </div>
            <DialogDescription className='text-[11px] text-slate-400'>
              {selectedNotification &&
                formatDistanceToNow(new Date(selectedNotification.createdAt), {
                  addSuffix: true,
                  locale: zhCN,
                })}
            </DialogDescription>
          </DialogHeader>
          <div className='py-4'>
            <div className='bg-slate-50 dark:bg-slate-900/50 p-4 rounded-xl border border-slate-100 dark:border-slate-800'>
              <p className='text-sm text-slate-600 dark:text-slate-300 whitespace-pre-wrap leading-relaxed'>
                {selectedNotification?.content}
              </p>
            </div>
            {selectedNotification?.source === "ivy" && (
              <div className='mt-4 p-3 bg-violet-50/50 dark:bg-violet-900/20 rounded-xl flex items-start gap-3 border border-violet-100 dark:border-violet-800/50'>
                <Sparkles className='w-4 h-4 text-violet-500 mt-0.5' />
                <p className='text-[11px] text-violet-600 dark:text-violet-400 font-medium'>
                  此摘要由 AI 助理 Ivy
                  根据历史动态生成，帮助您快速掌握业务变化。
                </p>
              </div>
            )}
          </div>
          <div className='flex justify-end'>
            <Button
              className='rounded-xl'
              onClick={() => setDetailOpen(false)}
            >
              关闭
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
