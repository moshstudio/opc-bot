"use server";

import { db } from "@/lib/db";
import { getOrCreateCompany } from "./company-actions";

export async function getDashboardStats() {
  try {
    const res = await getOrCreateCompany();
    if (!res.success || !res.company) {
      return {
        employeeCount: 0,
        activeEmployeeCount: 0,
        taskCount: 0,
        pendingTaskCount: 0,
        recentTasks: [],
        recentActivity: [],
      };
    }
    const companyId = res.company.id;

    const [
      employeeCount,
      activeEmployeeCount,
      taskCount,
      pendingTaskCount,
      recentTasks,
      recentActivity,
    ] = await Promise.all([
      db.employee.count({ where: { companyId } }),
      db.employee.count({
        where: {
          companyId,
          status: {
            not: "idle",
          },
        },
      }),
      db.task.count({ where: { companyId } }),
      db.task.count({
        where: {
          companyId,
          status: "PENDING",
        },
      }),
      db.task.findMany({
        where: { companyId },
        take: 5,
        orderBy: {
          updatedAt: "desc",
        },
        include: {
          assignedTo: true,
        },
      }),
      db.task.findMany({
        where: { companyId },
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
