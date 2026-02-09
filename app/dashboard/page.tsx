import { getDashboardStats } from "@/app/actions/dashboard";
import { StatsCard } from "@/components/dashboard/StatsCard";
import { RecentActivity } from "@/components/dashboard/RecentActivity";
import { QuickActions } from "@/components/dashboard/QuickActions";
import { Users, UserCheck, ListTodo, Clock } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const stats = await getDashboardStats();

  return (
    <div className='flex-1 space-y-4 p-8 pt-6'>
      <div className='flex items-center justify-between space-y-2'>
        <h2 className='text-3xl font-bold tracking-tight'>概览</h2>
      </div>
      <div className='grid gap-4 md:grid-cols-2 lg:grid-cols-4'>
        <StatsCard
          title='员工总数'
          value={stats.employeeCount}
          icon={Users}
          description='拥有和空闲的所有员工'
        />
        <StatsCard
          title='活跃员工'
          value={stats.activeEmployeeCount}
          icon={UserCheck}
          description='当前正在工作的员工'
        />
        <StatsCard
          title='任务总数'
          value={stats.taskCount}
          icon={ListTodo}
          description='系统中的所有任务'
        />
        <StatsCard
          title='待处理任务'
          value={stats.pendingTaskCount}
          icon={Clock}
          description='等待分配的任务'
        />
      </div>
      <div className='grid gap-4 md:grid-cols-2 lg:grid-cols-7'>
        <RecentActivity tasks={stats.recentTasks} />
        <QuickActions />
      </div>
    </div>
  );
}
