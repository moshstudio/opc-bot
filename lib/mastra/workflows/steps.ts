import { createStep } from "@mastra/core/workflows";
import { z } from "zod";

/**
 * Start Step
 */
export const startStep = createStep({
  id: "start",
  inputSchema: z.object({
    input: z.string().optional().default(""),
    companyId: z.string().optional(),
  }),
  outputSchema: z.object({
    output: z.string(),
    companyId: z.string().optional(),
  }),
  execute: async ({ inputData }) => {
    return {
      output: inputData.input || "",
    };
  },
});

/**
 * 知识/数据检索 Step
 */
export const knowledgeRetrievalStep = createStep({
  id: "retrieval",
  inputSchema: z.object({
    companyId: z.string(),
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
    const { db } = await import("@/lib/db");
    const { tools } = await import("../tools");

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

/**
 * Agent 分析 Step (支持结构化输出)
 */
export const agentStep = createStep({
  id: "agent_process",
  inputSchema: z.object({
    role: z.string().optional().default("assistant"),
    model: z.string().optional(),
    prompt: z.string(),
    input: z.any(),
    outputSchema: z.string().optional(),
    companyId: z.string().optional(),
    provider: z.string().optional(),
    modelConfig: z
      .object({
        apiKey: z.string().optional(),
        baseUrl: z.string().optional(),
      })
      .optional(),
  }),
  outputSchema: z.any(),
  execute: async ({ inputData }) => {
    console.log("[Step:agent_process] Executing with input:", inputData);
    const { getMastraAgent } = await import("../agents");
    // Await the async factory
    const agent = await getMastraAgent(
      inputData.role || "assistant",
      inputData.model,
      undefined,
      inputData.modelConfig,
      inputData.provider,
    );

    console.log(
      `[Step:agent_process] Using agent: ${agent?.name || "unknown"}`,
    );

    let finalPrompt = inputData.prompt;
    if (inputData.outputSchema) {
      finalPrompt += `\n\n**必须按以下 JSON 格式输出：**\n${inputData.outputSchema}`;
    }

    console.log("[Step:agent_process] Calling agent.generate...");
    const context = inputData.input?.output ?? inputData.input;
    const result = await agent.generate(
      `上下文内容：\n${typeof context === "string" ? context : JSON.stringify(context)}\n\n指令：${finalPrompt}`,
    );
    console.log("[Step:agent_process] Agent response received");

    try {
      const output = JSON.parse(result.text);
      return {
        output,
        text: result.text,
      };
    } catch {
      return {
        output: result.text,
      };
    }
  },
});

/**
 * 代码执行 Step
 */
export const codeStep = createStep({
  id: "code_execution",
  inputSchema: z.object({
    code: z.string(),
    input: z.any(),
    companyId: z.string().optional(),
  }),
  outputSchema: z.any(),
  execute: async ({ inputData }) => {
    try {
      const fn = new Function(
        "input",
        `
        const output = (function() {
          ${inputData.code}
        })();
        return output;
      `,
      );
      const result = fn(inputData.input);
      return { output: result };
    } catch (error: any) {
      throw new Error(`Code execution failed: ${error.message}`);
    }
  },
});

/**
 * HTTP 请求 Step
 */
export const httpRequestStep = createStep({
  id: "http_request",
  inputSchema: z.object({
    url: z.string(),
    method: z.enum(["GET", "POST", "PUT", "DELETE"]).default("GET"),
    headers: z.record(z.string()).optional(),
    body: z.any().optional(),
    companyId: z.string().optional(),
  }),
  outputSchema: z.any(),
  execute: async ({ inputData }) => {
    console.log(`[Step:http_request] ${inputData.method} ${inputData.url}`);
    const response = await fetch(inputData.url, {
      method: inputData.method,
      headers: {
        "Content-Type": "application/json",
        ...inputData.headers,
      },
      body:
        inputData.method !== "GET" ? JSON.stringify(inputData.body) : undefined,
    });

    const data = await response.json().catch(() => response.text());
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${JSON.stringify(data)}`);
    }
    return { data, status: response.status };
  },
});

/**
 * 通知 Step
 */
export const notificationStep = createStep({
  id: "notification",
  inputSchema: z.object({
    companyId: z.string(),
    notificationType: z.enum(["site", "email", "both"]),
    subject: z.string(),
    content: z.string(),
  }),
  outputSchema: z.any(),
  execute: async ({ inputData }) => {
    const { tools } = await import("../tools");
    const results: any = {};

    if (
      inputData.notificationType === "site" ||
      inputData.notificationType === "both"
    ) {
      results.site = await tools.siteNotification.execute?.(
        {
          input: {
            companyId: inputData.companyId,
            title: inputData.subject,
            content: inputData.content,
            type: "info",
          },
        },
        {},
      );
    }

    if (
      inputData.notificationType === "email" ||
      inputData.notificationType === "both"
    ) {
      results.email = await tools.emailNotification.execute?.(
        {
          input: {
            companyId: inputData.companyId,
            subject: inputData.subject,
            content: inputData.content,
          },
        },
        {},
      );
    }

    return { ...results };
  },
});

/**
 * 条件判断 Step
 */
export const conditionStep = createStep({
  id: "condition",
  inputSchema: z.object({
    input: z.any(),
    expression: z.string(),
  }),
  outputSchema: z.object({ result: z.boolean() }),
  execute: async ({ inputData }) => {
    try {
      const fn = new Function("input", `return !!(${inputData.expression})`);
      return { result: fn(inputData.input) };
    } catch (e) {
      console.error("Condition evaluation failed:", e);
      return { result: false };
    }
  },
});
