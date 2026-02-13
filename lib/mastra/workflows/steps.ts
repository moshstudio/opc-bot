import { createStep } from "@mastra/core/workflows";
import { z } from "zod";

/**
 * Start Step
 */
export const startStep = createStep({
  id: "start",
  inputSchema: z.object({ input: z.string().optional().default("") }),
  outputSchema: z.object({ output: z.string() }),
  execute: async ({ inputData }) => {
    return { output: inputData.input || "" };
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
  }),
  outputSchema: z.any(),
  execute: async ({ inputData }) => {
    const { logRetrievalTool } = await import("../tools");
    return await logRetrievalTool.execute({ input: inputData });
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
  }),
  outputSchema: z.any(),
  execute: async ({ inputData }) => {
    const { getMastraAgent } = await import("../agents");
    const agent = getMastraAgent(inputData.role, inputData.model);

    let finalPrompt = inputData.prompt;
    if (inputData.outputSchema) {
      finalPrompt += `\n\n**必须按以下 JSON 格式输出：**\n${inputData.outputSchema}`;
    }

    const result = await agent.generate(
      `上下文内容：\n${JSON.stringify(inputData.input)}\n\n指令：${finalPrompt}`,
    );

    try {
      return { text: result.text, output: JSON.parse(result.text) };
    } catch {
      return { text: result.text, output: result.text };
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
  }),
  outputSchema: z.any(),
  execute: async ({ inputData }) => {
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
    return { status: response.status, data };
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
    const { siteNotificationTool, emailNotificationTool } =
      await import("../tools");
    const results: any = {};

    if (
      inputData.notificationType === "site" ||
      inputData.notificationType === "both"
    ) {
      results.site = await siteNotificationTool.execute({
        input: {
          companyId: inputData.companyId,
          title: inputData.subject,
          content: inputData.content,
        },
      });
    }

    if (
      inputData.notificationType === "email" ||
      inputData.notificationType === "both"
    ) {
      results.email = await emailNotificationTool.execute({
        input: {
          companyId: inputData.companyId,
          subject: inputData.subject,
          content: inputData.content,
        },
      });
    }

    return results;
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
