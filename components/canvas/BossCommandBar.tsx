"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Send,
  Users,
  ChevronDown,
  Sparkles,
  Loader2,
  User,
  Check,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";

export interface EmployeeOption {
  id: string;
  name: string;
  role: string;
  status: string;
}

interface BossCommandBarProps {
  employees: EmployeeOption[];
  onDispatch: (message: string, selectedIds: string[]) => Promise<void>;
  isWorking: boolean;
}

export function BossCommandBar({
  employees,
  onDispatch,
  isWorking,
}: BossCommandBarProps) {
  const [input, setInput] = useState("");
  const [isExpanded, setIsExpanded] = useState(true);
  const [showEmployeeList, setShowEmployeeList] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const toggleEmployee = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  };

  const selectAll = () => {
    if (selectedIds.length === employees.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(employees.map((e) => e.id));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isWorking) return;
    onDispatch(input, selectedIds);
    setInput("");
  };

  const isAutoMode = selectedIds.length === 0;

  if (!isExpanded) {
    return (
      <div className='absolute bottom-6 left-1/2 transform -translate-x-1/2 z-30'>
        <Button
          onClick={() => setIsExpanded(true)}
          className='rounded-2xl shadow-2xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white transition-all px-6 py-3 h-auto gap-2 hover:scale-[1.03] active:scale-[0.97]'
          size='lg'
        >
          <Users className='w-5 h-5' />
          <span className='font-semibold'>老板指挥台</span>
        </Button>
      </div>
    );
  }

  return (
    <div className='absolute bottom-6 left-1/2 transform -translate-x-1/2 w-[640px] max-w-[90vw] z-30 animate-in slide-in-from-bottom-5 fade-in duration-300'>
      <div className='bg-white/90 dark:bg-slate-950/90 backdrop-blur-xl border border-slate-200/60 dark:border-slate-800/60 shadow-2xl rounded-2xl overflow-hidden'>
        {/* Employee Selector Dropdown */}
        {showEmployeeList && (
          <div className='border-b border-slate-100 dark:border-slate-800/50 animate-in slide-in-from-bottom-2 duration-200'>
            <div className='p-2'>
              <div className='flex items-center justify-between px-2 py-1 mb-1'>
                <span className='text-[10px] font-semibold text-slate-500 uppercase tracking-wider'>
                  选择执行员工
                </span>
                <button
                  onClick={selectAll}
                  className='text-[10px] text-violet-500 hover:text-violet-700 font-medium'
                >
                  {selectedIds.length === employees.length
                    ? "取消全选"
                    : "全选"}
                </button>
              </div>
              <ScrollArea className='max-h-[160px]'>
                <div className='space-y-0.5'>
                  {employees.map((emp) => {
                    const isChecked = selectedIds.includes(emp.id);
                    return (
                      <button
                        key={emp.id}
                        onClick={() => toggleEmployee(emp.id)}
                        className={cn(
                          "w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg transition-all text-left",
                          isChecked
                            ? "bg-violet-50 dark:bg-violet-900/20"
                            : "hover:bg-slate-50 dark:hover:bg-slate-900/50",
                        )}
                      >
                        <div
                          className={cn(
                            "w-4 h-4 rounded border-2 flex items-center justify-center transition-colors",
                            isChecked
                              ? "bg-violet-500 border-violet-500"
                              : "border-slate-300 dark:border-slate-600",
                          )}
                        >
                          {isChecked && (
                            <Check className='w-2.5 h-2.5 text-white' />
                          )}
                        </div>
                        <div className='p-1 rounded-md bg-slate-100 dark:bg-slate-800'>
                          <User className='w-3 h-3 text-slate-500' />
                        </div>
                        <div className='flex-1 min-w-0'>
                          <span className='text-xs font-medium text-slate-700 dark:text-slate-300 truncate block'>
                            {emp.name}
                          </span>
                        </div>
                        <span className='text-[10px] text-slate-400'>
                          {emp.role}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </ScrollArea>
            </div>
          </div>
        )}

        {/* Header */}
        <div className='flex items-center justify-between px-4 py-2.5 border-b border-slate-100 dark:border-slate-800/50 bg-slate-50/50 dark:bg-slate-900/50'>
          <div className='flex items-center gap-2 text-sm'>
            {isAutoMode ? (
              <>
                <div className='p-1 rounded-md bg-gradient-to-br from-violet-500 to-indigo-500'>
                  <Sparkles className='w-3 h-3 text-white' />
                </div>
                <span className='font-semibold text-violet-700 dark:text-violet-300 text-xs'>
                  自动调度模式
                </span>
                <span className='text-[10px] text-slate-400 bg-violet-50 dark:bg-violet-900/20 px-1.5 py-0.5 rounded-md border border-violet-100 dark:border-violet-800/50'>
                  AI 将自动选择最佳执行者
                </span>
              </>
            ) : (
              <>
                <div className='p-1 rounded-md bg-gradient-to-br from-emerald-500 to-teal-500'>
                  <Users className='w-3 h-3 text-white' />
                </div>
                <span className='font-semibold text-emerald-700 dark:text-emerald-300 text-xs'>
                  已选择 {selectedIds.length} 位员工
                </span>
              </>
            )}
          </div>
          <div className='flex items-center gap-1'>
            <Button
              variant='ghost'
              size='sm'
              onClick={() => setShowEmployeeList(!showEmployeeList)}
              className={cn(
                "h-6 px-2 rounded-lg text-[10px] gap-1",
                showEmployeeList
                  ? "bg-violet-50 dark:bg-violet-900/20 text-violet-600"
                  : "hover:bg-slate-100 dark:hover:bg-slate-800",
              )}
            >
              <Users className='w-3 h-3' />
              {showEmployeeList ? "收起" : "选择员工"}
            </Button>
            <Button
              variant='ghost'
              size='sm'
              onClick={() => setIsExpanded(false)}
              className='h-6 w-6 p-0 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800'
            >
              <ChevronDown className='w-3.5 h-3.5 text-slate-400' />
            </Button>
          </div>
        </div>

        {/* Input Area */}
        <form
          onSubmit={handleSubmit}
          className='p-3'
        >
          <div className='relative'>
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={
                isAutoMode
                  ? "输入指令... (AI 将自动路由给专家)"
                  : `向 ${selectedIds.length} 位员工发送任务...`
              }
              className='h-12 pl-4 pr-14 text-sm rounded-xl bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 focus:ring-2 focus:ring-violet-500/20 transition-shadow placeholder:text-slate-400'
              disabled={isWorking}
            />
            <Button
              type='submit'
              size='icon'
              className={`absolute right-1.5 top-1/2 -translate-y-1/2 h-9 w-9 rounded-lg shadow-sm transition-all active:scale-95 ${
                isWorking
                  ? "bg-amber-500 hover:bg-amber-600"
                  : "bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700"
              } text-white`}
              disabled={!input.trim() || isWorking}
            >
              {isWorking ? (
                <Loader2 className='h-4 w-4 animate-spin' />
              ) : (
                <Send className='h-4 w-4' />
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
