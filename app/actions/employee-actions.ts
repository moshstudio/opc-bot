"use server";

import { db } from "@/lib/db";
import { syncScheduledWorkflows } from "@/lib/scheduler-worker";

const prisma = db;

export async function getEmployees(companyId: string) {
  try {
    const employees = await prisma.employee.findMany({
      where: { companyId },
      orderBy: { createdAt: "asc" },
      include: {
        linkedFrom: {
          include: {
            target: {
              select: { id: true, name: true, role: true, isActive: true },
            },
          },
        },
        linkedTo: {
          include: {
            source: {
              select: { id: true, name: true, role: true, isActive: true },
            },
          },
        },
      },
    });
    return { success: true, employees };
  } catch (error: any) {
    console.error("Failed to get employees:", error);
    return { success: false, error: error.message };
  }
}

export async function createEmployee(data: {
  name: string;
  role: string;
  companyId: string;
  config?: any;
  workflow?: any;
  permissions?: any;
}) {
  try {
    const employee = await prisma.employee.create({
      data: {
        name: data.name,
        role: data.role,
        companyId: data.companyId,
        config: data.config ? JSON.stringify(data.config) : undefined,
        workflow: data.workflow ? JSON.stringify(data.workflow) : undefined,
        permissions: data.permissions
          ? JSON.stringify(data.permissions)
          : JSON.stringify({
              canRead: true,
              canWrite: true,
              canExecute: true,
            }),
        status: "idle",
      },
    });

    // 触发调度器同步
    await syncScheduledWorkflows();

    return { success: true, employee };
  } catch (error: any) {
    console.error("Failed to create employee:", error);
    return { success: false, error: error.message };
  }
}

export async function updateEmployee(
  id: string,
  data: {
    name?: string;
    role?: string;
    status?: string;
    config?: any;
    workflow?: any;
    permissions?: any;
    isActive?: boolean;
  },
) {
  try {
    const updateData: any = { ...data };
    if (data.config) updateData.config = JSON.stringify(data.config);
    if (data.workflow) updateData.workflow = JSON.stringify(data.workflow);
    if (data.permissions)
      updateData.permissions = JSON.stringify(data.permissions);

    const employee = await prisma.employee.update({
      where: { id },
      data: updateData,
    });

    // 触发调度器同步
    await syncScheduledWorkflows();

    return { success: true, employee };
  } catch (error: any) {
    console.error("Failed to update employee:", error);
    return { success: false, error: error.message };
  }
}

export async function deleteEmployee(id: string) {
  try {
    await prisma.$transaction(async (tx) => {
      // 1. Delete all links associated with this employee
      await tx.employeeLink.deleteMany({
        where: {
          OR: [{ sourceId: id }, { targetId: id }],
        },
      });

      // 2. Delete all messages related to this employee
      await tx.message.deleteMany({
        where: { employeeId: id },
      });

      // 3. Dissociate tasks from this employee
      await tx.task.updateMany({
        where: { assignedToId: id },
        data: { assignedToId: null },
      });

      // 4. Update subordinates to remove this employee as their manager
      await tx.employee.updateMany({
        where: { parentId: id },
        data: { parentId: null },
      });

      // 5. Finally delete the employee
      await tx.employee.delete({
        where: { id },
      });
    });

    // 触发调度器同步
    await syncScheduledWorkflows();

    return { success: true };
  } catch (error: any) {
    console.error("Failed to delete employee:", error);
    return { success: false, error: error.message };
  }
}

export async function updateEmployeePosition(
  id: string,
  position: { x: number; y: number },
) {
  try {
    const employee = await prisma.employee.findUnique({ where: { id } });
    if (!employee) return { success: false, error: "Employee not found" };

    const config = employee.config ? JSON.parse(employee.config) : {};
    config.position = position;

    await prisma.employee.update({
      where: { id },
      data: { config: JSON.stringify(config) },
    });
    return { success: true };
  } catch (error: any) {
    console.error("Failed to update position:", error);
    return { success: false, error: error.message };
  }
}

export async function updateEmployeeParent(
  employeeId: string,
  parentId: string | null,
) {
  try {
    await prisma.employee.update({
      where: { id: employeeId },
      data: { parentId },
    });
    return { success: true };
  } catch (error: any) {
    console.error("Failed to update parent:", error);
    return { success: false, error: error.message };
  }
}

// ---- Employee Link (Sub-employee) Actions ----

export async function linkEmployee(
  sourceId: string,
  targetId: string,
  permissions?: any,
  description?: string,
) {
  try {
    const link = await prisma.employeeLink.create({
      data: {
        sourceId,
        targetId,
        permissions: permissions ? JSON.stringify(permissions) : undefined,
        description,
      },
    });
    return { success: true, link };
  } catch (error: any) {
    console.error("Failed to link employee:", error);
    return { success: false, error: error.message };
  }
}

export async function unlinkEmployee(linkId: string) {
  try {
    await prisma.employeeLink.delete({
      where: { id: linkId },
    });
    return { success: true };
  } catch (error: any) {
    console.error("Failed to unlink employee:", error);
    return { success: false, error: error.message };
  }
}

export async function getEmployeeLinks(employeeId: string) {
  try {
    const links = await prisma.employeeLink.findMany({
      where: { sourceId: employeeId },
      include: {
        target: { select: { id: true, name: true, role: true, status: true } },
      },
    });
    return { success: true, links };
  } catch (error: any) {
    console.error("Failed to get links:", error);
    return { success: false, error: error.message };
  }
}

// ---- Workflow Actions ----

export async function updateEmployeeWorkflow(id: string, workflow: any) {
  try {
    await prisma.employee.update({
      where: { id },
      data: { workflow: JSON.stringify(workflow) },
    });

    // 触发调度器同步
    await syncScheduledWorkflows();

    return { success: true };
  } catch (error: any) {
    console.error("Failed to update workflow:", error);
    return { success: false, error: error.message };
  }
}

export async function getEmployeeLogs(employeeId: string, limit: number = 50) {
  try {
    const logs = await prisma.employeeLog.findMany({
      where: { employeeId },
      orderBy: { createdAt: "desc" },
      take: limit,
    });
    return { success: true, logs };
  } catch (error: any) {
    console.error("Failed to get employee logs:", error);
    return { success: false, error: error.message };
  }
}

export async function deleteEmployeeLog(logId: string) {
  try {
    await prisma.employeeLog.delete({
      where: { id: logId },
    });
    return { success: true };
  } catch (error: any) {
    console.error("Failed to delete employee log:", error);
    return { success: false, error: error.message };
  }
}

export async function deleteEmployeeLogsBefore(
  employeeId: string,
  timestamp: Date,
) {
  try {
    await prisma.employeeLog.deleteMany({
      where: {
        employeeId,
        createdAt: {
          lt: timestamp,
        },
      },
    });
    return { success: true };
  } catch (error: any) {
    console.error("Failed to delete employee logs before:", error);
    return { success: false, error: error.message };
  }
}

export async function clearEmployeeLogs(employeeId: string) {
  try {
    await prisma.employeeLog.deleteMany({
      where: { employeeId },
    });
    return { success: true };
  } catch (error: any) {
    console.error("Failed to clear employee logs:", error);
    return { success: false, error: error.message };
  }
}
