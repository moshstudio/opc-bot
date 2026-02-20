"use client";

import * as React from "react";
import { useState, useEffect } from "react";
import {
  Check,
  ChevronsUpDown,
  Plus,
  Sparkles,
  Code,
  Youtube,
  GraduationCap,
  Building2,
  Loader2,
} from "lucide-react";
import {
  getCompanies,
  switchCompany,
  createCompany,
  getOrCreateCompany,
} from "@/app/actions/company-actions";
import { toast } from "sonner";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

const templates = [
  {
    id: "developer",
    name: "开发者",
    defaultName: "科技创新工作室",
    desc: "预置产品经理、全栈开发工程师等员工",
    icon: Code,
    color: "text-blue-500 bg-blue-100 dark:bg-blue-900/30",
  },
  {
    id: "media",
    name: "自媒体",
    defaultName: "新媒体创作中心",
    desc: "预置文案、短视频编导、运营等员工",
    icon: Youtube,
    color: "text-rose-500 bg-rose-100 dark:bg-rose-900/30",
  },
  {
    id: "education",
    name: "教育人员",
    defaultName: "在线教育学院",
    desc: "预置课程设计、题库管理、辅导员等员工",
    icon: GraduationCap,
    color: "text-emerald-500 bg-emerald-100 dark:bg-emerald-900/30",
  },
  {
    id: "custom",
    name: "自定义",
    defaultName: "我的新公司",
    desc: "空白模板，仅包含通用助理",
    icon: Building2,
    color: "text-violet-500 bg-violet-100 dark:bg-violet-900/30",
  },
];

export function CompanySwitcher() {
  const [companies, setCompanies] = useState<any[]>([]);
  const [activeCompany, setActiveCompany] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newCompanyName, setNewCompanyName] = useState(
    templates[0].defaultName,
  );
  const [selectedTemplate, setSelectedTemplate] = useState("developer");
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    async function init() {
      // get active company id initially
      const initRes = await getOrCreateCompany();
      const allRes = await getCompanies();
      if (allRes.success && allRes.companies) {
        setCompanies(allRes.companies);
        if (allRes.companies.length === 0) {
          setIsDialogOpen(true);
        } else if (initRes.success && initRes.company) {
          const active = allRes.companies.find(
            (c: any) => c.id === initRes.company.id,
          );
          setActiveCompany(active || allRes.companies[0]);
        }
      }
      setLoading(false);
    }
    init();
  }, []);

  const handleSwitch = async (company: any) => {
    if (activeCompany?.id === company.id) return;
    setLoading(true);
    const res = await switchCompany(company.id);
    if (res.success) {
      window.location.reload(); // Reload to refresh data context
    } else {
      toast.error("切换公司失败");
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!newCompanyName.trim()) {
      toast.error("请输入公司名称");
      return;
    }
    setIsCreating(true);
    const res = await createCompany(newCompanyName, selectedTemplate);
    if (res.success) {
      toast.success("公司创建成功！自动加载相关预置员工...");
      setIsDialogOpen(false);
      window.location.reload();
    } else {
      toast.error("创建失败：" + res.error);
      setIsCreating(false);
    }
  };

  if (loading && !companies.length) {
    return (
      <div className='flex items-center gap-2 px-2 py-1.5 w-full'>
        <Loader2 className='h-4 w-4 animate-spin text-slate-400' />
        <span className='text-sm text-slate-400'>加载中...</span>
      </div>
    );
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <div className='flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer w-full group transition-colors'>
            <div className='p-1.5 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 shadow-sm shrink-0'>
              <Sparkles className='h-3.5 w-3.5 text-white' />
            </div>
            <div className='flex flex-col flex-1 overflow-hidden'>
              <span className='font-bold text-sm truncate text-slate-800 dark:text-slate-200'>
                {activeCompany?.name || "一人公司"}
              </span>
              <span className='text-xs text-slate-500 truncate'>
                {activeCompany?.type === "developer"
                  ? "开发者模板"
                  : activeCompany?.type === "media"
                    ? "自媒体模板"
                    : activeCompany?.type === "education"
                      ? "教育模板"
                      : "自定义模板"}
              </span>
            </div>
            <ChevronsUpDown className='h-4 w-4 text-slate-400 group-hover:text-slate-600 shrink-0' />
          </div>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          className='w-[240px]'
          align='start'
        >
          <DropdownMenuLabel className='text-xs text-slate-500'>
            我的公司
          </DropdownMenuLabel>
          {companies.map((c) => (
            <DropdownMenuItem
              key={c.id}
              onClick={() => handleSwitch(c)}
              className='flex items-center justify-between cursor-pointer py-2'
            >
              <span className='truncate flex-1 font-medium'>{c.name}</span>
              {activeCompany?.id === c.id && (
                <Check className='h-4 w-4 text-blue-500 ml-2' />
              )}
            </DropdownMenuItem>
          ))}
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={() => {
              setNewCompanyName(templates[0].defaultName);
              setSelectedTemplate("developer");
              setIsDialogOpen(true);
            }}
            className='cursor-pointer text-blue-600 hover:text-blue-700 py-2'
          >
            <Plus className='h-4 w-4 mr-2' />
            <span>创建新公司</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog
        open={isDialogOpen}
        onOpenChange={(open) => {
          if (!open && companies.length === 0) return;
          setIsDialogOpen(open);
        }}
      >
        <DialogContent
          className='sm:max-w-[480px]'
          onPointerDownOutside={(e) => {
            if (companies.length === 0) e.preventDefault();
          }}
          onEscapeKeyDown={(e) => {
            if (companies.length === 0) e.preventDefault();
          }}
        >
          <DialogHeader>
            <DialogTitle>创建新公司</DialogTitle>
            <DialogDescription>
              选择一个模板并命名你的新一人公司。不同模板会针对不同业务预置相关专业的
              AI 员工。
            </DialogDescription>
          </DialogHeader>

          <div className='py-4 space-y-5'>
            <div className='space-y-2'>
              <label className='text-sm font-medium text-slate-700 dark:text-slate-300'>
                公司名称
              </label>
              <Input
                placeholder='我的创新工作室'
                value={newCompanyName}
                onChange={(e) => setNewCompanyName(e.target.value)}
                autoFocus
                maxLength={40}
              />
            </div>

            <div className='space-y-3'>
              <label className='text-sm font-medium text-slate-700 dark:text-slate-300'>
                选择业务模板
              </label>
              <div className='grid grid-cols-1 gap-3'>
                {templates.map((tpl) => (
                  <div
                    key={tpl.id}
                    onClick={() => {
                      const isDefaultName =
                        templates.some(
                          (t) => t.defaultName === newCompanyName,
                        ) || newCompanyName === "我的创新工作室";
                      if (isDefaultName || !newCompanyName) {
                        setNewCompanyName(tpl.defaultName);
                      }
                      setSelectedTemplate(tpl.id);
                    }}
                    className={`flex items-start gap-4 p-3 rounded-xl border-2 cursor-pointer transition-all ${
                      selectedTemplate === tpl.id
                        ? "border-blue-500 bg-blue-50/50 dark:bg-blue-900/10"
                        : "border-slate-100 dark:border-slate-800 hover:border-slate-200 dark:hover:border-slate-700"
                    }`}
                  >
                    <div className={`p-2 rounded-lg ${tpl.color}`}>
                      <tpl.icon className='h-5 w-5' />
                    </div>
                    <div>
                      <h4 className='font-semibold text-sm text-slate-900 dark:text-slate-100'>
                        {tpl.name}
                      </h4>
                      <p className='text-xs text-slate-500 mt-0.5'>
                        {tpl.desc}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <DialogFooter>
            {companies.length > 0 && (
              <Button
                variant='outline'
                onClick={() => setIsDialogOpen(false)}
              >
                取消
              </Button>
            )}
            <Button
              onClick={handleCreate}
              disabled={isCreating || !newCompanyName.trim()}
              className='bg-blue-600 hover:bg-blue-700 text-white'
            >
              {isCreating && <Loader2 className='h-4 w-4 mr-2 animate-spin' />}
              创建
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
