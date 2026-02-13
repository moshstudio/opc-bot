"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createTask } from "@/app/actions/task-actions";
import { getEmployees } from "@/app/actions/employee-actions";
import { useRouter } from "next/navigation";
import { Plus, ListTodo, FileText, UserCircle, Sparkles } from "lucide-react";

interface CreateTaskDialogProps {
  companyId: string;
}

export function CreateTaskDialog({ companyId }: CreateTaskDialogProps) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [assignedTo, setAssignedTo] = useState("unassigned");
  const [employees, setEmployees] = useState<any[]>([]);
  const router = useRouter();

  useEffect(() => {
    if (open) {
      getEmployees(companyId).then((res) => {
        if (res.success && res.employees) {
          setEmployees(res.employees);
        }
      });
    }
  }, [open, companyId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title) return;

    await createTask({
      title,
      description,
      assignedToId: assignedTo,
      companyId,
    });

    setOpen(false);
    setTitle("");
    setDescription("");
    setAssignedTo("unassigned");
    router.refresh();
  };

  return (
    <Dialog
      open={open}
      onOpenChange={setOpen}
    >
      <DialogTrigger asChild>
        <Button className='gap-2 shadow-lg hover:scale-[1.02] active:scale-[0.98] transition-all bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white rounded-xl px-5 py-2.5'>
          <Plus className='h-4 w-4' />
          <span>新建任务</span>
        </Button>
      </DialogTrigger>

      <DialogContent className='sm:max-w-[500px] p-0 overflow-hidden border-0 shadow-2xl rounded-2xl bg-white dark:bg-slate-950'>
        {/* Gradient header */}
        <div className='relative px-6 pt-6 pb-4 bg-gradient-to-br from-amber-500 to-orange-600'>
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImEiIHBhdHRlcm5Vbml0cz0idXNlclNwYWNlT25Vc2UiIHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCI+PHBhdGggZD0iTTAgMGg2MHY2MEgweiIgZmlsbD0ibm9uZSIvPjxjaXJjbGUgY3g9IjMwIiBjeT0iMzAiIHI9IjEiIGZpbGw9InJnYmEoMjU1LDI1NSwyNTUsMC4wOCkiLz48L3BhdHRlcm4+PC9kZWZzPjxyZWN0IGZpbGw9InVybCgjYSkiIHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiLz48L3N2Zz4=')] opacity-50" />
          <DialogHeader className='relative z-10'>
            <div className='flex items-center gap-3 mb-1'>
              <div className='p-2 bg-white/20 backdrop-blur-sm rounded-xl'>
                <ListTodo className='h-5 w-5 text-white' />
              </div>
              <DialogTitle className='text-xl font-bold text-white tracking-tight'>
                创建任务
              </DialogTitle>
            </div>
            <DialogDescription className='text-white/70 text-sm pl-[3.25rem]'>
              为您的 AI 团队添加新任务。
            </DialogDescription>
          </DialogHeader>
        </div>

        {/* Form */}
        <form
          onSubmit={handleSubmit}
          className='px-6 pb-6 pt-5 space-y-5'
        >
          <div>
            <Label className='text-sm font-medium flex items-center gap-2 mb-2'>
              <Sparkles className='h-3.5 w-3.5 text-amber-500' />
              任务标题
            </Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder='例如：研究市场趋势'
              required
              className='rounded-xl h-10 bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 focus:ring-2 focus:ring-amber-500/20 transition-shadow'
            />
          </div>

          <div>
            <Label className='text-sm font-medium flex items-center gap-2 mb-2'>
              <FileText className='h-3.5 w-3.5 text-blue-500' />
              任务描述
            </Label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder='详细描述这个任务...'
              className='flex min-h-[100px] w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 px-4 py-3 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/20 disabled:cursor-not-allowed disabled:opacity-50 transition-shadow'
            />
          </div>

          <div>
            <Label className='text-sm font-medium flex items-center gap-2 mb-2'>
              <UserCircle className='h-3.5 w-3.5 text-violet-500' />
              分配给
            </Label>
            <Select
              value={assignedTo}
              onValueChange={setAssignedTo}
            >
              <SelectTrigger className='rounded-xl h-10 bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800'>
                <SelectValue placeholder='选择员工' />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value='unassigned'>未分配（自动路由）</SelectItem>
                {employees.map((emp) => (
                  <SelectItem
                    key={emp.id}
                    value={emp.id}
                  >
                    {emp.name} ({emp.role})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Button
            type='submit'
            className='w-full h-11 rounded-xl font-semibold text-white shadow-lg transition-all duration-300 hover:shadow-xl hover:scale-[1.01] active:scale-[0.99] bg-gradient-to-r from-amber-500 to-orange-600'
          >
            创建任务
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
