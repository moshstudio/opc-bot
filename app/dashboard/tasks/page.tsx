import { CreateTaskDialog } from "@/components/tasks/CreateTaskDialog";
import { TaskBoard } from "@/components/tasks/TaskBoard";
import { getTasks } from "@/app/actions/task-actions";
import { getOrCreateCompany } from "@/app/actions/company-actions";
import { AlertTriangle } from "lucide-react";

export default async function TasksPage() {
  const companyRes = await getOrCreateCompany();

  if (!companyRes.success || !companyRes.company) {
    return (
      <div className='container mx-auto p-6 max-w-7xl'>
        <div className='flex flex-col items-center justify-center py-16 text-center'>
          <div className='p-3 bg-red-100 dark:bg-red-900/20 rounded-full text-red-600 dark:text-red-400 mb-4'>
            <AlertTriangle className='w-8 h-8' />
          </div>
          <h3 className='text-lg font-semibold'>加载失败</h3>
          <p className='text-muted-foreground mt-2'>
            无法加载公司数据，请检查数据库连接。
          </p>
        </div>
      </div>
    );
  }

  const companyId = companyRes.company.id;
  const tasksRes = await getTasks(companyId);
  const tasks = tasksRes.success && tasksRes.tasks ? tasksRes.tasks : [];

  return (
    <div className='flex flex-col h-full p-6 space-y-6 animate-in fade-in duration-500'>
      <div className='flex flex-col md:flex-row md:items-center justify-between gap-4'>
        <div>
          <h2 className='text-3xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-amber-600 to-orange-600 dark:from-amber-400 dark:to-orange-400'>
            任务中心
          </h2>
          <p className='text-muted-foreground mt-2 text-lg'>
            管理和追踪 AI 团队的任务进度。
          </p>
        </div>
        <CreateTaskDialog companyId={companyId} />
      </div>

      <div className='flex-1 min-h-0'>
        <TaskBoard initialTasks={tasks} />
      </div>
    </div>
  );
}
