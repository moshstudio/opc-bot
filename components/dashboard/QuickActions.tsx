import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Users,
  ListTodo,
  PlusCircle,
  FileText,
  ArrowRight,
  Zap,
} from "lucide-react";
import Link from "next/link";

const actions = [
  {
    title: "管理员工",
    description: "查看和指挥 AI 团队",
    href: "/dashboard/employees",
    icon: Users,
    color: "from-violet-500 to-purple-600",
    bgLight: "bg-violet-50 dark:bg-violet-900/10",
  },
  {
    title: "管理任务",
    description: "分配和追踪任务进度",
    href: "/dashboard/tasks",
    icon: ListTodo,
    color: "from-amber-500 to-orange-600",
    bgLight: "bg-amber-50 dark:bg-amber-900/10",
  },
  {
    title: "知识库",
    description: "管理团队共享知识",
    href: "/dashboard/knowledge",
    icon: FileText,
    color: "from-emerald-500 to-teal-600",
    bgLight: "bg-emerald-50 dark:bg-emerald-900/10",
  },
  {
    title: "创建项目",
    description: "功能开发中",
    href: "#",
    icon: PlusCircle,
    color: "from-slate-400 to-slate-500",
    bgLight: "bg-slate-50 dark:bg-slate-900/10",
    disabled: true,
  },
];

export function QuickActions() {
  return (
    <Card className='col-span-3 border-0 shadow-sm bg-white dark:bg-slate-900 rounded-2xl'>
      <CardHeader className='pb-4'>
        <div className='flex items-center gap-2'>
          <div className='p-1.5 rounded-lg bg-amber-100 dark:bg-amber-900/20'>
            <Zap className='h-4 w-4 text-amber-600 dark:text-amber-400' />
          </div>
          <CardTitle className='text-base font-semibold'>快捷操作</CardTitle>
        </div>
      </CardHeader>
      <CardContent className='grid gap-3 md:grid-cols-2'>
        {actions.map((action) => {
          const Wrapper = action.disabled ? "div" : Link;
          const wrapperProps = action.disabled ? {} : { href: action.href };

          return (
            <Wrapper
              key={action.title}
              {...(wrapperProps as any)}
            >
              <button
                disabled={action.disabled}
                className={`w-full text-left p-4 rounded-xl border border-slate-100 dark:border-slate-800 transition-all duration-200 group ${
                  action.disabled
                    ? "opacity-50 cursor-not-allowed"
                    : "hover:shadow-md hover:-translate-y-0.5 hover:border-slate-200 dark:hover:border-slate-700 cursor-pointer"
                } ${action.bgLight}`}
              >
                <div className='flex items-start gap-3'>
                  <div
                    className={`p-2 rounded-lg bg-gradient-to-br ${action.color} shadow-sm`}
                  >
                    <action.icon className='h-4 w-4 text-white' />
                  </div>
                  <div className='flex-1 min-w-0'>
                    <div className='flex items-center justify-between'>
                      <span className='text-sm font-semibold text-slate-900 dark:text-slate-100'>
                        {action.title}
                      </span>
                      {!action.disabled && (
                        <ArrowRight className='h-3.5 w-3.5 text-slate-400 opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all' />
                      )}
                    </div>
                    <p className='text-[11px] text-slate-500 dark:text-slate-400 mt-0.5'>
                      {action.description}
                    </p>
                  </div>
                </div>
              </button>
            </Wrapper>
          );
        })}
      </CardContent>
    </Card>
  );
}
