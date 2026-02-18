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
 * 从 LLM 文本响应中提取 JSON，处理 markdown 代码块包裹的情况
 */
function extractJsonFromText(text: string): any | null {
  // 首先尝试直接解析
  try {
    return JSON.parse(text);
  } catch {
    // 忽略，尝试其他方式
  }

  // 尝试提取 markdown 代码块中的 JSON
  const codeBlockMatch = text.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/);
  if (codeBlockMatch) {
    try {
      return JSON.parse(codeBlockMatch[1].trim());
    } catch {
      // 忽略
    }
  }

  // 尝试从文本中找到 JSON 对象
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    try {
      return JSON.parse(jsonMatch[0]);
    } catch {
      // 忽略
    }
  }

  return null;
}

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

    const finalPrompt = inputData.prompt;

    console.log("[Step:agent_process] Calling agent.generate...");
    const context = inputData.input?.output ?? inputData.input;
    const messageContent = `上下文内容：\n${typeof context === "string" ? context : JSON.stringify(context)}\n\n指令：${finalPrompt}`;

    // 当定义了 outputSchema 时，使用 structuredOutput 功能强制结构化输出
    if (inputData.outputSchema) {
      let jsonSchema: any;
      try {
        jsonSchema = JSON.parse(inputData.outputSchema);
      } catch {
        jsonSchema = null;
        console.warn(
          "[Step:agent_process] Failed to parse outputSchema as JSON",
        );
      }

      if (jsonSchema) {
        try {
          console.log(
            "[Step:agent_process] Using structuredOutput with JSON Schema:",
            JSON.stringify(jsonSchema),
          );

          const result = await agent.generate(messageContent, {
            structuredOutput: {
              schema: jsonSchema,
            },
          });

          // result.object 可能是 Promise（MastraModelOutput getter），需要 await
          let structuredData: any;
          try {
            const objValue = (result as any).object;
            structuredData =
              objValue instanceof Promise ? await objValue : objValue;
          } catch (objErr) {
            console.warn(
              "[Step:agent_process] Failed to get result.object:",
              objErr,
            );
            structuredData = null;
          }

          // result.text 在 FullOutput 类型中是 string，但运行时可能是 Promise getter
          let textValue: string;
          try {
            const rawText = result.text as any;
            textValue =
              rawText && typeof rawText.then === "function"
                ? await rawText
                : rawText;
          } catch {
            textValue = "";
          }

          console.log(
            "[Step:agent_process] structuredData:",
            JSON.stringify(structuredData),
          );
          console.log(
            "[Step:agent_process] textValue (first 200 chars):",
            textValue?.substring(0, 200),
          );

          if (structuredData && typeof structuredData === "object") {
            // 直接返回结构化数据的各字段作为输出
            return {
              ...structuredData,
              output: structuredData,
              text: textValue,
            };
          }

          // 如果 object 为空但有 text，尝试从 text 中提取 JSON
          if (textValue) {
            const parsed = extractJsonFromText(textValue);
            if (parsed && typeof parsed === "object") {
              return {
                ...parsed,
                output: parsed,
                text: textValue,
              };
            }
          }

          return { output: textValue || "" };
        } catch (generateError: any) {
          console.warn(
            "[Step:agent_process] structuredOutput generate failed, falling back to prompt injection:",
            generateError?.message,
          );
          // 结构化输出失败，降级到 prompt 注入方式
        }
      }

      // 降级：通过 prompt 注入方式引导 LLM 输出 JSON
      const fallbackPrompt =
        messageContent +
        `\n\n**重要：你必须严格按以下 JSON Schema 格式输出，不要包含任何其他内容和 markdown 代码块：**\n${inputData.outputSchema}`;
      const result = await agent.generate(fallbackPrompt);

      let textValue: string;
      try {
        const rawText = result.text as any;
        textValue =
          rawText && typeof rawText.then === "function"
            ? await rawText
            : rawText;
      } catch {
        textValue = "";
      }

      console.log(
        "[Step:agent_process] Fallback response (first 200 chars):",
        textValue?.substring(0, 200),
      );

      const parsed = extractJsonFromText(textValue);
      if (parsed && typeof parsed === "object") {
        return {
          ...parsed,
          output: parsed,
          text: textValue,
        };
      }

      return { output: textValue };
    }

    // 没有 outputSchema 时，普通文本生成
    const result = await agent.generate(messageContent);

    let textValue: string;
    try {
      const rawText = result.text as any;
      textValue =
        rawText && typeof rawText.then === "function" ? await rawText : rawText;
    } catch {
      textValue = "";
    }

    console.log("[Step:agent_process] Agent response received");

    const parsed = extractJsonFromText(textValue);
    if (parsed && typeof parsed === "object") {
      return {
        output: parsed,
        text: textValue,
      };
    }

    return {
      output: textValue,
    };
  },
});

/**
 * 代码执行 Step
 */
/**
 * 代码执行 Step
 */
export const codeStep = createStep({
  id: "code_execution",
  inputSchema: z.object({
    code: z.string(),
    input: z.any(),
    variables: z.record(z.string()).optional(),
    companyId: z.string().optional(),
  }),
  outputSchema: z.any(),
  execute: async ({ inputData }) => {
    try {
      // 1. 准备上下文参数
      const context = {
        input: inputData.input,
        vars: inputData.variables || {},
      };

      // 2. 构造执行函数 (支持 main 函数入口)
      // 使用 AsyncFunction 以支持用户代码中的 await
      const AsyncFunction = Object.getPrototypeOf(
        async function () {},
      ).constructor;

      const fn = new AsyncFunction(
        "context",
        `
        const { input, vars } = context;
        
        // 用户代码
        ${inputData.code}
        
        // 检查是否定义了 main 函数
        if (typeof main === 'function') {
          return await main({ input, vars });
        }
        
        // 如果没有 main 函数，理论上应该报错或返回 undefined
        // 这里为了兼容性，如果不定义 main，什么都不做
        return undefined;
        `,
      );

      // 3. 执行
      const result = await fn(context);
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
/**
 * 变量聚合 Step
 */
export const variableAggregatorStep = createStep({
  id: "variable_aggregator",
  inputSchema: z.object({
    aggregateVariables: z.array(z.string()).optional(),
    aggregateStrategy: z
      .enum(["concat", "merge", "array"])
      .optional()
      .default("concat"),
  }),
  outputSchema: z.any(),
  execute: async ({ inputData, getStepResult }) => {
    const vars = inputData.aggregateVariables || [];
    const strategy = inputData.aggregateStrategy || "concat";

    const rawValues = vars.map((nodeId) => {
      const result = getStepResult(nodeId) as any;
      // 兼容 output/data/result 以及直接结果
      return result?.output ?? result?.data ?? result?.result ?? result;
    });

    let finalOutput: any;
    switch (strategy) {
      case "array":
        // 直接返回数组，包含原始对象，避免二次 Stringify 导致转义爆炸
        finalOutput = rawValues;
        break;
      case "merge":
        // 紧凑合并
        finalOutput = rawValues
          .map((v) =>
            typeof v === "object" && v !== null
              ? JSON.stringify(v)
              : String(v ?? ""),
          )
          .join("");
        break;
      case "concat":
      default:
        // 换行拼接
        finalOutput = rawValues
          .map((v) =>
            typeof v === "object" && v !== null
              ? JSON.stringify(v)
              : String(v ?? ""),
          )
          .join("\n");
    }

    return {
      output: finalOutput,
    };
  },
});
