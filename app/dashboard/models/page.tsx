"use client";

import { useModelContext } from "@/components/ModelContext";
import { ModelDialog } from "@/components/models/ModelDialog";
import { Button } from "@/components/ui/button";
import {
  Trash2,
  Cpu,
  Eye,
  EyeOff,
  Globe,
  Sparkles,
  Edit,
  Search,
  Key,
  Plus,
} from "lucide-react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardFooter,
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
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useState, useMemo } from "react";

export default function ModelsPage() {
  const { models, removeModel } = useModelContext();
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("all");
  const [deleteModelId, setDeleteModelId] = useState<string | null>(null);

  const filteredModels = useMemo(() => {
    return models.filter((model) => {
      const matchesTab = activeTab === "all" || model.category === activeTab;
      const searchLower = searchQuery.toLowerCase();
      const matchesSearch =
        model.name.toLowerCase().includes(searchLower) ||
        model.provider.toLowerCase().includes(searchLower);
      return matchesTab && matchesSearch;
    });
  }, [models, activeTab, searchQuery]);

  return (
    <div className='container mx-auto p-6 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-7xl'>
      <div className='flex flex-col md:flex-row md:items-end justify-between gap-6'>
        <div className='space-y-2'>
          <h2 className='text-3xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-400 dark:to-indigo-400'>
            模型管理中心
          </h2>
          <p className='text-muted-foreground text-lg max-w-2xl'>
            配置和管理您的 AI 模型源。高质量的模型是构建强大数字员工的基础。
          </p>
        </div>
        <ModelDialog
          trigger={
            <Button
              size='lg'
              className='shadow-lg shadow-blue-500/20 transition-all hover:scale-105'
            >
              <Plus className='mr-2 h-5 w-5' />
              添加新模型
            </Button>
          }
        />
      </div>

      {/* Filters and Search */}
      <div className='flex flex-col sm:flex-row gap-4 items-center justify-between border-b pb-4 border-slate-200 dark:border-slate-800'>
        <Tabs
          value={activeTab}
          onValueChange={setActiveTab}
          className='w-full sm:w-auto'
        >
          <TabsList className='bg-slate-100 dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800/50 p-1 h-11'>
            <TabsTrigger
              value='all'
              className='px-6 rounded-md data-[state=active]:bg-white data-[state=active]:shadow-sm'
            >
              全体
            </TabsTrigger>
            <TabsTrigger
              value='chat'
              className='px-6 rounded-md data-[state=active]:bg-white data-[state=active]:shadow-sm'
            >
              聊天 (Chat)
            </TabsTrigger>
            <TabsTrigger
              value='embedding'
              className='px-6 rounded-md data-[state=active]:bg-white data-[state=active]:shadow-sm'
            >
              向量 (Embedding)
            </TabsTrigger>
          </TabsList>
        </Tabs>

        <div className='relative w-full sm:w-72'>
          <Search className='absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400' />
          <Input
            placeholder='搜索模型名称或提供商...'
            className='pl-9 bg-slate-50/50 dark:bg-slate-900/50 border-slate-200 dark:border-slate-800 focus-visible:ring-blue-500 rounded-xl h-11'
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 pt-2'>
        {filteredModels.map((model, index) => {
          const hasKey = model.provider === "transformers" || !!model.apiKey;

          return (
            <Card
              key={model.id}
              className='group relative overflow-hidden transition-all duration-500 hover:shadow-[0_15px_30px_-10px_rgba(0,0,0,0.1)] hover:-translate-y-1 bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl border-slate-200/60 dark:border-slate-800/60 rounded-xl flex flex-col h-full'
              style={{ animationDelay: `${index * 40}ms` }}
            >
              {/* Subtle Gradient Glow */}
              <div className='absolute -right-16 -top-16 w-32 h-32 bg-gradient-to-br from-blue-500/15 via-indigo-500/5 to-transparent rounded-full blur-2xl group-hover:scale-125 transition-transform duration-700 pointer-events-none' />

              <CardHeader className='p-4 pb-2 relative z-10'>
                <div className='flex items-center gap-3'>
                  <div className='p-2.5 rounded-xl bg-gradient-to-br from-blue-500/10 to-indigo-500/10 dark:from-blue-400/10 dark:to-indigo-400/10 text-blue-600 dark:text-blue-400 border border-blue-500/10 shadow-sm'>
                    {model.category === "embedding" ? (
                      <Sparkles className='h-5 w-5' />
                    ) : (
                      <Cpu className='h-5 w-5' />
                    )}
                  </div>
                  <div className='min-w-0 flex-1 space-y-0.5'>
                    <CardTitle className='text-base font-bold truncate leading-tight text-slate-900 dark:text-slate-100'>
                      {model.name}
                    </CardTitle>
                    <div className='flex items-center gap-1.5'>
                      <span className='text-[10px] font-bold text-slate-400 uppercase tracking-tighter truncate'>
                        {model.provider}
                      </span>
                      <Badge
                        variant='outline'
                        className='text-[9px] px-1 h-3.5 border-slate-200 dark:border-slate-800 text-slate-500 uppercase'
                      >
                        {model.category}
                      </Badge>
                    </div>
                  </div>
                </div>
              </CardHeader>

              <CardContent className='p-4 pt-2 space-y-3 relative z-10 flex-1'>
                <div className='flex items-center justify-between text-xs'>
                  <div className='flex items-center gap-1.5'>
                    <span className='relative flex h-2 w-2'>
                      {hasKey ? (
                        <>
                          <span className='animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75'></span>
                          <span className='relative inline-flex rounded-full h-2 w-2 bg-emerald-500'></span>
                        </>
                      ) : (
                        <span className='relative inline-flex rounded-full h-2 w-2 bg-rose-500'></span>
                      )}
                    </span>
                    <span className='font-medium text-slate-500 dark:text-slate-400'>
                      {hasKey ? "已就绪" : "未配置"}
                    </span>
                  </div>
                  {model.category === "embedding" && model.isActive && (
                    <Badge
                      variant='secondary'
                      className='bg-blue-500/5 text-blue-600 hover:bg-blue-500/10 border-blue-500/10 shadow-none h-4 px-1 text-[9px]'
                    >
                      默认
                    </Badge>
                  )}
                  {model.category === "chat" && (
                    <div className='flex items-center gap-1 text-slate-400'>
                      {model.supportsImages ? (
                        <Eye className='w-3 h-3' />
                      ) : (
                        <EyeOff className='w-3 h-3' />
                      )}
                      <span className='text-[10px]'>
                        {model.supportsImages ? "视觉" : "文本"}
                      </span>
                    </div>
                  )}
                </div>

                <div className='flex items-center gap-2 p-1.5 rounded-lg bg-slate-50/50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800/50 text-[10px] font-mono text-slate-400'>
                  <Globe className='h-3 w-3 flex-shrink-0' />
                  <span
                    className='truncate'
                    title={model.baseUrl}
                  >
                    {model.provider === "transformers"
                      ? "本地引擎"
                      : model.baseUrl || "默认端点"}
                  </span>
                </div>
              </CardContent>

              <CardFooter className='p-2 px-4 border-t border-slate-100 dark:border-slate-800/50 bg-slate-50/20 dark:bg-slate-900/10 flex items-center justify-between'>
                <div className='flex items-center gap-1.5 text-[10px] text-slate-400 font-medium'>
                  <Key className='w-3 h-3' />
                  {model.apiKey ? "KEY 已连通" : "尚未配置"}
                </div>

                <div className='flex items-center gap-1'>
                  <ModelDialog
                    model={model}
                    trigger={
                      <Button
                        variant='ghost'
                        size='icon'
                        className='h-7 w-7 text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors'
                      >
                        <Edit className='h-3.5 w-3.5' />
                      </Button>
                    }
                  />
                  <Button
                    variant='ghost'
                    size='icon'
                    className='h-7 w-7 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors'
                    onClick={() => setDeleteModelId(model.id)}
                  >
                    <Trash2 className='h-3.5 w-3.5' />
                  </Button>
                </div>
              </CardFooter>
            </Card>
          );
        })}
      </div>

      {filteredModels.length === 0 && (
        <div className='py-20 flex flex-col items-center justify-center text-center animate-in fade-in zoom-in-95 duration-500 rounded-3xl border border-slate-200/50 dark:border-slate-800/50 bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm shadow-sm'>
          <div className='relative w-24 h-24 mb-6'>
            <div className='absolute inset-0 bg-blue-100 dark:bg-blue-900/30 rounded-full animate-ping opacity-20' />
            <div className='relative w-full h-full rounded-full bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-900 flex items-center justify-center shadow-inner border border-white dark:border-slate-800'>
              <Search className='w-10 h-10 text-slate-400' />
            </div>
          </div>
          <h3 className='text-2xl font-bold text-slate-900 dark:text-slate-100 mb-2'>
            {models.length === 0 ? "还没有配置模型" : "没有找到匹配的模型"}
          </h3>
          <p className='text-muted-foreground max-w-md mb-8 text-base'>
            {models.length === 0
              ? "添加您的第一个 AI 模型提供商，开启您的智能化旅程。支持 OpenAI、Anthropic、本地模型等多种选择。"
              : "尝试调整您的搜索词或分类过滤条件。"}
          </p>
          {models.length === 0 ? (
            <ModelDialog
              trigger={
                <Button
                  size='lg'
                  className='rounded-full shadow-lg shadow-blue-500/25 px-8 h-12 text-base transition-transform hover:scale-105'
                >
                  <Plus className='mr-2 h-5 w-5' />
                  立即添加
                </Button>
              }
            />
          ) : (
            <Button
              variant='outline'
              onClick={() => {
                setSearchQuery("");
                setActiveTab("all");
              }}
            >
              清除过滤条件
            </Button>
          )}
        </div>
      )}

      <AlertDialog
        open={!!deleteModelId}
        onOpenChange={(open) => !open && setDeleteModelId(null)}
      >
        <AlertDialogContent className='rounded-2xl'>
          <AlertDialogHeader>
            <AlertDialogTitle className='flex items-center gap-2 text-xl'>
              <div className='p-2 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-full'>
                <Trash2 className='w-5 h-5' />
              </div>
              确认删除模型？
            </AlertDialogTitle>
            <AlertDialogDescription className='text-base mt-3'>
              您确定要删除此模型配置吗？一旦删除，依赖此模型的数字员工可能会无法正常工作。此操作不可逆转。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className='mt-6'>
            <AlertDialogCancel className='rounded-xl h-11'>
              取消
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (deleteModelId) {
                  removeModel(deleteModelId);
                  setDeleteModelId(null);
                }
              }}
              className='bg-red-600 hover:bg-red-700 text-white rounded-xl h-11 shadow-lg shadow-red-500/20'
            >
              确定删除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
