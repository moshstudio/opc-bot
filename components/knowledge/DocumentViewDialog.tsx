"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { splitText } from "@/lib/mastra/utils";
import {
  Loader2,
  Pencil,
  Save,
  X,
  FileText,
  Globe,
  Clock,
  Hash,
  Layers,
  Info,
} from "lucide-react";

interface DocumentViewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  document: {
    id: string;
    name: string;
    content: string;
    type: string;
    status: string;
    errorMessage?: string;
    wordCount: number;
    characterCount: number;
    createdAt: Date;
    updatedAt: Date;
  } | null;
  onUpdate: (
    id: string,
    data: { name?: string; content?: string },
  ) => Promise<void>;
}

export function DocumentViewDialog({
  open,
  onOpenChange,
  document,
  onUpdate,
}: DocumentViewDialogProps) {
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState("");
  const [editContent, setEditContent] = useState("");
  const [loading, setLoading] = useState(false);

  if (!document) return null;

  const startEdit = () => {
    setEditName(document.name);
    setEditContent(document.content);
    setEditing(true);
  };

  const handleSave = async () => {
    if (!editName.trim() || !editContent.trim()) return;
    setLoading(true);
    try {
      await onUpdate(document.id, {
        name: editName.trim(),
        content: editContent.trim(),
      });
      setEditing(false);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenChange = (value: boolean) => {
    if (!value) setEditing(false);
    onOpenChange(value);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={handleOpenChange}
    >
      <DialogContent className='sm:max-w-[700px] max-h-[85vh] rounded-2xl flex flex-col'>
        <DialogHeader>
          <div className='flex items-start justify-between gap-4'>
            <div className='flex-1 min-w-0'>
              {editing ? (
                <Input
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className='rounded-xl text-lg font-semibold'
                />
              ) : (
                <DialogTitle className='text-xl truncate'>
                  {document.name}
                </DialogTitle>
              )}
            </div>
          </div>
          {/* Meta info */}
          <div className='flex flex-wrap items-center gap-2 mt-2'>
            <Badge
              variant='outline'
              className='gap-1 rounded-lg text-xs'
            >
              {document.type === "url" ? (
                <Globe className='w-3 h-3' />
              ) : (
                <FileText className='w-3 h-3' />
              )}
              {document.type === "url" ? "URL" : "文本"}
            </Badge>
            <Badge
              variant='outline'
              className={`gap-1 rounded-lg text-xs ${
                document.status === "ready"
                  ? "text-emerald-600 border-emerald-200"
                  : document.status === "error"
                    ? "text-red-600 border-red-200"
                    : "text-amber-600 border-amber-200"
              }`}
            >
              {document.status === "ready"
                ? "就绪"
                : document.status === "error"
                  ? "错误"
                  : "处理中"}
            </Badge>
            {document.status === "error" && document.errorMessage && (
              <p className='text-[10px] text-red-500 bg-red-50 dark:bg-red-950/30 px-2 py-1 rounded-md border border-red-100 dark:border-red-900/50 break-all max-w-md leading-relaxed'>
                错误原因: {document.errorMessage}
              </p>
            )}
            <span className='flex items-center gap-1 text-xs text-slate-400'>
              <Hash className='w-3 h-3' />
              {document.wordCount.toLocaleString()} 词
            </span>
            <span className='flex items-center gap-1 text-xs text-slate-400'>
              <Clock className='w-3 h-3' />
              {new Date(document.createdAt).toLocaleDateString("zh-CN")}
            </span>
          </div>
        </DialogHeader>

        {/* Content */}
        <div className='flex-1 min-h-0 my-2'>
          {editing ? (
            <Textarea
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              className='rounded-xl min-h-[400px] h-full resize-none font-mono text-sm border-slate-200 focus:ring-emerald-500'
            />
          ) : (
            <Tabs
              defaultValue='raw'
              className='w-full h-full flex flex-col'
            >
              <TabsList className='mb-2 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl w-fit'>
                <TabsTrigger
                  value='raw'
                  className='rounded-lg px-4 gap-2'
                >
                  <FileText className='w-4 h-4' />
                  原文
                </TabsTrigger>
                <TabsTrigger
                  value='chunks'
                  className='rounded-lg px-4 gap-2'
                >
                  <Layers className='w-4 h-4' />
                  分段预览
                </TabsTrigger>
              </TabsList>

              <TabsContent
                value='raw'
                className='flex-1 mt-0'
              >
                <ScrollArea className='h-[450px] rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm'>
                  <div className='p-5 text-sm leading-relaxed whitespace-pre-wrap break-words text-slate-700 dark:text-slate-300'>
                    {document.content}
                  </div>
                </ScrollArea>
              </TabsContent>

              <TabsContent
                value='chunks'
                className='flex-1 mt-0'
              >
                <ScrollArea className='h-[450px] rounded-xl border border-dotted border-slate-300 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-950/50'>
                  <div className='p-4 space-y-4'>
                    <div className='flex items-center gap-2 mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 rounded-xl text-xs'>
                      <Info className='w-4 h-4 shrink-0' />
                      <p>
                        系统按 800 字符/片进行切割，每段包含 150
                        字符重叠，以保证语义连贯。以下为 AI
                        检索时看到的原始内容分段：
                      </p>
                    </div>
                    {splitText(document.content).map((chunk, idx, arr) => (
                      <div
                        key={idx}
                        className='relative group'
                      >
                        <div className='absolute -left-2 top-0 bottom-0 w-1 bg-emerald-500/20 rounded-full' />
                        <div className='bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-sm hover:border-emerald-500/50 transition-colors'>
                          <div className='flex items-center justify-between mb-2'>
                            <Badge
                              variant='secondary'
                              className='bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-0 rounded-lg'
                            >
                              Segment {idx + 1}
                            </Badge>
                            <span className='text-[10px] text-slate-400 font-mono'>
                              {chunk.length} characters
                            </span>
                          </div>
                          <p className='text-sm text-slate-600 dark:text-slate-400 leading-relaxed'>
                            {chunk}
                          </p>
                          {idx < arr.length - 1 && (
                            <div className='mt-2 pt-2 border-t border-dashed border-slate-100 dark:border-slate-800 flex items-center gap-1'>
                              <div className='w-2 h-2 rounded-full bg-amber-400/20 animate-pulse' />
                              <span className='text-[10px] text-amber-500 font-medium'>
                                Overlap with next segment...
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </TabsContent>
            </Tabs>
          )}
        </div>

        <DialogFooter>
          {editing ? (
            <>
              <Button
                variant='ghost'
                onClick={() => setEditing(false)}
                className='rounded-xl gap-1'
              >
                <X className='w-4 h-4' />
                取消
              </Button>
              <Button
                onClick={handleSave}
                disabled={!editName.trim() || !editContent.trim() || loading}
                className='rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white hover:opacity-90 shadow-md gap-1'
              >
                {loading ? (
                  <Loader2 className='w-4 h-4 animate-spin' />
                ) : (
                  <Save className='w-4 h-4' />
                )}
                保存
              </Button>
            </>
          ) : (
            <Button
              onClick={startEdit}
              variant='outline'
              className='rounded-xl gap-1'
            >
              <Pencil className='w-4 h-4' />
              编辑
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
