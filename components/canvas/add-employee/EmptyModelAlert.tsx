import { AlertCircle, ArrowRight } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

interface EmptyModelAlertProps {
  onCancel: () => void;
}

export function EmptyModelAlert({ onCancel }: EmptyModelAlertProps) {
  return (
    <div className='flex flex-col items-center justify-center py-16 px-8 text-center space-y-6'>
      <div className='relative'>
        <div className='absolute inset-0 bg-amber-500/20 blur-xl rounded-full scale-150 animate-pulse' />
        <div className='relative w-20 h-20 bg-amber-100 dark:bg-amber-900/30 rounded-3xl flex items-center justify-center text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-800 shadow-inner'>
          <AlertCircle className='w-10 h-10' />
        </div>
      </div>

      <div className='space-y-2'>
        <h3 className='text-xl font-black text-slate-800 dark:text-slate-100'>
          找不到 AI 模型
        </h3>
        <p className='text-sm text-slate-500 dark:text-slate-400 max-w-[340px] mx-auto leading-relaxed'>
          招募 AI
          员工需要为其配置“驱动模型”。目前您的工作间似乎还没有添加任何模型，请先前往配置。
        </p>
      </div>

      <div className='flex items-center gap-3 mt-4'>
        <Button
          variant='ghost'
          className='rounded-xl px-6'
          onClick={onCancel}
        >
          取消
        </Button>
        <Button
          asChild
          className='rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 text-white shadow-xl shadow-amber-500/10 hover:shadow-amber-500/20 px-6 group'
          onClick={onCancel}
        >
          <Link
            href='/dashboard/models'
            className='flex items-center gap-2'
          >
            前往配置模型
            <ArrowRight className='h-4 w-4 transition-transform group-hover:translate-x-1' />
          </Link>
        </Button>
      </div>
    </div>
  );
}
