"use server";

import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { processTaskByBrain } from "@/lib/services/brain-center";

const prisma = db;

export type TaskStatus =
  | "PENDING"
  | "IN_PROGRESS"
  | "COMPLETED"
  | "FAILED"
  | "PAUSED"
  | "Brain_Processing";

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

    // 触发大脑中枢进行任务分析与拆解 (异步执行不阻塞返回)
    processTaskByBrain(task.id, task.companyId).catch(console.error);

    revalidatePath("/dashboard/tasks");
    return { success: true, task };
  } catch (error: any) {
    console.error("Failed to create task:", error);
    return { success: false, error: error.message };
  }
}

/**
 * 获取所有顶层任务（带子任务摘要信息）
 */
export async function getTasks(companyId: string) {
  try {
    const tasks = await prisma.task.findMany({
      where: { companyId, parentTaskId: null },
      include: {
        assignedTo: { select: { id: true, name: true, role: true } },
        subTasks: {
          include: {
            assignedTo: { select: { id: true, name: true, role: true } },
          },
          orderBy: { createdAt: "asc" },
        },
        _count: { select: { subTasks: true, messages: true } },
      },
      orderBy: { createdAt: "desc" },
    });
    return { success: true, tasks };
  } catch (error: any) {
    console.error("Failed to get tasks:", error);
    return { success: false, error: error.message };
  }
}

/**
 * 获取单个任务的完整详情（包括子任务、消息等）
 */
export async function getTaskWithDetails(taskId: string) {
  try {
    const task = await prisma.task.findUnique({
      where: { id: taskId },
      include: {
        assignedTo: { select: { id: true, name: true, role: true } },
        subTasks: {
          include: {
            assignedTo: { select: { id: true, name: true, role: true } },
            messages: { orderBy: { createdAt: "asc" } },
          },
          orderBy: { createdAt: "asc" },
        },
        messages: { orderBy: { createdAt: "asc" } },
        parentTask: {
          select: { id: true, title: true, status: true },
        },
      },
    });

    if (!task) {
      return { success: false, error: "任务不存在" };
    }

    return { success: true, task };
  } catch (error: any) {
    console.error("Failed to get task details:", error);
    return { success: false, error: error.message };
  }
}

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

/**
 * 重试失败的任务
 */
export async function retryTask(taskId: string) {
  try {
    const task = await prisma.task.findUnique({
      where: { id: taskId },
      include: { subTasks: true },
    });

    if (!task) {
      return { success: false, error: "任务不存在" };
    }

    if (task.parentTaskId) {
      // 子任务重试：重置状态并重新执行
      await prisma.task.update({
        where: { id: taskId },
        data: { status: "PENDING", result: null },
      });
      await prisma.taskMessage.create({
        data: {
          taskId,
          role: "system",
          content: "任务已重置，准备重新执行...",
        },
      });

      // 异步执行
      const { executeSingleTask } =
        await import("@/lib/services/task-executor");
      executeSingleTask(taskId, task.companyId).catch(console.error);
    } else {
      // 父任务重试：如果有失败的子任务，重试它们
      const failedSubTasks = task.subTasks.filter(
        (st) => st.status === "FAILED",
      );

      if (failedSubTasks.length > 0) {
        // 重置失败子任务
        for (const st of failedSubTasks) {
          await prisma.task.update({
            where: { id: st.id },
            data: { status: "PENDING", result: null },
          });
          await prisma.taskMessage.create({
            data: {
              taskId: st.id,
              role: "system",
              content: "任务已重置，准备重新执行...",
            },
          });
        }

        // 更新父任务状态
        await prisma.task.update({
          where: { id: taskId },
          data: { status: "IN_PROGRESS", result: null },
        });

        // 异步重新调度
        const { dispatchSubTasks } =
          await import("@/lib/services/task-executor");
        dispatchSubTasks(taskId, task.companyId).catch(console.error);
      } else if (task.subTasks.length === 0) {
        // 没有子任务的父任务 → 重新走 brain center
        await prisma.task.update({
          where: { id: taskId },
          data: { status: "PENDING", result: null },
        });
        processTaskByBrain(taskId, task.companyId).catch(console.error);
      }
    }

    revalidatePath("/dashboard/tasks");
    return { success: true };
  } catch (error: any) {
    console.error("Failed to retry task:", error);
    return { success: false, error: error.message };
  }
}

/**
 * 暂停任务
 */
export async function pauseTask(taskId: string) {
  try {
    const task = await prisma.task.update({
      where: { id: taskId },
      data: { status: "PAUSED" },
    });
    // 会在下次执行调度或者检查权限时生效
    revalidatePath("/dashboard/tasks");
    return { success: true, task };
  } catch (error: any) {
    console.error("Failed to pause task:", error);
    return { success: false, error: error.message };
  }
}

/**
 * 恢复/重试已暂停的任务
 */
export async function resumeTask(taskId: string) {
  try {
    const task = await prisma.task.findUnique({
      where: { id: taskId },
      include: { subTasks: true },
    });

    if (!task) return { success: false, error: "任务不存在" };

    if (task.parentTaskId) {
      await prisma.task.update({
        where: { id: taskId },
        data: { status: "PENDING" },
      });
      const { executeSingleTask } =
        await import("@/lib/services/task-executor");
      executeSingleTask(taskId, task.companyId).catch(console.error);
    } else {
      await prisma.task.update({
        where: { id: taskId },
        data: { status: "IN_PROGRESS" },
      });
      if (task.subTasks.length === 0) {
        processTaskByBrain(taskId, task.companyId).catch(console.error);
      } else {
        const { dispatchSubTasks } =
          await import("@/lib/services/task-executor");
        dispatchSubTasks(taskId, task.companyId).catch(console.error);
      }
    }
    revalidatePath("/dashboard/tasks");
    return { success: true };
  } catch (error: any) {
    console.error("Failed to resume task:", error);
    return { success: false, error: error.message };
  }
}

/**
 * 删除任务（包括所有子任务和消息）
 */
export async function deleteTask(taskId: string) {
  try {
    // 先删除所有子任务的消息
    const subTasks = await prisma.task.findMany({
      where: { parentTaskId: taskId },
      select: { id: true },
    });

    if (subTasks.length > 0) {
      await prisma.taskMessage.deleteMany({
        where: { taskId: { in: subTasks.map((st) => st.id) } },
      });
      await prisma.task.deleteMany({
        where: { parentTaskId: taskId },
      });
    }

    // 删除父任务的消息
    await prisma.taskMessage.deleteMany({
      where: { taskId },
    });

    // 删除任务本身
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
