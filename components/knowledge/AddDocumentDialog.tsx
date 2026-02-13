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

export function AddDocumentDialog({
  open,
  onOpenChange,
  onSubmit,
}: AddDocumentDialogProps) {
  const [name, setName] = useState("");
  const [content, setContent] = useState("");
  const [type, setType] = useState<"text" | "url">("text");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!name.trim() || !content.trim()) return;
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
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[560px] rounded-2xl">
        <DialogHeader>
          <DialogTitle className="text-xl">添加文档</DialogTitle>
          <DialogDescription>
            向知识库中添加新的文档或知识内容。
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-2">
          {/* Type Toggle */}
          <div>
            <label className="text-sm font-medium mb-2 block">类型</label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setType("text")}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  type === "text"
                    ? "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 ring-1 ring-emerald-300 dark:ring-emerald-700"
                    : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700"
                }`}
              >
                <FileText className="w-4 h-4" />
                文本内容
              </button>
              <button
                type="button"
                onClick={() => setType("url")}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  type === "url"
                    ? "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 ring-1 ring-emerald-300 dark:ring-emerald-700"
                    : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700"
                }`}
              >
                <Globe className="w-4 h-4" />
                网页 URL
              </button>
            </div>
          </div>

          {/* Name */}
          <div>
            <label className="text-sm font-medium mb-2 block">
              文档名称 <span className="text-red-500">*</span>
            </label>
            <Input
              placeholder="例如：产品使用手册 v2.0"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="rounded-xl"
            />
          </div>

          {/* Content */}
          <div>
            <label className="text-sm font-medium mb-2 block">
              {type === "text" ? "文档内容" : "URL 地址"}{" "}
              <span className="text-red-500">*</span>
            </label>
            {type === "text" ? (
              <Textarea
                placeholder="粘贴或输入文档的文本内容..."
                value={content}
                onChange={(e) => setContent(e.target.value)}
                className="rounded-xl min-h-[200px] resize-none"
              />
            ) : (
              <Input
                placeholder="https://example.com/docs"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                className="rounded-xl"
                type="url"
              />
            )}
            {type === "text" && content.length > 0 && (
              <p className="text-xs text-slate-400 mt-1.5">
                {content.length} 字符
              </p>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="ghost"
            onClick={() => onOpenChange(false)}
            className="rounded-xl"
          >
            取消
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!name.trim() || !content.trim() || loading}
            className="rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white hover:opacity-90 shadow-md"
          >
            {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            添加文档
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
