"use client";

import { useState } from "react";
import { TaskBoard } from "@/components/tasks/TaskBoard";
import { TaskDetailPanel } from "@/components/tasks/TaskDetailPanel";

interface TasksClientProps {
  initialTasks: any[];
  companyId: string;
}

export function TasksClient({ initialTasks, companyId }: TasksClientProps) {
  const [detailTaskId, setDetailTaskId] = useState<string | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  const handleViewDetail = (taskId: string) => {
    setDetailTaskId(taskId);
    setDetailOpen(true);
  };

  return (
    <>
      <TaskBoard
        initialTasks={initialTasks}
        companyId={companyId}
        onViewDetail={handleViewDetail}
      />
      <TaskDetailPanel
        taskId={detailTaskId}
        open={detailOpen}
        onOpenChange={setDetailOpen}
      />
    </>
  );
}
