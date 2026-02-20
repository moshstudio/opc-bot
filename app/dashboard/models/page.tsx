"use client";

import { useModelContext } from "@/components/ModelContext";
import { ModelDialog } from "@/components/models/ModelDialog";
import { Button } from "@/components/ui/button";
import { Trash2, Cpu, Eye, EyeOff, Globe, Sparkles, Edit } from "lucide-react";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
  CardContent,
} from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";

export default function ModelsPage() {
  const { models, removeModel } = useModelContext();

  return (
    <div className='container mx-auto p-6 space-y-8 animate-in fade-in duration-500 max-w-7xl'>
      <div className='flex flex-col md:flex-row md:items-center justify-between gap-4'>
        <div>
          <h2 className='text-3xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-400 dark:to-indigo-400'>
            模型管理中心
          </h2>
          <p className='text-muted-foreground mt-2 text-lg'>
            配置和管理您的 AI 模型源。这些模型将赋能您的数字员工。
          </p>
        </div>
        <ModelDialog />
      </div>

      <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6'>
        {models.map((model) => (
          <Card
            key={model.id}
            className='group relative overflow-hidden transition-all duration-300 hover:shadow-2xl hover:-translate-y-1 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border-slate-200/50 dark:border-slate-800/50 rounded-2xl'
          >
            {/* Background decoration */}
            <div className='absolute -right-12 -top-12 w-24 h-24 bg-gradient-to-br from-blue-500/10 to-purple-500/10 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-500' />

            <div className='absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-all duration-300 translate-x-2 group-hover:translate-x-0 flex gap-1'>
              <ModelDialog
                model={model}
                trigger={
                  <Button
                    variant='ghost'
                    size='icon'
                    className='h-8 w-8 text-slate-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-xl transition-colors'
                  >
                    <Edit className='h-4 w-4' />
                  </Button>
                }
              />
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant='ghost'
                    size='icon'
                    className='h-8 w-8 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-colors'
                  >
                    <Trash2 className='h-4 w-4' />
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>确认删除？</AlertDialogTitle>
                    <AlertDialogDescription>
                      确定要删除这个模型吗？此操作不可逆。
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>取消</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={() => removeModel(model.id)}
                      className='bg-red-600 hover:bg-red-700 text-white'
                    >
                      确定删除
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>

            <CardHeader className='pb-3'>
              <div className='flex items-start gap-4'>
                <div className='p-3 rounded-2xl bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 text-blue-600 dark:text-blue-400 shadow-sm group-hover:shadow-md transition-shadow'>
                  {model.category === "embedding" ? (
                    <Sparkles className='h-6 w-6' />
                  ) : (
                    <Cpu className='h-6 w-6' />
                  )}
                </div>
                <div className='space-y-1'>
                  <div className='flex items-center gap-2'>
                    <CardTitle className='text-lg font-bold leading-tight'>
                      {model.name}
                    </CardTitle>
                    {model.category === "embedding" && model.isActive && (
                      <Badge className='bg-blue-500 hover:bg-blue-600 text-white border-0'>
                        默认
                      </Badge>
                    )}
                  </div>
                  <CardDescription className='flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-slate-500'>
                    <Badge
                      variant='outline'
                      className='text-[10px] py-0 h-4 border-slate-200'
                    >
                      {model.category === "chat" ? "聊天" : "嵌入"}
                    </Badge>
                    <span>{model.provider}</span>
                  </CardDescription>
                </div>
              </div>
            </CardHeader>

            <CardContent className='space-y-4'>
              <div className='flex items-center gap-2 p-2 rounded-lg bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800/50 text-xs font-mono text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 transition-colors'>
                <Globe className='h-3.5 w-3.5 flex-shrink-0' />
                <span
                  className='truncate'
                  title={model.baseUrl}
                >
                  {model.provider === "transformers"
                    ? "⚡ Local Model"
                    : model.baseUrl}
                </span>
              </div>

              <div className='flex items-center justify-between'>
                {model.category === "chat" ? (
                  <Badge
                    variant={model.supportsImages ? "default" : "secondary"}
                    className={`rounded-lg px-2.5 py-0.5 font-medium transition-colors ${
                      model.supportsImages
                        ? "bg-green-100 text-green-700 hover:bg-green-200 dark:bg-green-900/30 dark:text-green-400"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-400"
                    }`}
                  >
                    {model.supportsImages ? (
                      <div className='flex items-center gap-1.5'>
                        <Eye className='h-3.5 w-3.5' />
                        <span>视觉能力</span>
                      </div>
                    ) : (
                      <div className='flex items-center gap-1.5'>
                        <EyeOff className='h-3.5 w-3.5' />
                        <span>仅文本</span>
                      </div>
                    )}
                  </Badge>
                ) : (
                  <Badge className='bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400'>
                    向量模型
                  </Badge>
                )}
                {model.provider === "transformers" ? (
                  <span className='text-[10px] bg-green-50 dark:bg-green-900/20 px-2 py-1 rounded-full text-green-600 border border-green-100 dark:border-green-800/50'>
                    LOCAL
                  </span>
                ) : model.apiKey ? (
                  <span className='text-[10px] bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded-full text-slate-500 border border-slate-200 dark:border-slate-700'>
                    KEY SET
                  </span>
                ) : (
                  <span className='text-[10px] bg-amber-50 dark:bg-amber-900/20 px-2 py-1 rounded-full text-amber-600 border border-amber-100 dark:border-amber-800/50'>
                    NO KEY
                  </span>
                )}
              </div>
            </CardContent>
          </Card>
        ))}

        {models.length === 0 && (
          <div className='col-span-full py-16 flex flex-col items-center justify-center text-center border-2 border-dashed rounded-3xl border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50'>
            <div className='w-16 h-16 mb-4 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center'>
              <Cpu className='w-8 h-8 text-slate-400' />
            </div>
            <h3 className='text-lg font-semibold text-slate-900 dark:text-slate-200'>
              还没有配置模型
            </h3>
            <p className='text-muted-foreground max-w-sm mt-2 mb-6'>
              添加您的第一个 AI 模型提供商，开始构建您的数字化团队。
            </p>
            <ModelDialog />
          </div>
        )}
      </div>
    </div>
  );
}
