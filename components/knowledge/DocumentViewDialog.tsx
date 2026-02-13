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
import { Loader2, Pencil, Save, X, FileText, Globe, Clock, Hash } from "lucide-react";

interface DocumentViewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  document: {
    id: string;
    name: string;
    content: string;
    type: string;
    status: string;
    wordCount: number;
    characterCount: number;
    createdAt: Date;
    updatedAt: Date;
  } | null;
  onUpdate: (id: string, data: { name?: string; content?: string }) => Promise<void>;
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
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[85vh] rounded-2xl flex flex-col">
        <DialogHeader>
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              {editing ? (
                <Input
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="rounded-xl text-lg font-semibold"
                />
              ) : (
                <DialogTitle className="text-xl truncate">
                  {document.name}
                </DialogTitle>
              )}
            </div>
          </div>
          {/* Meta info */}
          <div className="flex flex-wrap items-center gap-2 mt-2">
            <Badge
              variant="outline"
              className="gap-1 rounded-lg text-xs"
            >
              {document.type === "url" ? (
                <Globe className="w-3 h-3" />
              ) : (
                <FileText className="w-3 h-3" />
              )}
              {document.type === "url" ? "URL" : "文本"}
            </Badge>
            <Badge
              variant="outline"
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
            <span className="flex items-center gap-1 text-xs text-slate-400">
              <Hash className="w-3 h-3" />
              {document.wordCount.toLocaleString()} 词
            </span>
            <span className="flex items-center gap-1 text-xs text-slate-400">
              <Clock className="w-3 h-3" />
              {new Date(document.createdAt).toLocaleDateString("zh-CN")}
            </span>
          </div>
        </DialogHeader>

        {/* Content */}
        <div className="flex-1 min-h-0 my-2">
          {editing ? (
            <Textarea
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              className="rounded-xl min-h-[300px] h-full resize-none font-mono text-sm"
            />
          ) : (
            <ScrollArea className="h-[400px] rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50">
              <div className="p-4 text-sm leading-relaxed whitespace-pre-wrap break-words text-slate-700 dark:text-slate-300">
                {document.content}
              </div>
            </ScrollArea>
          )}
        </div>

        <DialogFooter>
          {editing ? (
            <>
              <Button
                variant="ghost"
                onClick={() => setEditing(false)}
                className="rounded-xl gap-1"
              >
                <X className="w-4 h-4" />
                取消
              </Button>
              <Button
                onClick={handleSave}
                disabled={!editName.trim() || !editContent.trim() || loading}
                className="rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white hover:opacity-90 shadow-md gap-1"
              >
                {loading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Save className="w-4 h-4" />
                )}
                保存
              </Button>
            </>
          ) : (
            <Button
              onClick={startEdit}
              variant="outline"
              className="rounded-xl gap-1"
            >
              <Pencil className="w-4 h-4" />
              编辑
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
