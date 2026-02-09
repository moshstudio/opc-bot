import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface Task {
  id: string;
  title: string;
  status: string;
  updatedAt: Date;
  assignedTo?: {
    name: string;
  } | null;
}

interface RecentActivityProps {
  tasks: Task[];
}

export function RecentActivity({ tasks }: RecentActivityProps) {
  return (
    <Card className='col-span-3'>
      <CardHeader>
        <CardTitle>近期活动</CardTitle>
      </CardHeader>
      <CardContent>
        <div className='space-y-8'>
          {tasks.length === 0 ? (
            <p className='text-muted-foreground'>暂无近期活动。</p>
          ) : (
            tasks.map((task) => (
              <div
                key={task.id}
                className='flex items-center'
              >
                <Avatar className='h-9 w-9'>
                  <AvatarImage
                    src='/avatars/01.png'
                    alt='Avatar'
                  />
                  <AvatarFallback>
                    {task.assignedTo?.name?.[0] || "?"}
                  </AvatarFallback>
                </Avatar>
                <div className='ml-4 space-y-1'>
                  <p className='text-sm font-medium leading-none'>
                    {task.title}
                  </p>
                  <p className='text-sm text-muted-foreground'>
                    {task.assignedTo
                      ? `分配给 ${task.assignedTo.name}`
                      : "未分配"}{" "}
                    - {task.status}
                  </p>
                </div>
                <div className='ml-auto font-medium'>
                  {new Date(task.updatedAt).toLocaleDateString()}
                </div>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}
