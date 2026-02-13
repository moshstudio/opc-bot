import { getDashboardStats } from "@/app/actions/dashboard";
import { StatsCard } from "@/components/dashboard/StatsCard";
import { RecentActivity } from "@/components/dashboard/RecentActivity";
import { QuickActions } from "@/components/dashboard/QuickActions";
import { Users, UserCheck, ListTodo, Clock } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const stats = await getDashboardStats();

  return (
    <div className='container mx-auto p-6 space-y-8 animate-in fade-in duration-500 max-w-7xl'>
      {/* Page Header */}
      <div>
        <h2 className='text-3xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-400 dark:to-indigo-400'>
          公司概览
        </h2>
        <p className='text-muted-foreground mt-2 text-lg'>
          您的 AI 团队运行状况一览。
        </p>
      </div>

      {/* Stats Grid */}
      <div className='grid gap-5 md:grid-cols-2 lg:grid-cols-4'>
        <StatsCard
          title='员工总数'
          value={stats.employeeCount}
          icon={Users}
          description='拥有和空闲的所有员工'
          color='from-violet-500 to-purple-500'
        />
        <StatsCard
          title='活跃员工'
          value={stats.activeEmployeeCount}
          icon={UserCheck}
          description='当前正在工作的员工'
          color='from-emerald-500 to-teal-500'
        />
        <StatsCard
          title='任务总数'
          value={stats.taskCount}
          icon={ListTodo}
          description='系统中的所有任务'
          color='from-amber-500 to-orange-500'
        />
        <StatsCard
          title='待处理任务'
          value={stats.pendingTaskCount}
          icon={Clock}
          description='等待分配的任务'
          color='from-sky-500 to-blue-500'
        />
      </div>

      {/* Activity & Quick Actions */}
      <div className='grid gap-5 md:grid-cols-2 lg:grid-cols-7'>
        <RecentActivity tasks={stats.recentTasks} />
        <QuickActions />
      </div>
    </div>
  );
}
