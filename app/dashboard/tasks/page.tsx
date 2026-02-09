import { CreateTaskDialog } from "@/components/tasks/CreateTaskDialog";
import { TaskBoard } from "@/components/tasks/TaskBoard";
import { getTasks } from "@/app/actions/task-actions";
import { getOrCreateCompany } from "@/app/actions/company-actions";

export default async function TasksPage() {
  const companyRes = await getOrCreateCompany();

  if (!companyRes.success || !companyRes.company) {
    return (
      <div>Error loading company data. Please check database connection.</div>
    );
  }

  const companyId = companyRes.company.id;
  const tasksRes = await getTasks(companyId);
  const tasks = tasksRes.success && tasksRes.tasks ? tasksRes.tasks : [];

  return (
    <div className='flex flex-col h-full p-6 space-y-6'>
      <div className='flex items-center justify-between'>
        <div>
          <h2 className='text-3xl font-bold tracking-tight'>任务</h2>
          <p className='text-muted-foreground'>管理 AI 团队的任务。</p>
        </div>
        <CreateTaskDialog companyId={companyId} />
      </div>

      <div className='flex-1 min-h-0'>
        <TaskBoard initialTasks={tasks} />
      </div>
    </div>
  );
}
