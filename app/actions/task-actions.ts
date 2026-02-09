"use server";

import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";

const prisma = db;

export async function createTask(data: {
  title: string;
  description?: string;
  assignedToId?: string;
  companyId: string;
}) {
  try {
    const task = await prisma.task.create({
      data: {
        title: data.title,
        description: data.description,
        assignedToId:
          data.assignedToId === "unassigned" ? null : data.assignedToId,
        companyId: data.companyId,
        status: "PENDING",
      },
    });
    revalidatePath("/dashboard/tasks");
    return { success: true, task };
  } catch (error: any) {
    console.error("Failed to create task:", error);
    return { success: false, error: error.message };
  }
}

export async function getTasks(companyId: string) {
  try {
    const tasks = await prisma.task.findMany({
      where: { companyId },
      include: {
        assignedTo: true,
      },
      orderBy: { createdAt: "desc" },
    });
    return { success: true, tasks };
  } catch (error: any) {
    console.error("Failed to get tasks:", error);
    return { success: false, error: error.message };
  }
}

export type TaskStatus = "PENDING" | "IN_PROGRESS" | "COMPLETED" | "FAILED";

export async function updateTaskStatus(taskId: string, status: TaskStatus) {
  try {
    const task = await prisma.task.update({
      where: { id: taskId },
      data: { status },
    });
    revalidatePath("/dashboard/tasks");
    return { success: true, task };
  } catch (error: any) {
    console.error("Failed to update task status:", error);
    return { success: false, error: error.message };
  }
}

export async function deleteTask(taskId: string) {
  try {
    await prisma.task.delete({
      where: { id: taskId },
    });
    revalidatePath("/dashboard/tasks");
    return { success: true };
  } catch (error: any) {
    console.error("Failed to delete task:", error);
    return { success: false, error: error.message };
  }
}
