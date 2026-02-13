"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
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
import { Skeleton } from "@/components/ui/skeleton";
import {
  getKnowledgeBase,
  updateKnowledgeBase,
  deleteKnowledgeBase,
  createDocument,
  updateDocument,
  deleteDocument,
} from "@/app/actions/knowledge-actions";
import { AddDocumentDialog } from "./AddDocumentDialog";
import { DocumentViewDialog } from "./DocumentViewDialog";
import {
  ArrowLeft,
  Plus,
  MoreHorizontal,
  FileText,
  Globe,
  Trash2,
  Eye,
  Clock,
  Hash,
  Search,
  Save,
  Loader2,
  AlertTriangle,
  BookOpen,
  Settings,
  FileStack,
} from "lucide-react";

interface KnowledgeDetailProps {
  knowledgeBaseId: string;
  onBack: () => void;
}

interface DocumentItem {
  id: string;
  name: string;
  content: string;
  type: string;
  status: string;
  wordCount: number;
  characterCount: number;
  createdAt: Date;
  updatedAt: Date;
}

interface KBData {
  id: string;
  name: string;
  description: string | null;
  icon: string;
  isShared: boolean;
  documents: DocumentItem[];
  createdAt: Date;
  updatedAt: Date;
}

export function KnowledgeDetail({
  knowledgeBaseId,
  onBack,
}: KnowledgeDetailProps) {
  const [kb, setKb] = useState<KBData | null>(null);
  const [loading, setLoading] = useState(true);
  const [addDocOpen, setAddDocOpen] = useState(false);
  const [viewDoc, setViewDoc] = useState<DocumentItem | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deleteDocId, setDeleteDocId] = useState<string | null>(null);

  // Settings state
  const [editName, setEditName] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [editShared, setEditShared] = useState(true);
  const [saving, setSaving] = useState(false);

  const loadKB = async () => {
    const res = await getKnowledgeBase(knowledgeBaseId);
    if (res.success && res.kb) {
      const kbData = res.kb as KBData;
      setKb(kbData);
      setEditName(kbData.name);
      setEditDesc(kbData.description || "");
      setEditShared(kbData.isShared);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadKB();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [knowledgeBaseId]);

  const handleAddDocument = async (data: {
    name: string;
    content: string;
    type: string;
  }) => {
    const res = await createDocument({
      ...data,
      knowledgeBaseId,
    });
    if (res.success) {
      toast.success("文档已添加");
      loadKB();
    } else {
      toast.error("添加失败");
    }
  };

  const handleUpdateDocument = async (
    id: string,
    data: { name?: string; content?: string }
  ) => {
    const res = await updateDocument(id, data);
    if (res.success) {
      toast.success("文档已更新");
      loadKB();
      // Update viewDoc if it's the same document
      if (viewDoc?.id === id && res.doc) {
        setViewDoc(res.doc as DocumentItem);
      }
    } else {
      toast.error("更新失败");
    }
  };

  const handleDeleteDocument = async () => {
    if (!deleteDocId) return;
    const res = await deleteDocument(deleteDocId);
    if (res.success) {
      toast.success("文档已删除");
      setDeleteDocId(null);
      loadKB();
    } else {
      toast.error("删除失败");
    }
  };

  const handleSaveSettings = async () => {
    if (!editName.trim()) return;
    setSaving(true);
    const res = await updateKnowledgeBase(knowledgeBaseId, {
      name: editName.trim(),
      description: editDesc.trim() || undefined,
      isShared: editShared,
    });
    setSaving(false);
    if (res.success) {
      toast.success("设置已保存");
      loadKB();
    } else {
      toast.error("保存失败");
    }
  };

  const handleDeleteKB = async () => {
    const res = await deleteKnowledgeBase(knowledgeBaseId);
    if (res.success) {
      toast.success("知识库已删除");
      onBack();
    } else {
      toast.error("删除失败");
    }
  };

  const filteredDocs =
    kb?.documents.filter(
      (d) =>
        d.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        d.content.toLowerCase().includes(searchQuery.toLowerCase())
    ) || [];

  const totalWords = kb?.documents.reduce((s, d) => s + d.wordCount, 0) || 0;
  const totalChars =
    kb?.documents.reduce((s, d) => s + d.characterCount, 0) || 0;

  if (loading) {
    return (
      <div className="container mx-auto p-6 max-w-7xl space-y-6">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-12 w-full max-w-md" />
        <div className="grid gap-4 md:grid-cols-3">
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
        </div>
        <Skeleton className="h-64" />
      </div>
    );
  }

  if (!kb) {
    return (
      <div className="container mx-auto p-6 max-w-7xl">
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <AlertTriangle className="w-12 h-12 text-slate-400 mb-4" />
          <h3 className="text-lg font-semibold">知识库不存在</h3>
          <Button variant="ghost" onClick={onBack} className="mt-4 gap-2">
            <ArrowLeft className="w-4 h-4" />
            返回列表
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-7xl space-y-6 animate-in fade-in duration-300">
      {/* Back + Header */}
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={onBack}
          className="gap-1 rounded-xl text-slate-500 hover:text-slate-700"
        >
          <ArrowLeft className="w-4 h-4" />
          返回
        </Button>
      </div>

      <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
        <div className="flex items-start gap-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-900/20 dark:to-teal-900/20 flex items-center justify-center text-2xl shadow-sm">
            {kb.icon}
          </div>
          <div>
            <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
              {kb.name}
            </h2>
            {kb.description && (
              <p className="text-slate-500 mt-1">{kb.description}</p>
            )}
            <div className="flex items-center gap-3 mt-2">
              <Badge variant="outline" className="rounded-lg text-xs gap-1">
                <FileStack className="w-3 h-3" />
                {kb.documents.length} 文档
              </Badge>
              <Badge variant="outline" className="rounded-lg text-xs gap-1">
                <Hash className="w-3 h-3" />
                {totalWords.toLocaleString()} 词
              </Badge>
              {kb.isShared && (
                <Badge className="rounded-lg text-xs bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300 border-0">
                  共享
                </Badge>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Tabs: Documents | Settings */}
      <Tabs defaultValue="documents" className="space-y-4">
        <TabsList className="rounded-xl">
          <TabsTrigger value="documents" className="gap-1.5 rounded-lg">
            <BookOpen className="w-4 h-4" />
            文档
          </TabsTrigger>
          <TabsTrigger value="settings" className="gap-1.5 rounded-lg">
            <Settings className="w-4 h-4" />
            设置
          </TabsTrigger>
        </TabsList>

        {/* ======== Documents Tab ======== */}
        <TabsContent value="documents" className="space-y-4">
          {/* Toolbar */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="relative w-full sm:w-80">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                placeholder="搜索文档..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 rounded-xl"
              />
            </div>
            <Button
              onClick={() => setAddDocOpen(true)}
              className="gap-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white hover:opacity-90 shadow-md"
            >
              <Plus className="w-4 h-4" />
              添加文档
            </Button>
          </div>

          {/* Document List */}
          {filteredDocs.length === 0 ? (
            <div className="py-16 flex flex-col items-center justify-center text-center border-2 border-dashed rounded-2xl border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
              <div className="w-14 h-14 mb-4 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                <FileText className="w-7 h-7 text-slate-400" />
              </div>
              <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-200">
                {searchQuery ? "没有匹配的文档" : "还没有文档"}
              </h3>
              <p className="text-slate-500 max-w-sm mt-2 mb-5">
                {searchQuery
                  ? "尝试使用其他关键词搜索"
                  : "添加您的第一个文档，开始构建知识库。"}
              </p>
              {!searchQuery && (
                <Button
                  onClick={() => setAddDocOpen(true)}
                  className="gap-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white"
                >
                  <Plus className="w-4 h-4" />
                  添加文档
                </Button>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              {filteredDocs.map((doc) => (
                <Card
                  key={doc.id}
                  className="group border-0 shadow-sm hover:shadow-md transition-all bg-white dark:bg-slate-900 rounded-xl cursor-pointer"
                  onClick={() => setViewDoc(doc)}
                >
                  <CardContent className="p-4 flex items-center gap-4">
                    {/* Icon */}
                    <div
                      className={`p-2.5 rounded-xl shrink-0 ${
                        doc.type === "url"
                          ? "bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400"
                          : "bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400"
                      }`}
                    >
                      {doc.type === "url" ? (
                        <Globe className="w-5 h-5" />
                      ) : (
                        <FileText className="w-5 h-5" />
                      )}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h4 className="font-semibold text-slate-900 dark:text-slate-100 truncate">
                          {doc.name}
                        </h4>
                        <Badge
                          variant="outline"
                          className={`rounded-md text-[10px] px-1.5 shrink-0 ${
                            doc.status === "ready"
                              ? "text-emerald-600 border-emerald-200 dark:border-emerald-800"
                              : doc.status === "error"
                                ? "text-red-600 border-red-200"
                                : "text-amber-600 border-amber-200"
                          }`}
                        >
                          {doc.status === "ready"
                            ? "就绪"
                            : doc.status === "error"
                              ? "错误"
                              : "处理中"}
                        </Badge>
                      </div>
                      <p className="text-xs text-slate-400 mt-1 truncate max-w-lg">
                        {doc.content.slice(0, 120)}
                        {doc.content.length > 120 ? "..." : ""}
                      </p>
                    </div>

                    {/* Stats */}
                    <div className="hidden md:flex items-center gap-4 text-xs text-slate-400 shrink-0">
                      <span className="flex items-center gap-1">
                        <Hash className="w-3 h-3" />
                        {doc.wordCount.toLocaleString()} 词
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {new Date(doc.createdAt).toLocaleDateString("zh-CN")}
                      </span>
                    </div>

                    {/* Actions */}
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <MoreHorizontal className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="rounded-xl">
                        <DropdownMenuItem
                          onClick={(e) => {
                            e.stopPropagation();
                            setViewDoc(doc);
                          }}
                          className="gap-2 rounded-lg"
                        >
                          <Eye className="w-4 h-4" />
                          查看
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          variant="destructive"
                          onClick={(e) => {
                            e.stopPropagation();
                            setDeleteDocId(doc.id);
                          }}
                          className="gap-2 rounded-lg"
                        >
                          <Trash2 className="w-4 h-4" />
                          删除
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* Stats Bar */}
          {kb.documents.length > 0 && (
            <div className="flex items-center justify-center gap-6 py-3 text-xs text-slate-400">
              <span>共 {kb.documents.length} 个文档</span>
              <span>{totalWords.toLocaleString()} 词</span>
              <span>{totalChars.toLocaleString()} 字符</span>
            </div>
          )}
        </TabsContent>

        {/* ======== Settings Tab ======== */}
        <TabsContent value="settings">
          <Card className="border-0 shadow-sm bg-white dark:bg-slate-900 rounded-2xl">
            <CardContent className="p-6 space-y-6">
              <div>
                <h3 className="text-lg font-semibold mb-4">基本信息</h3>
                <div className="space-y-4 max-w-lg">
                  <div>
                    <label className="text-sm font-medium mb-2 block">
                      名称
                    </label>
                    <Input
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="rounded-xl"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-2 block">
                      描述
                    </label>
                    <Textarea
                      value={editDesc}
                      onChange={(e) => setEditDesc(e.target.value)}
                      className="rounded-xl min-h-[80px] resize-none"
                      placeholder="知识库描述..."
                    />
                  </div>
                  <div className="flex items-center justify-between py-2">
                    <div>
                      <label className="text-sm font-medium block">
                        团队共享
                      </label>
                      <p className="text-xs text-slate-500 mt-0.5">
                        开启后所有 AI 员工可以访问此知识库
                      </p>
                    </div>
                    <Switch
                      checked={editShared}
                      onCheckedChange={setEditShared}
                    />
                  </div>
                  <Button
                    onClick={handleSaveSettings}
                    disabled={!editName.trim() || saving}
                    className="rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white hover:opacity-90 shadow-md gap-1"
                  >
                    {saving ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Save className="w-4 h-4" />
                    )}
                    保存设置
                  </Button>
                </div>
              </div>

              <div className="border-t border-slate-200 dark:border-slate-800 pt-6">
                <h3 className="text-lg font-semibold text-red-600 mb-2">
                  危险区域
                </h3>
                <p className="text-sm text-slate-500 mb-4">
                  删除知识库后，其中的所有文档将永久丢失，且无法恢复。
                </p>
                <Button
                  variant="destructive"
                  onClick={() => setDeleteConfirmOpen(true)}
                  className="rounded-xl gap-1"
                >
                  <Trash2 className="w-4 h-4" />
                  删除知识库
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Dialogs */}
      <AddDocumentDialog
        open={addDocOpen}
        onOpenChange={setAddDocOpen}
        onSubmit={handleAddDocument}
      />

      <DocumentViewDialog
        open={!!viewDoc}
        onOpenChange={(v) => !v && setViewDoc(null)}
        document={viewDoc}
        onUpdate={handleUpdateDocument}
      />

      {/* Delete Document Confirm */}
      <Dialog
        open={!!deleteDocId}
        onOpenChange={(v) => !v && setDeleteDocId(null)}
      >
        <DialogContent className="sm:max-w-[400px] rounded-2xl">
          <DialogHeader>
            <DialogTitle>确认删除文档</DialogTitle>
            <DialogDescription>
              此操作不可撤销，文档内容将永久删除。
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => setDeleteDocId(null)}
              className="rounded-xl"
            >
              取消
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteDocument}
              className="rounded-xl"
            >
              确认删除
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete KB Confirm */}
      <Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <DialogContent className="sm:max-w-[400px] rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-red-600">
              确认删除知识库
            </DialogTitle>
            <DialogDescription>
              删除「{kb.name}」及其 {kb.documents.length}{" "}
              个文档？此操作不可撤销。
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => setDeleteConfirmOpen(false)}
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
