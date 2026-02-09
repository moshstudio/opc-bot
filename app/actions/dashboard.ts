"use server";

import { db } from "@/lib/db";

export async function getDashboardStats() {
  try {
    const [
      employeeCount,
      activeEmployeeCount,
      taskCount,
      pendingTaskCount,
      recentTasks,
      recentActivity,
    ] = await Promise.all([
      db.employee.count(),
      db.employee.count({
        where: {
          status: {
            not: "idle",
          },
        },
      }),
      db.task.count(),
      db.task.count({
        where: {
          status: "PENDING",
        },
      }),
      db.task.findMany({
        take: 5,
        orderBy: {
          updatedAt: "desc",
        },
        include: {
          assignedTo: true,
        },
      }),
      // For now, let's use tasks as activity.
      // In a real app, we might have a separate ActivityLog model.
      db.task.findMany({
        take: 5,
        orderBy: {
          createdAt: "desc",
        },
        include: {
          assignedTo: true,
        },
      }),
    ]);

    return {
      employeeCount,
      activeEmployeeCount,
      taskCount,
      pendingTaskCount,
      recentTasks,
      recentActivity,
    };
  } catch (error) {
    console.error("Failed to fetch dashboard stats:", error);
    throw new Error("Failed to fetch dashboard stats");
  }
}
