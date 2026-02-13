"use server";

import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";

const prisma = db;

// ===================== KnowledgeBase CRUD =====================

export async function createKnowledgeBase(data: {
  name: string;
  description?: string;
  icon?: string;
  companyId: string;
}) {
  try {
    const kb = await prisma.knowledgeBase.create({
      data: {
        name: data.name,
        description: data.description || null,
        icon: data.icon || "📚",
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
      orderBy: { updatedAt: "desc" },
      include: {
        _count: { select: { documents: true } },
        documents: {
          select: { wordCount: true, characterCount: true },
        },
      },
    });

    const result = kbs.map((kb) => ({
      id: kb.id,
      name: kb.name,
      description: kb.description,
      icon: kb.icon,
      isShared: kb.isShared,
      documentCount: kb._count.documents,
      totalWords: kb.documents.reduce((sum, d) => sum + d.wordCount, 0),
      totalChars: kb.documents.reduce((sum, d) => sum + d.characterCount, 0),
      createdAt: kb.createdAt,
      updatedAt: kb.updatedAt,
    }));

    return { success: true, kbs: result };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function getKnowledgeBase(id: string) {
  try {
    const kb = await prisma.knowledgeBase.findUnique({
      where: { id },
      include: {
        documents: {
          orderBy: { createdAt: "desc" },
        },
      },
    });
    if (!kb) return { success: false, error: "知识库不存在" };
    return { success: true, kb };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function updateKnowledgeBase(
  id: string,
  data: {
    name?: string;
    description?: string;
    icon?: string;
    isShared?: boolean;
  }
) {
  try {
    const kb = await prisma.knowledgeBase.update({
      where: { id },
      data,
    });
    revalidatePath("/dashboard/knowledge");
    return { success: true, kb };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function deleteKnowledgeBase(id: string) {
  try {
    await prisma.knowledgeBase.delete({ where: { id } });
    revalidatePath("/dashboard/knowledge");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// ===================== Document CRUD =====================

function countWords(text: string): number {
  // Count Chinese characters + English words
  const chineseChars = (text.match(/[\u4e00-\u9fff]/g) || []).length;
  const englishWords = text
    .replace(/[\u4e00-\u9fff]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 0).length;
  return chineseChars + englishWords;
}

export async function createDocument(data: {
  name: string;
  content: string;
  type?: string;
  knowledgeBaseId: string;
}) {
  try {
    const wordCount = countWords(data.content);
    const characterCount = data.content.length;

    const doc = await prisma.document.create({
      data: {
        name: data.name,
        content: data.content,
        type: data.type || "text",
        status: "ready",
        wordCount,
        characterCount,
        knowledgeBaseId: data.knowledgeBaseId,
      },
    });

    // Touch the KB to update its updatedAt
    await prisma.knowledgeBase.update({
      where: { id: data.knowledgeBaseId },
      data: { updatedAt: new Date() },
    });

    revalidatePath("/dashboard/knowledge");
    return { success: true, doc };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function updateDocument(
  id: string,
  data: { name?: string; content?: string }
) {
  try {
    const updateData: any = { ...data };

    if (data.content !== undefined) {
      updateData.wordCount = countWords(data.content);
      updateData.characterCount = data.content.length;
    }

    const doc = await prisma.document.update({
      where: { id },
      data: updateData,
    });

    // Touch the KB
    await prisma.knowledgeBase.update({
      where: { id: doc.knowledgeBaseId },
      data: { updatedAt: new Date() },
    });

    revalidatePath("/dashboard/knowledge");
    return { success: true, doc };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function deleteDocument(id: string) {
  try {
    const doc = await prisma.document.delete({ where: { id } });

    // Touch the KB
    await prisma.knowledgeBase.update({
      where: { id: doc.knowledgeBaseId },
      data: { updatedAt: new Date() },
    });

    revalidatePath("/dashboard/knowledge");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function searchKnowledgeBases(
  companyId: string,
  query: string
) {
  try {
    const kbs = await prisma.knowledgeBase.findMany({
      where: {
        companyId,
        OR: [
          { name: { contains: query } },
          { description: { contains: query } },
        ],
      },
      orderBy: { updatedAt: "desc" },
      include: {
        _count: { select: { documents: true } },
        documents: {
          select: { wordCount: true, characterCount: true },
        },
      },
    });

    const result = kbs.map((kb) => ({
      id: kb.id,
      name: kb.name,
      description: kb.description,
      icon: kb.icon,
      isShared: kb.isShared,
      documentCount: kb._count.documents,
      totalWords: kb.documents.reduce((sum, d) => sum + d.wordCount, 0),
      totalChars: kb.documents.reduce((sum, d) => sum + d.characterCount, 0),
      createdAt: kb.createdAt,
      updatedAt: kb.updatedAt,
    }));

    return { success: true, kbs: result };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
