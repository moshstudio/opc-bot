"use client";

import { useState } from "react";
import useSWR from "swr";
import { checkCurrentCompanyStatus } from "@/app/actions/company-actions";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { AlertTriangle, ChevronRight } from "lucide-react";
import Link from "next/link";
import { clsx } from "clsx";

export function SystemStatusIndicator() {
  const [open, setOpen] = useState(false);

  const { data, isLoading } = useSWR(
    "system-status",
    async () => {
      const res = await checkCurrentCompanyStatus();
      if (res.success) return res;
      throw new Error("Failed to check status");
    },
    {
      refreshInterval: (data) => {
        if (!data) return 3000;
        const isNormal =
          data.status === "normal" &&
          (!data.messages || data.messages.length === 0);
        return isNormal ? 0 : 3000;
      },
      revalidateOnFocus: true,
    },
  );

  const status = data?.status || "normal";
  const messages = data?.messages || [];

  if (isLoading) {
    return (
      <div className='flex items-center gap-2 cursor-pointer opacity-70'>
        <div className='w-2 h-2 rounded-full bg-slate-400 animate-pulse' />
        <span className='text-[11px] text-slate-500 dark:text-slate-400 font-medium select-none'>
          检测中...
        </span>
      </div>
    );
  }

  const isNormal = status === "normal" && messages.length === 0;

  return (
    <Popover
      open={open}
      onOpenChange={setOpen}
    >
      <PopoverTrigger asChild>
        <div className='flex items-center gap-2 cursor-pointer hover:opacity-80 transition-opacity'>
          <div
            className={clsx(
              "w-2 h-2 rounded-full animate-pulse",
              isNormal
                ? "bg-green-500"
                : status === "error"
                  ? "bg-red-500"
                  : "bg-amber-500",
            )}
            title={isNormal ? "系统正常" : "待配置"}
          />
          <span
            className={clsx(
              "text-[11px] font-medium select-none",
              isNormal
                ? "text-slate-500 dark:text-slate-400"
                : status === "error"
                  ? "text-red-600 dark:text-red-500"
                  : "text-amber-600 dark:text-amber-500",
            )}
          >
            {isNormal ? "系统正常" : "待配置 (" + messages.length + ")"}
          </span>
        </div>
      </PopoverTrigger>
      {!isNormal && (
        <PopoverContent
          className='w-80 p-0 overflow-hidden border-slate-200/60 dark:border-amber-900/40 shadow-xl rounded-2xl bg-white/95 dark:bg-slate-950/95 backdrop-blur-xl'
          align='end'
          sideOffset={8}
        >
          <div className='flex items-center gap-2 p-4 border-b border-slate-100 dark:border-slate-800 bg-amber-50/50 dark:bg-amber-500/10'>
            <AlertTriangle className='w-4 h-4 text-amber-500' />
            <h3 className='font-bold text-sm tracking-tight text-amber-900 dark:text-amber-400'>
              系统配置建议
            </h3>
          </div>
          <div className='p-2 space-y-1'>
            {messages.map((msg: any, i: number) => (
              <div
                key={i}
                className='group flex flex-col p-3 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-colors'
              >
                <div className='flex items-start gap-3'>
                  <div className='mt-0.5'>
                    {msg.type === "error" ? (
                      <div className='w-2 h-2 rounded-full bg-red-500 mt-1 shadow-[0_0_8px_rgba(239,68,68,0.5)]' />
                    ) : (
                      <div className='w-2 h-2 rounded-full bg-amber-500 mt-1 shadow-[0_0_8px_rgba(245,158,11,0.5)]' />
                    )}
                  </div>
                  <div className='flex-1 space-y-1'>
                    <p className='text-xs font-medium text-slate-700 dark:text-slate-300 leading-relaxed'>
                      {msg.message}
                    </p>
                    {msg.actionLink && (
                      <Link
                        href={msg.actionLink}
                        onClick={() => setOpen(false)}
                        className='inline-flex items-center gap-1 text-[11px] font-semibold text-violet-600 hover:text-violet-700 dark:text-violet-400 dark:hover:text-violet-300 transition-colors mt-1'
                      >
                        {msg.actionText || "前往配置"}
                        <ChevronRight className='w-3 h-3 group-hover:translate-x-0.5 transition-transform' />
                      </Link>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </PopoverContent>
      )}
    </Popover>
  );
}
