import { CreateTaskDialog } from "@/components/tasks/CreateTaskDialog";
import { TasksClient } from "@/components/tasks/TasksClient";
import { getTasks } from "@/app/actions/task-actions";
import { getOrCreateCompany } from "@/app/actions/company-actions";

export default async function TasksPage() {
  const companyRes = await getOrCreateCompany();

  const companyId =
    companyRes.success && companyRes.company ? companyRes.company.id : "";
  const tasksRes = companyId
    ? await getTasks(companyId)
    : { success: true, tasks: [] };
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
        <TasksClient initialTasks={tasks} companyId={companyId} />
      </div>
    </div>
  );
}
