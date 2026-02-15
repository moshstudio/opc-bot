"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, FileText, Globe } from "lucide-react";

interface AddDocumentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: {
    name: string;
    content: string;
    type: string;
  }) => Promise<void>;
}

import { useModelContext } from "@/components/ModelContext";
import Link from "next/link";
import { AlertCircle, ArrowRight } from "lucide-react";

export function AddDocumentDialog({
  open,
  onOpenChange,
  onSubmit,
}: AddDocumentDialogProps) {
  const { activeEmbeddingModel } = useModelContext();
  const [name, setName] = useState("");
  const [content, setContent] = useState("");
  const [type, setType] = useState<"text" | "url">("text");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!name.trim() || !content.trim() || !activeEmbeddingModel) return;
    setLoading(true);
    try {
      await onSubmit({
        name: name.trim(),
        content: content.trim(),
        type,
      });
      setName("");
      setContent("");
      setType("text");
      onOpenChange(false);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
    >
      <DialogContent className='sm:max-w-[560px] max-h-[90vh] flex flex-col rounded-2xl'>
        <DialogHeader>
          <DialogTitle className='text-xl'>添加文档</DialogTitle>
          <DialogDescription>
            向知识库中添加新的文档或知识内容。
          </DialogDescription>
        </DialogHeader>

        <div className='flex-1 overflow-y-auto pr-1 -mr-1'>
          <div className='space-y-5 py-2'>
            {/* Model Warning / Status */}
            {!activeEmbeddingModel ? (
              <div className='bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/50 rounded-xl p-4 flex gap-3 animate-in fade-in slide-in-from-top-2 duration-300'>
                <AlertCircle className='w-5 h-5 text-amber-600 shrink-0 mt-0.5' />
                <div className='flex-1 space-y-2'>
                  <p className='text-sm font-medium text-amber-800 dark:text-amber-300'>
                    未配置 Embedding 模型
                  </p>
                  <p className='text-xs text-amber-700/80 dark:text-amber-400/80 leading-relaxed'>
                    添加文档需要先配置向量嵌入模型（如 Transformers.js 或
                    OpenAI）。
                  </p>
                  <Link
                    href='/dashboard/models'
                    className='inline-flex items-center gap-1.5 text-xs font-bold text-amber-700 dark:text-amber-400 hover:underline'
                    onClick={() => onOpenChange(false)}
                  >
                    前往模型管理配置
                    <ArrowRight className='w-3 h-3' />
                  </Link>
                </div>
              </div>
            ) : (
              <div className='flex items-center justify-between px-3 py-2 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800'>
                <div className='flex items-center gap-2'>
                  <div className='w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' />
                  <span className='text-xs font-medium text-slate-500'>
                    检索引擎已就绪
                  </span>
                </div>
                <span className='text-[10px] font-mono bg-white dark:bg-slate-800 px-2 py-0.5 rounded border border-slate-100 dark:border-slate-700 text-slate-400'>
                  {activeEmbeddingModel.name} ({activeEmbeddingModel.provider})
                </span>
              </div>
            )}

            {/* Type Toggle */}
            <div>
              <label className='text-sm font-medium mb-2 block'>类型</label>
              <div className='flex gap-2'>
                <button
                  type='button'
                  onClick={() => setType("text")}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${
                    type === "text"
                      ? "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 ring-1 ring-emerald-300 dark:ring-emerald-700"
                      : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700"
                  }`}
                >
                  <FileText className='w-4 h-4' />
                  文本内容
                </button>
                <button
                  type='button'
                  onClick={() => setType("url")}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${
                    type === "url"
                      ? "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 ring-1 ring-emerald-300 dark:ring-emerald-700"
                      : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700"
                  }`}
                >
                  <Globe className='w-4 h-4' />
                  网页 URL
                </button>
              </div>
            </div>

            {/* Name */}
            <div>
              <label className='text-sm font-medium mb-2 block'>
                文档名称 <span className='text-red-500'>*</span>
              </label>
              <Input
                placeholder='例如：产品使用手册 v2.0'
                value={name}
                onChange={(e) => setName(e.target.value)}
                className='rounded-xl'
              />
            </div>

            {/* Content */}
            <div className='flex flex-col'>
              <label className='text-sm font-medium mb-2 block'>
                {type === "text" ? "文档内容" : "URL 地址"}{" "}
                <span className='text-red-500'>*</span>
              </label>
              {type === "text" ? (
                <Textarea
                  placeholder='粘贴或输入文档的文本内容...'
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  className='rounded-xl h-[360px] overflow-auto whitespace-pre resize-none'
                  style={{ fieldSizing: "fixed" } as any}
                />
              ) : (
                <Input
                  placeholder='https://example.com/docs'
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  className='rounded-xl'
                  type='url'
                />
              )}
              {type === "text" && content.length > 0 && (
                <p className='text-xs text-slate-400 mt-1.5'>
                  {content.length} 字符
                </p>
              )}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant='ghost'
            onClick={() => onOpenChange(false)}
            className='rounded-xl'
          >
            取消
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={
              !name.trim() ||
              !content.trim() ||
              loading ||
              !activeEmbeddingModel
            }
            className='rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white hover:opacity-90 shadow-md'
          >
            {loading && <Loader2 className='w-4 h-4 mr-2 animate-spin' />}
            添加文档
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
