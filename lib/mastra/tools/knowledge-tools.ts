import { createTool } from "@mastra/core/tools";
import { z } from "zod";
import { rag } from "../rag";

export const knowledgeSearchTool = createTool({
  id: "search_knowledge",
  description: "搜索公司知识库以获取相关信息。你可以根据知识库 ID 进行过滤。",
  inputSchema: z.object({
    query: z.string().describe("搜索关键词或问题"),
    kbId: z.string().optional().describe("特定的知识库 ID"),
    topK: z.number().optional().describe("返回的结果数量"),
  }),
  execute: async (input: { query: string; kbId?: string; topK?: number }) => {
    try {
      const results = await rag.retrieve({
        connection: {
          indexName: input.kbId ? `kb_${input.kbId}` : "default_index",
        },
        query: input.query,
        topK: input.topK,
      });

      return {
        success: true,
        results: results.map((r: any) => ({
          content: r.content,
          metadata: r.metadata,
          score: r.score,
        })),
      };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  },
});
