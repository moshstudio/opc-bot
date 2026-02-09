"use server";

import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";

const prisma = db;

export async function createKnowledgeBase(data: {
  name: string;
  content: string;
  companyId: string;
}) {
  try {
    const kb = await prisma.knowledgeBase.create({
      data: {
        name: data.name,
        content: data.content,
        companyId: data.companyId,
      },
    });
    revalidatePath("/dashboard/knowledge");
    return { success: true, kb };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function getKnowledgeBases(companyId: string) {
  try {
    const kbs = await prisma.knowledgeBase.findMany({
      where: { companyId },
      orderBy: { createdAt: "desc" },
    });
    return { success: true, kbs };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
