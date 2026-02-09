"use server";

import { db } from "@/lib/db";

const prisma = db;

export async function getEmployees(companyId: string) {
  try {
    const employees = await prisma.employee.findMany({
      where: { companyId },
      orderBy: { createdAt: "asc" },
    });
    return { success: true, employees };
  } catch (error: any) {
    console.error("Failed to get employees:", error);
    return { success: false, error: error.message };
  }
}
