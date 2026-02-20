import { createStep } from "@mastra/core/workflows";
import { z } from "zod";

/**
 * 知识/数据检索 Step
 */
export const knowledgeRetrievalStep = createStep({
  id: "retrieval",
  inputSchema: z.object({
    companyId: z.string().optional(),
    queryType: z.string().optional().default("logs"),
    queryTimeRange: z.string().optional().default("24h"),
    queryLimit: z.number().optional(),
    limit: z.number().optional().default(50),
    queryKeyword: z.string().optional(),
    queryEmployeeId: z.string().optional(),
    queryIncludeProcessed: z.boolean().optional().default(false),
    kbId: z.string().optional(),
    embeddingModel: z.string().optional(),
  }),
  outputSchema: z.any(),
  execute: async ({ inputData }) => {
    const { queryType = "logs", companyId } = inputData;

    if (!companyId) {
      console.warn("[Step:retrieval] Missing companyId, skipping retrieval");
      return {
        output: [],
        count: 0,
        type: queryType,
      };
    }
    const { db } = await import("@/lib/db");
    const { tools } = await import("../../tools");

    let result: any = [];

    if (queryType === "knowledge_base") {
      // 1. 知识库检索 (RAG)
      const res = await tools.knowledgeSearch.execute?.(
        {
          query: inputData.queryKeyword || "",
          kbId: inputData.kbId,
          topK: inputData.queryLimit || inputData.limit || 5,
        },
        {},
      );
      result = ((res as any)?.results || []).map((r: any) => ({
        content: r.content,
        source: r.metadata?.source || r.metadata?.title || "knowledge_base",
        score: r.score,
      }));
    } else if (
      queryType === "logs" ||
      queryType === "execution_results" ||
      queryType === "notifications"
    ) {
      // 2. 数据库检索 (日志/通知/执行结果)
      // 处理时间过滤
      let timeFilter = {};
      if (inputData.queryTimeRange && inputData.queryTimeRange !== "all") {
        const now = new Date();
        let startTime = new Date(0);
        switch (inputData.queryTimeRange) {
          case "1h":
            startTime = new Date(now.getTime() - 60 * 60 * 1000);
            break;
          case "24h":
            startTime = new Date(now.getTime() - 24 * 60 * 60 * 1000);
            break;
          case "7d":
            startTime = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            break;
          case "30d":
            startTime = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
            break;
        }
        timeFilter = { createdAt: { gte: startTime } };
      }

      const finalLimit = inputData.queryLimit || inputData.limit || 50;

      if (queryType === "notifications") {
        const where: any = { companyId, ...timeFilter };
        if (inputData.queryKeyword) {
          where.OR = [
            { title: { contains: inputData.queryKeyword } },
            { content: { contains: inputData.queryKeyword } },
          ];
        }
        const notifications = await db.notification.findMany({
          where,
          orderBy: { createdAt: "desc" },
          take: finalLimit,
        });
        result = notifications.map((r: any) => ({
          title: r.title,
          content: r.content,
          time: r.createdAt.toISOString().slice(0, 16).replace("T", " "),
        }));
      } else {
        // Logs or Execution Results
        const where: any = {
          employee: { companyId },
          ...timeFilter,
        };
        if (queryType === "execution_results") {
          where.type = "workflow_execution";
        } else {
          // logs
          if (!inputData.queryIncludeProcessed) {
            where.isProcessed = false;
          }
        }
        if (inputData.queryEmployeeId && inputData.queryEmployeeId !== "all") {
          where.employeeId = inputData.queryEmployeeId;
        }
        if (inputData.queryKeyword) {
          where.OR = [
            { title: { contains: inputData.queryKeyword } },
            { content: { contains: inputData.queryKeyword } },
          ];
        }
        const logs = await db.employeeLog.findMany({
          where,
          include: {
            employee: { select: { name: true } },
          },
          orderBy: { createdAt: "desc" },
          take: finalLimit,
        });
        result = logs.map((log: any) => ({
          title: log.title,
          content: log.content,
          type: log.type,
          user: log.employee?.name,
          time: log.createdAt.toISOString().slice(0, 16).replace("T", " "),
        }));
      }
    }

    return {
      output: result,
      count: Array.isArray(result) ? result.length : 0,
      type: queryType,
    };
  },
});
