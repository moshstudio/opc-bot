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
      companyId: inputData.companyId,
    };
  },
});

/**
 * 日志检索 Step
 */
export const retrievalStep = createStep({
  id: "retrieval",
  inputSchema: z.object({
    companyId: z.string(),
    limit: z.number().optional().default(50),
    startTime: z.number().optional(),
  }),
  outputSchema: z.any(),
  execute: async ({ inputData }) => {
    const { tools } = await import("../tools");
    const result = await tools.logRetrieval.execute?.(
      {
        input: {
          companyId: inputData.companyId,
          limit: inputData.limit ?? 50,
        },
      },
      {},
    );
    // Actually, looking at previous code: logRetrievalTool.execute({ input: inputData })
    // If it's a Mastra tool, the first arg is typically the context.
    return { ...result, companyId: inputData.companyId };
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
    const result = await agent.generate(
      `上下文内容：\n${JSON.stringify(inputData.input)}\n\n指令：${finalPrompt}`,
    );
    console.log("[Step:agent_process] Agent response received");

    try {
      const output = JSON.parse(result.text);
      return {
        text: result.text,
        output,
        companyId: inputData.companyId,
      };
    } catch {
      return {
        text: result.text,
        output: result.text,
        companyId: inputData.companyId,
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
      return { output: result, companyId: inputData.companyId };
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
    return { status: response.status, data, companyId: inputData.companyId };
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

    return { ...results, companyId: inputData.companyId };
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
