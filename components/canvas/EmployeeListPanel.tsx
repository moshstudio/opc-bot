"use client";

import { useState, useMemo } from "react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Search,
  Plus,
  User,
  Bot,
  Server,
  PenTool,
  Trash2,
  Copy,
  ChevronRight,
  Shield,
  Workflow,
  Clock,
} from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

import {
  getReadableDescription,
  type VisualCronConfig,
} from "@/lib/workflow/cron-utils";

export interface EmployeeItem {
  id: string;
  name: string;
  role: string;
  status: string;
  config?: string;
  workflow?: string;
  permissions?: string;
  linkedFrom?: any[];
  linkedTo?: any[];
}

const roleIcons: Record<string, any> = {
  assistant: Bot,
  life_assistant: Bot,
  devops: Server,
  deployment: Server,
  product_manager: PenTool,
  content_creator: PenTool,
};

const roleColors: Record<string, string> = {
  assistant: "from-violet-500 to-purple-500",
  life_assistant: "from-green-500 to-emerald-500",
  devops: "from-orange-500 to-amber-500",
  deployment: "from-red-500 to-rose-500",
  product_manager: "from-emerald-500 to-teal-500",
  content_creator: "from-pink-500 to-rose-500",
};

const roleLabels: Record<string, string> = {
  assistant: "助理",
  life_assistant: "生活助理",
  devops: "DevOps 工程师",
  deployment: "部署工程师",
  product_manager: "产品经理",
  content_creator: "内容创作者",
};

interface EmployeeListPanelProps {
  employees: EmployeeItem[];
  selectedId?: string;
  onSelect: (employee: EmployeeItem) => void;
  onAdd: () => void;
  onDelete: (id: string) => void;
  onDuplicate: (employee: EmployeeItem) => void;
}

export function EmployeeListPanel({
  employees,
  selectedId,
  onSelect,
  onAdd,
  onDelete,
  onDuplicate,
}: EmployeeListPanelProps) {
  const [searchQuery, setSearchQuery] = useState("");

  const filtered = useMemo(() => {
    if (!searchQuery.trim()) return employees;
    const q = searchQuery.toLowerCase();
    return employees.filter(
      (e) =>
        e.name.toLowerCase().includes(q) ||
        e.role.toLowerCase().includes(q) ||
        (roleLabels[e.role] || "").toLowerCase().includes(q),
    );
  }, [employees, searchQuery]);

  return (
    <div className='h-full flex flex-col bg-white/80 dark:bg-slate-950/80 backdrop-blur-xl border-r border-slate-200/60 dark:border-slate-800/60'>
      {/* Header */}
      <div className='px-4 pt-4 pb-3 space-y-3 border-b border-slate-100 dark:border-slate-800/50'>
        <div className='flex items-center justify-between'>
          <div className='flex items-center gap-2'>
            <div className='p-1.5 rounded-lg bg-gradient-to-br from-violet-500 to-purple-500'>
              <User className='w-3.5 h-3.5 text-white' />
            </div>
            <h2 className='text-sm font-bold text-slate-800 dark:text-slate-200'>
              我的员工
            </h2>
            <Badge
              variant='secondary'
              className='text-[10px] h-5 px-1.5 rounded-full'
            >
              {employees.length}
            </Badge>
          </div>
          <Button
            size='sm'
            onClick={onAdd}
            className='gap-1.5 rounded-xl h-8 bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 text-white text-xs shadow-lg'
          >
            <Plus className='w-3.5 h-3.5' />
            新建
          </Button>
        </div>

        {/* Search */}
        <div className='relative'>
          <Search className='absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400' />
          <Input
            placeholder='搜索员工...'
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className='pl-8 h-8 rounded-xl text-xs bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800'
          />
        </div>
      </div>

      {/* Employee List */}
      <ScrollArea className='flex-1'>
        <div className='p-2 space-y-1.5'>
          {filtered.length === 0 ? (
            <div className='text-center py-10 space-y-3'>
              <div className='inline-flex p-3 bg-slate-100 dark:bg-slate-800 rounded-full'>
                <User className='w-6 h-6 text-slate-400' />
              </div>
              <p className='text-sm text-slate-500'>
                {searchQuery ? "未找到匹配的员工" : "还没有员工"}
              </p>
              {!searchQuery && (
                <Button
                  size='sm'
                  variant='outline'
                  onClick={onAdd}
                  className='rounded-xl text-xs'
                >
                  <Plus className='w-3.5 h-3.5 mr-1' />
                  创建第一个员工
                </Button>
              )}
            </div>
          ) : (
            filtered.map((emp) => {
              const isSelected = emp.id === selectedId;
              const IconComp = roleIcons[emp.role] || User;
              const color =
                roleColors[emp.role] || "from-slate-500 to-slate-600";
              const hasWorkflow = !!emp.workflow;
              const subCount = emp.linkedFrom?.length || 0;

              let parsedPermissions: any = {};
              try {
                if (emp.permissions)
                  parsedPermissions = JSON.parse(emp.permissions);
              } catch {}

              // 检测定时任务
              let cronItems: { desc: string; cron: string }[] = [];
              try {
                if (emp.workflow) {
                  const workflowData = JSON.parse(emp.workflow);
                  const cronNodes =
                    workflowData.nodes?.filter(
                      (n: any) => n.type === "cron_trigger",
                    ) || [];

                  cronItems = cronNodes.map((node: any) => {
                    const data = node.data || {};
                    const config: VisualCronConfig = {
                      frequency: data.frequency || "daily",
                      time: data.time || "09:00",
                      daysOfWeek: data.daysOfWeek,
                      daysOfMonth: data.daysOfMonth,
                      interval: data.interval,
                      minute: data.minute,
                    };
                    return {
                      desc: getReadableDescription(config),
                      cron: data.cronExpression || data.cron || "",
                    };
                  });
                }
              } catch {}

              return (
                <div
                  key={emp.id}
                  onClick={() => onSelect(emp)}
                  className={cn(
                    "w-full text-left p-3 rounded-xl transition-all duration-200 group/card cursor-pointer",
                    isSelected
                      ? "bg-violet-50 dark:bg-violet-950/30 border-2 border-violet-300 dark:border-violet-700 shadow-sm"
                      : "hover:bg-slate-50 dark:hover:bg-slate-900/50 border-2 border-transparent",
                  )}
                >
                  <div className='flex items-start gap-2.5'>
                    {/* Role Icon */}
                    <div
                      className={cn(
                        "p-1.5 rounded-lg bg-gradient-to-br flex-shrink-0 mt-0.5",
                        color,
                      )}
                    >
                      <IconComp className='w-3.5 h-3.5 text-white' />
                    </div>

                    <div className='flex-1 min-w-0'>
                      <div className='flex items-center justify-between gap-1'>
                        <span className='text-sm font-semibold text-slate-800 dark:text-slate-200 truncate'>
                          {emp.name}
                        </span>
                        <div className='flex items-center gap-1 flex-shrink-0'>
                          {/* Status Dot */}
                          <div
                            className={cn(
                              "w-1.5 h-1.5 rounded-full",
                              emp.status === "active"
                                ? "bg-emerald-500"
                                : emp.status === "working"
                                  ? "bg-amber-500 animate-pulse"
                                  : "bg-slate-300 dark:bg-slate-600",
                            )}
                          />
                          <ChevronRight
                            className={cn(
                              "w-3.5 h-3.5 transition-transform",
                              isSelected
                                ? "text-violet-500"
                                : "text-slate-300 dark:text-slate-600",
                            )}
                          />
                        </div>
                      </div>

                      <p className='text-[10px] text-slate-500 mt-0.5'>
                        {roleLabels[emp.role] || emp.role}
                      </p>

                      {/* Meta info */}
                      <div className='flex items-center gap-2 mt-1.5'>
                        {hasWorkflow && (
                          <span className='inline-flex items-center gap-0.5 text-[9px] text-violet-500 bg-violet-50 dark:bg-violet-900/20 px-1.5 py-0.5 rounded-full'>
                            <Workflow className='w-2.5 h-2.5' />
                            工作流
                          </span>
                        )}
                        {cronItems.length > 0 && (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span className='inline-flex items-center gap-0.5 text-[9px] text-emerald-500 bg-emerald-50 dark:bg-emerald-900/20 px-1.5 py-0.5 rounded-full cursor-help'>
                                <Clock className='w-2.5 h-2.5' />
                                {cronItems.length > 1
                                  ? `${cronItems.length} 定时`
                                  : "定时"}
                              </span>
                            </TooltipTrigger>
                            <TooltipContent
                              side='top'
                              className='text-xs'
                            >
                              <div className='space-y-2 py-1'>
                                {cronItems.map((item, idx) => (
                                  <div
                                    key={idx}
                                    className={
                                      idx > 0
                                        ? "pt-2 border-t border-white/10"
                                        : ""
                                    }
                                  >
                                    <div className='font-medium'>
                                      {item.desc}
                                    </div>
                                    {item.cron && (
                                      <div className='text-[10px] opacity-70 mt-0.5 font-mono'>
                                        {item.cron}
                                      </div>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </TooltipContent>
                          </Tooltip>
                        )}
                        {subCount > 0 && (
                          <span className='inline-flex items-center gap-0.5 text-[9px] text-blue-500 bg-blue-50 dark:bg-blue-900/20 px-1.5 py-0.5 rounded-full'>
                            <User className='w-2.5 h-2.5' />
                            {subCount} 子员工
                          </span>
                        )}
                        {parsedPermissions.canExecute === false && (
                          <span className='inline-flex items-center gap-0.5 text-[9px] text-amber-500 bg-amber-50 dark:bg-amber-900/20 px-1.5 py-0.5 rounded-full'>
                            <Shield className='w-2.5 h-2.5' />
                            受限
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Action buttons - visible on hover */}
                  <div
                    className={cn(
                      "flex justify-end gap-1 mt-2 transition-all duration-150",
                      "opacity-0 h-0 group-hover/card:opacity-100 group-hover/card:h-6",
                    )}
                  >
                    <button
                      className='p-1 rounded-md hover:bg-blue-50 dark:hover:bg-blue-900/20 text-slate-400 hover:text-blue-500 transition-colors'
                      onClick={(e) => {
                        e.stopPropagation();
                        onDuplicate(emp);
                      }}
                      title='复制员工'
                    >
                      <Copy className='w-3 h-3' />
                    </button>
                    <button
                      className='p-1 rounded-md hover:bg-red-50 dark:hover:bg-red-900/20 text-slate-400 hover:text-red-500 transition-colors'
                      onClick={(e) => {
                        e.stopPropagation();
                        onDelete(emp.id);
                      }}
                      title='删除员工'
                    >
                      <Trash2 className='w-3 h-3' />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
