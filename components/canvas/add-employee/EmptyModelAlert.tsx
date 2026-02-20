import { AlertTriangle } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

interface EmptyModelAlertProps {
  onCancel: () => void;
}

export function EmptyModelAlert({ onCancel }: EmptyModelAlertProps) {
  return (
    <div className='flex flex-col items-center justify-center py-10 px-6 text-center space-y-4'>
      <div className='p-3 bg-amber-100 dark:bg-amber-900/20 rounded-full text-amber-600 dark:text-amber-400'>
        <AlertTriangle className='w-8 h-8' />
      </div>
      <div className='space-y-2'>
        <h3 className='font-semibold text-lg'>还没有可用的 AI 模型</h3>
        <p className='text-sm text-muted-foreground max-w-[300px] mx-auto'>
          在创建员工之前，您需要先配置至少一个 AI 模型。
        </p>
      </div>
      <Button
        asChild
        className='mt-4 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-md'
        onClick={onCancel}
      >
        <Link href='/dashboard/models'>前往模型管理</Link>
      </Button>
    </div>
  );
}
