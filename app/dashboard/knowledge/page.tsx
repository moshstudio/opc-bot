"use client";

import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  getKnowledgeBases,
  createKnowledgeBase,
  deleteKnowledgeBase,
  searchKnowledgeBases,
} from "@/app/actions/knowledge-actions";
import { getOrCreateCompany } from "@/app/actions/company-actions";
import { CreateKnowledgeBaseDialog } from "@/components/knowledge/CreateKnowledgeBaseDialog";
import { KnowledgeDetail } from "@/components/knowledge/KnowledgeDetail";
import {
  Plus,
  Search,
  Clock,
  Hash,
  FileStack,
  MoreHorizontal,
  Trash2,
  BookOpen,
  Database,
  AlertTriangle,
} from "lucide-react";

interface KBItem {
  id: string;
  name: string;
  description: string | null;
  icon: string;
  isShared: boolean;
  documentCount: number;
  totalWords: number;
  totalChars: number;
  createdAt: Date;
  updatedAt: Date;
}

export default function KnowledgeBasePage() {
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [kbs, setKbs] = useState<KBItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [selectedKBId, setSelectedKBId] = useState<string | null>(null);
  const [deleteConfirmKB, setDeleteConfirmKB] = useState<KBItem | null>(null);

  const loadData = useCallback(async (cId: string, query?: string) => {
    const res = query
      ? await searchKnowledgeBases(cId, query)
      : await getKnowledgeBases(cId);
    if (res.success && res.kbs) {
      setKbs(res.kbs as KBItem[]);
    }
  }, []);

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      const companyRes = await getOrCreateCompany();
      if (companyRes.success && companyRes.company) {
        const cId = companyRes.company.id;
        setCompanyId(cId);
        await loadData(cId);
      }
      setLoading(false);
    };
    init();
  }, [loadData]);

  // Debounced search
  useEffect(() => {
    if (!companyId) return;
    const timer = setTimeout(() => {
      loadData(companyId, searchQuery || undefined);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery, companyId, loadData]);

  const handleCreate = async (data: {
    name: string;
    description: string;
    icon: string;
  }) => {
    if (!companyId) return;
    const res = await createKnowledgeBase({
      ...data,
      companyId,
    });
    if (res.success) {
      toast.success("知识库已创建");
      loadData(companyId);
    } else {
      toast.error("创建失败");
    }
  };

  const handleDeleteKB = async () => {
    if (!deleteConfirmKB || !companyId) return;
    const res = await deleteKnowledgeBase(deleteConfirmKB.id);
    if (res.success) {
      toast.success("知识库已删除");
      setDeleteConfirmKB(null);
      loadData(companyId);
    } else {
      toast.error("删除失败");
    }
  };

  // Detail view
  if (selectedKBId) {
    return (
      <KnowledgeDetail
        knowledgeBaseId={selectedKBId}
        onBack={() => {
          setSelectedKBId(null);
          if (companyId) loadData(companyId);
        }}
      />
    );
  }

  // Loading skeleton
  if (loading) {
    return (
      <div className="container mx-auto p-6 space-y-8 max-w-7xl">
        <div className="flex items-center justify-between">
          <div>
            <Skeleton className="h-9 w-32" />
            <Skeleton className="h-5 w-64 mt-2" />
          </div>
          <Skeleton className="h-10 w-28" />
        </div>
        <Skeleton className="h-10 w-80" />
        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-44 rounded-2xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6 animate-in fade-in duration-500 max-w-7xl">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-emerald-600 to-teal-600 dark:from-emerald-400 dark:to-teal-400">
            知识库
          </h2>
          <p className="text-muted-foreground mt-1.5">
            管理和组织您的 AI 团队共享的知识资源
          </p>
        </div>
        <Button
          onClick={() => setCreateDialogOpen(true)}
          className="gap-2 shadow-lg hover:scale-[1.02] active:scale-[0.98] transition-all bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white rounded-xl px-5 py-2.5"
        >
          <Plus className="h-4 w-4" />
          创建知识库
        </Button>
      </div>

      {/* Search */}
      {(kbs.length > 0 || searchQuery) && (
        <div className="relative w-full md:w-96">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            placeholder="搜索知识库..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 rounded-xl bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800"
          />
        </div>
      )}

      {/* Knowledge Base Grid */}
      {kbs.length > 0 ? (
        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {kbs.map((kb) => (
            <Card
              key={kb.id}
              className="group relative overflow-hidden transition-all duration-300 hover:shadow-xl hover:-translate-y-0.5 bg-white dark:bg-slate-900 border-0 shadow-sm rounded-2xl cursor-pointer"
              onClick={() => setSelectedKBId(kb.id)}
            >
              {/* Decorative gradient orb */}
              <div className="absolute -right-8 -top-8 w-24 h-24 bg-gradient-to-br from-emerald-500/10 to-teal-500/10 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-500" />

              <CardContent className="p-5 relative">
                {/* Top row: icon + name + menu */}
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-start gap-3 min-w-0">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-900/20 dark:to-teal-900/20 flex items-center justify-center text-xl shadow-sm shrink-0 group-hover:shadow-md transition-shadow">
                      {kb.icon}
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-bold text-slate-900 dark:text-slate-100 truncate text-base">
                        {kb.name}
                      </h3>
                      <p className="text-xs text-slate-400 mt-0.5 line-clamp-2 leading-relaxed">
                        {kb.description || "暂无描述"}
                      </p>
                    </div>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <MoreHorizontal className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="rounded-xl">
                      <DropdownMenuItem
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedKBId(kb.id);
                        }}
                        className="gap-2 rounded-lg"
                      >
                        <BookOpen className="w-4 h-4" />
                        查看详情
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        variant="destructive"
                        onClick={(e) => {
                          e.stopPropagation();
                          setDeleteConfirmKB(kb);
                        }}
                        className="gap-2 rounded-lg"
                      >
                        <Trash2 className="w-4 h-4" />
                        删除
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                {/* Divider */}
                <div className="h-px bg-slate-100 dark:bg-slate-800 my-3" />

                {/* Stats row */}
                <div className="flex items-center gap-4 text-xs text-slate-400">
                  <span className="flex items-center gap-1">
                    <FileStack className="w-3.5 h-3.5" />
                    {kb.documentCount} 文档
                  </span>
                  <span className="flex items-center gap-1">
                    <Hash className="w-3.5 h-3.5" />
                    {kb.totalWords.toLocaleString()} 词
                  </span>
                  <span className="flex items-center gap-1 ml-auto">
                    <Clock className="w-3.5 h-3.5" />
                    {new Date(kb.updatedAt).toLocaleDateString("zh-CN")}
                  </span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : searchQuery ? (
        /* Search empty state */
        <div className="py-16 flex flex-col items-center justify-center text-center">
          <Search className="w-12 h-12 text-slate-300 mb-4" />
          <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-200">
            没有找到匹配的知识库
          </h3>
          <p className="text-slate-500 mt-2">
            尝试使用其他关键词搜索
          </p>
        </div>
      ) : (
        /* Empty state */
        <div className="py-20 flex flex-col items-center justify-center text-center border-2 border-dashed rounded-3xl border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
          <div className="w-20 h-20 mb-5 rounded-2xl bg-gradient-to-br from-emerald-100 to-teal-100 dark:from-emerald-900/20 dark:to-teal-900/20 flex items-center justify-center">
            <Database className="w-10 h-10 text-emerald-500/70" />
          </div>
          <h3 className="text-xl font-bold text-slate-900 dark:text-slate-200">
            开始构建你的知识库
          </h3>
          <p className="text-slate-500 max-w-md mt-2 mb-6 leading-relaxed">
            创建知识库来组织文档和信息，让您的 AI
            团队可以检索和使用这些知识来完成任务。
          </p>
          <Button
            onClick={() => setCreateDialogOpen(true)}
            className="gap-2 shadow-lg bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-xl px-6 py-2.5 hover:scale-[1.02] active:scale-[0.98] transition-all"
          >
            <Plus className="h-4 w-4" />
            创建第一个知识库
          </Button>
        </div>
      )}

      {/* Create Dialog */}
      <CreateKnowledgeBaseDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        onSubmit={handleCreate}
      />

      {/* Delete Confirm Dialog */}
      <Dialog
        open={!!deleteConfirmKB}
        onOpenChange={(v) => !v && setDeleteConfirmKB(null)}
      >
        <DialogContent className="sm:max-w-[400px] rounded-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="w-5 h-5" />
              确认删除知识库
            </DialogTitle>
            <DialogDescription>
              删除「{deleteConfirmKB?.name}」及其所有{" "}
              {deleteConfirmKB?.documentCount || 0}{" "}
              个文档？此操作不可撤销。
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => setDeleteConfirmKB(null)}
              className="rounded-xl"
            >
              取消
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteKB}
              className="rounded-xl"
            >
              确认删除
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
