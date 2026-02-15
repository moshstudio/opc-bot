"use server";

import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { splitText } from "@/lib/mastra/utils";

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
  },
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
  modelConfig?: any;
}) {
  try {
    const wordCount = countWords(data.content);
    const characterCount = data.content.length;

    const doc = await prisma.document.create({
      data: {
        name: data.name,
        content: data.content,
        type: data.type || "text",
        status: "processing", // 改为 processing 表示正在向量化
        wordCount,
        characterCount,
        knowledgeBaseId: data.knowledgeBaseId,
      },
    });

    // 异步触发 Mastra RAG 索引
    try {
      const { rag } = await import("@/lib/mastra/rag");

      // 执行文本切片
      const chunks = splitText(data.content, 800, 150);

      // 准备批量索引数据
      const entities = chunks.map((chunk, index) => ({
        id: `${doc.id}_${index}`,
        content: chunk,
        metadata: {
          kbId: data.knowledgeBaseId,
          docId: doc.id,
          name: data.name,
          chunkIndex: index,
          totalChunks: chunks.length,
        },
      }));

      await rag.index({
        connection: {
          vectorStoreName: "lancedb",
          indexName: `kb_${data.knowledgeBaseId}`,
        },
        entities,
        modelConfig: data.modelConfig,
      });

      // 索引完成后更新状态
      await prisma.document.update({
        where: { id: doc.id },
        data: { status: "ready" },
      });
    } catch (indexError: any) {
      console.error("Index Error:", indexError);
      await prisma.document.update({
        where: { id: doc.id },
        data: {
          status: "error",
          errorMessage: indexError.message || "Unknown indexing error",
        },
      });
    }

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
  data: { name?: string; content?: string; modelConfig?: any },
) {
  try {
    const updateData: any = { ...data };

    if (data.content !== undefined) {
      updateData.wordCount = countWords(data.content);
      updateData.characterCount = data.content.length;
      updateData.status = "processing";
    }

    const doc = await prisma.document.update({
      where: { id },
      data: updateData,
    });

    // 如果内容更新，重新触发索引
    if (data.content !== undefined) {
      try {
        const { rag } = await import("@/lib/mastra/rag");

        // 1. 先清理旧的分片 (通过 docId 过滤)
        await rag.delete({
          connection: { indexName: `kb_${doc.knowledgeBaseId}` },
          filter: { docId: doc.id },
        });

        // 2. 重新切片
        const chunks = splitText(data.content, 800, 150);

        // 3. 批量索引新分片
        const entities = chunks.map((chunk, index) => ({
          id: `${doc.id}_${index}`,
          content: chunk,
          metadata: {
            kbId: doc.knowledgeBaseId,
            docId: doc.id,
            name: doc.name,
            chunkIndex: index,
            totalChunks: chunks.length,
          },
        }));

        await rag.index({
          connection: {
            vectorStoreName: "lancedb",
            indexName: `kb_${doc.knowledgeBaseId}`,
          },
          entities,
          modelConfig: data.modelConfig,
        });
        await prisma.document.update({
          where: { id: doc.id },
          data: { status: "ready" },
        });
      } catch (err: any) {
        console.error("Update Index Error:", err);
        await prisma.document.update({
          where: { id: doc.id },
          data: {
            status: "error",
            errorMessage: err.message || "Unknown indexing error",
          },
        });
      }
    }

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

    // 从向量库中删除所有相关分片
    try {
      const { rag } = await import("@/lib/mastra/rag");
      await rag.delete({
        connection: {
          indexName: `kb_${doc.knowledgeBaseId}`,
        },
        filter: { docId: doc.id },
      });
    } catch (e) {
      console.error("Vector deletion error:", e);
    }

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

export async function searchKnowledgeBases(companyId: string, query: string) {
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

export async function testRetrieval(
  knowledgeBaseId: string,
  query: string,
  topK: number = 3,
  modelConfig?: any,
) {
  try {
    const { rag } = await import("@/lib/mastra/rag");
    const results = await rag.retrieve({
      connection: {
        indexName: `kb_${knowledgeBaseId}`,
      },
      query,
      topK,
      modelConfig,
    });

    return {
      success: true,
      results: results.map((r: any) => ({
        content: r.metadata?.content || r.content || "",
        metadata: r.metadata,
        score: r.score,
      })),
    };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
