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
import { Loader2 } from "lucide-react";

const ICON_OPTIONS = [
  "📚",
  "📖",
  "📝",
  "💡",
  "🎯",
  "🔬",
  "📊",
  "🏢",
  "💼",
  "🛠️",
  "🌐",
  "📋",
  "🗂️",
  "📁",
  "🧠",
];

interface CreateKnowledgeBaseDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: {
    name: string;
    description: string;
    icon: string;
  }) => Promise<void>;
}

export function CreateKnowledgeBaseDialog({
  open,
  onOpenChange,
  onSubmit,
}: CreateKnowledgeBaseDialogProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [icon, setIcon] = useState("📚");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!name.trim()) return;
    setLoading(true);
    try {
      await onSubmit({ name: name.trim(), description: description.trim(), icon });
      setName("");
      setDescription("");
      setIcon("📚");
      onOpenChange(false);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px] rounded-2xl">
        <DialogHeader>
          <DialogTitle className="text-xl">创建知识库</DialogTitle>
          <DialogDescription>
            创建一个新的知识库来组织和管理您的文档与知识。
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-2">
          {/* Icon Picker */}
          <div>
            <label className="text-sm font-medium mb-2 block">图标</label>
            <div className="flex flex-wrap gap-2">
              {ICON_OPTIONS.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => setIcon(emoji)}
                  className={`w-10 h-10 rounded-xl text-xl flex items-center justify-center transition-all ${
                    icon === emoji
                      ? "bg-emerald-100 dark:bg-emerald-900/30 ring-2 ring-emerald-500 scale-110"
                      : "bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700"
                  }`}
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>

          {/* Name */}
          <div>
            <label className="text-sm font-medium mb-2 block">
              名称 <span className="text-red-500">*</span>
            </label>
            <Input
              placeholder="例如：产品文档、公司政策、FAQ..."
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="rounded-xl"
              onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
            />
          </div>

          {/* Description */}
          <div>
            <label className="text-sm font-medium mb-2 block">描述</label>
            <Textarea
              placeholder="简要描述这个知识库的用途和包含的内容..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="rounded-xl min-h-[80px] resize-none"
            />
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
            disabled={!name.trim() || loading}
            className="rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white hover:opacity-90 shadow-md"
          >
            {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            创建
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
