import { createStep } from "@mastra/core/workflows";
import { z } from "zod";
import { extractJsonFromText, extractTextFromResult } from "./utils";

/**
 * Agent 智能体 Step
 *
 * 支持两种策略：
 * - function_calling: 利用模型原生函数调用能力 (GPT-4, Claude 3.5 等)
 * - react: ReAct 推理模式 (思维→行动→观察 循环)
 *
 * 特性：
 * - 工具选择：根据前端配置只启用选中的工具
 * - 迭代控制：maxIterations 防止无限循环
 * - 对话记忆：可选 TokenBufferMemory
 * - 输入变量：可选择用户原始输入或上游节点输出
 * - 输出结构：可选结构化 JSON Schema 输出
 */
export const agentStep = createStep({
  id: "agent_process",
  inputSchema: z.object({
    // === 核心配置 ===
    role: z.string().optional().default("assistant"),
    model: z.string().optional(),
    prompt: z.string(),
    input: z.any(),
    inputVariable: z.string().optional(), // 输入源选择
    agentType: z
      .enum(["function_calling", "react"])
      .optional()
      .default("function_calling"),

    // === 工具 ===
    tools: z.array(z.string()).optional().default([]), // 选中的工具 ID 列表

    // === 迭代控制 ===
    maxIterations: z.number().optional().default(5),

    // === 记忆 ===
    memory: z
      .object({
        enabled: z.boolean().optional().default(false),
        window: z.number().optional().default(10),
      })
      .optional(),

    // === 输出 ===
    outputSchema: z.string().optional(), // JSON Schema string

    // === 容错 ===
    retryCount: z.number().optional().default(0),
    timeout: z.number().optional().default(60000),

    // === 基础设施 ===
    companyId: z.string().optional(),
    provider: z.string().optional(),
    modelConfig: z
      .object({
        apiKey: z.string().optional(),
        baseUrl: z.string().optional(),
      })
      .optional(),

    // === 兼容旧字段 ===
    jsonPromptInjection: z.boolean().optional().default(true),
    structuredOutputModel: z.string().optional(),
  }),
  outputSchema: z.any(),
  execute: async ({ inputData }) => {
    console.log("[Step:agent_process] Executing with input:", {
      agentType: inputData.agentType,
      tools: inputData.tools,
      maxIterations: inputData.maxIterations,
      model: inputData.model,
      hasPrompt: !!inputData.prompt,
    });

    const { getMastraAgent } = await import("../../agents");
    const { tools: allTools } = await import("../../tools");

    // ============================================================
    // 1. 准备输入上下文
    // ============================================================
    const context = inputData.input?.output ?? inputData.input;
    const contextStr =
      typeof context === "string" ? context : JSON.stringify(context, null, 2);

    // ============================================================
    // 2. 根据配置筛选工具
    // ============================================================
    const toolMapping: Record<string, any> = {
      get_employee_logs: allTools.logRetrieval,
      send_site_notification: allTools.siteNotification,
      send_email_notification: allTools.emailNotification,
      search_knowledge: allTools.knowledgeSearch,
    };

    const enabledToolIds: string[] = inputData.tools || [];
    const selectedTools: Record<string, any> = {};
    for (const toolId of enabledToolIds) {
      if (toolMapping[toolId]) {
        selectedTools[toolId] = toolMapping[toolId];
      }
    }

    const hasTools = Object.keys(selectedTools).length > 0;

    console.log(
      `[Step:agent_process] Enabled tools: [${Object.keys(selectedTools).join(", ")}]`,
    );

    // ============================================================
    // 3. 创建 Agent (注入选中的工具)
    // ============================================================
    const agent = await getMastraAgent(
      inputData.role || "assistant",
      inputData.model,
      inputData.prompt, // 将 prompt 作为 instructions
      inputData.modelConfig,
      inputData.provider,
      inputData.companyId,
    );

    // 用选中的工具覆盖 Agent 默认工具
    // Mastra Agent 的 tools 是在构造时传入的，但我们可以在 generate 时传入 tools 参数
    console.log(
      `[Step:agent_process] Agent created: ${agent?.name || "unknown"}`,
    );

    // ============================================================
    // 4. 执行策略分支
    // ============================================================
    const maxIterations = inputData.maxIterations || 5;
    const maxRetries = (inputData.retryCount || 0) + 1; // 总尝试次数

    try {
      if (inputData.agentType === "react" && hasTools) {
        // ============================
        // ReAct 策略: 思维→行动→观察
        // ============================
        return await executeReActLoop(
          agent,
          contextStr,
          inputData.prompt,
          selectedTools,
          maxIterations,
          inputData.outputSchema,
        );
      } else if (hasTools) {
        // ============================
        // Function Calling 策略
        // ============================
        return await executeFunctionCallingLoop(
          agent,
          contextStr,
          inputData.prompt,
          selectedTools,
          maxIterations,
          maxRetries,
          inputData.outputSchema,
        );
      } else {
        // ============================
        // 无工具模式: 简单生成 (兼容旧逻辑)
        // ============================
        return await executeSimpleGeneration(
          agent,
          contextStr,
          inputData.prompt,
          maxRetries,
          inputData.outputSchema,
        );
      }
    } catch (err: any) {
      console.error(`[Step:agent_process] Fatal error:`, err);
      throw new Error(`Agent execution failed: ${err.message}`);
    }
  },
});

// ============================================================
// Function Calling 策略实现
// ============================================================
async function executeFunctionCallingLoop(
  agent: any,
  contextStr: string,
  prompt: string,
  selectedTools: Record<string, any>,
  maxIterations: number,
  maxRetries: number,
  outputSchema?: string,
): Promise<any> {
  const systemPrompt = buildSystemPrompt(prompt, contextStr, outputSchema);

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      let finalPrompt = systemPrompt;
      if (attempt > 1) {
        finalPrompt += `\n\n【系统提示】：第 ${attempt} 次尝试，请确保正确使用工具并输出有效结果。`;
      }

      // 使用 Mastra Agent 的 generate 方法 (内置 function calling 支持)
      // Agent 会自动处理工具调用循环
      const result = await agent.generate(finalPrompt, {
        maxSteps: maxIterations,
        toolChoice: "auto",
        tools: selectedTools,
      });

      const textValue = await extractTextFromResult(result, "agent_process");
      const toolCalls = extractToolCalls(result);

      console.log(
        `[Step:agent_process] Function calling completed. Tool calls: ${toolCalls.length}, Text length: ${textValue.length}`,
      );

      return buildOutput(
        textValue,
        outputSchema,
        toolCalls,
        "function_calling",
      );
    } catch (err: any) {
      console.error(
        `[Step:agent_process] FC attempt ${attempt}/${maxRetries} error:`,
        err,
      );
      if (attempt === maxRetries) throw err;
      await new Promise((r) => setTimeout(r, 1000 * attempt));
    }
  }

  throw new Error("Function calling agent failed (unreachable).");
}

// ============================================================
// ReAct 策略实现
// ============================================================
async function executeReActLoop(
  agent: any,
  contextStr: string,
  prompt: string,
  selectedTools: Record<string, any>,
  maxIterations: number,
  outputSchema?: string,
): Promise<any> {
  // 构造可用工具的文本描述（用于 ReAct 提示词）
  const toolDescriptions = Object.entries(selectedTools)
    .map(([id, tool]) => `- ${id}: ${(tool as any)?.description || "无描述"}`)
    .join("\n");

  const observations: string[] = [];
  let finalAnswer = "";

  for (let iteration = 1; iteration <= maxIterations; iteration++) {
    console.log(
      `[Step:agent_process] ReAct iteration ${iteration}/${maxIterations}`,
    );

    // 构建 ReAct prompt
    const reactPrompt = buildReActPrompt(
      prompt,
      contextStr,
      toolDescriptions,
      observations,
      iteration,
      maxIterations,
    );

    const result = await agent.generate(reactPrompt);
    const textValue = await extractTextFromResult(result, "agent_process");

    // 解析 ReAct 输出
    const parsed = parseReActOutput(textValue);

    if (parsed.finalAnswer) {
      // Agent 给出了最终答案
      finalAnswer = parsed.finalAnswer;
      console.log(
        `[Step:agent_process] ReAct final answer at iteration ${iteration}`,
      );
      break;
    }

    if (parsed.action && parsed.actionInput) {
      // Agent 想要调用工具
      const tool = selectedTools[parsed.action];
      if (tool && tool.execute) {
        try {
          console.log(
            `[Step:agent_process] ReAct calling tool: ${parsed.action}`,
          );
          const toolResult = await tool.execute(
            { input: parsed.actionInput },
            {},
          );
          const observation =
            typeof toolResult === "string"
              ? toolResult
              : JSON.stringify(toolResult, null, 2);
          observations.push(
            `[迭代 ${iteration}] 行动: ${parsed.action}\n输入: ${JSON.stringify(parsed.actionInput)}\n观察: ${observation}`,
          );
        } catch (toolErr: any) {
          observations.push(
            `[迭代 ${iteration}] 行动: ${parsed.action}\n错误: ${toolErr.message}`,
          );
        }
      } else {
        observations.push(
          `[迭代 ${iteration}] 行动: ${parsed.action}\n错误: 未找到该工具`,
        );
      }
    } else {
      // 无法解析为 action 或 final_answer，视为最终答案
      finalAnswer = textValue;
      break;
    }
  }

  if (!finalAnswer) {
    finalAnswer = `Agent 在 ${maxIterations} 次迭代后未能给出最终答案。\n\n最后的观察记录：\n${observations[observations.length - 1] || "无"}`;
  }

  return buildOutput(finalAnswer, outputSchema, [], "react", observations);
}

// ============================================================
// 简单生成模式 (无工具，兼容旧逻辑)
// ============================================================
async function executeSimpleGeneration(
  agent: any,
  contextStr: string,
  prompt: string,
  maxRetries: number,
  outputSchema?: string,
): Promise<any> {
  const basePrompt = buildSystemPrompt(prompt, contextStr, outputSchema);

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      let finalPrompt = basePrompt;
      if (attempt > 1) {
        console.log(
          `[Step:agent_process] Simple generation retry ${attempt}/${maxRetries}`,
        );
        finalPrompt += `\n\n【系统提示】：上一次未能提取到有效的 JSON，请务必确保输出的是纯净的、合法的 JSON 字符串，符合上述 Schema。`;
      }

      const result = await agent.generate(finalPrompt);
      const textValue = await extractTextFromResult(result, "agent_process");

      return buildOutput(textValue, outputSchema, [], "simple");
    } catch (err: any) {
      console.error(
        `[Step:agent_process] Simple attempt ${attempt}/${maxRetries} error:`,
        err,
      );
      if (attempt === maxRetries) throw err;
      await new Promise((r) => setTimeout(r, 1000));
    }
  }

  throw new Error("Agent failed to execute (unreachable).");
}

// ============================================================
// 辅助函数
// ============================================================

/** 构建系统提示词 */
function buildSystemPrompt(
  prompt: string,
  contextStr: string,
  outputSchema?: string,
): string {
  let systemPrompt = `上下文内容：\n${contextStr}\n\n指令：${prompt}`;

  if (outputSchema) {
    systemPrompt += `\n\n**重要输出要求**：\n你必须严格按照以下的 JSON Schema 格式输出结果。\n请只输出合法的 JSON 字符串，不要包含 Markdown 代码块（如 \`\`\`json），不要包含其他解释性文字。\n\nJSON Schema:\n${outputSchema}`;
  }

  return systemPrompt;
}

/** 构建 ReAct 提示词 */
function buildReActPrompt(
  prompt: string,
  contextStr: string,
  toolDescriptions: string,
  observations: string[],
  iteration: number,
  maxIterations: number,
): string {
  let reactPrompt = `你是一个使用 ReAct (Reasoning + Acting) 框架的智能助手。

## 任务目标
${prompt}

## 上下文
${contextStr}

## 可用工具
${toolDescriptions}

## 输出格式
每次回复必须严格使用以下格式之一:

**格式A - 需要调用工具:**
思考: [你的推理过程]
行动: [工具名称]
行动输入: [JSON格式的工具输入参数]

**格式B - 给出最终答案:**
思考: [你的推理过程]
最终答案: [你的最终回答]

## 重要规则
- 当前是第 ${iteration}/${maxIterations} 次迭代
- 如果已经收集到足够信息，请直接给出最终答案
- 行动输入必须是合法 JSON
- 每次只能调用一个工具`;

  if (observations.length > 0) {
    reactPrompt += `\n\n## 历史记录\n${observations.join("\n\n")}`;
  }

  reactPrompt += `\n\n请开始推理。`;

  return reactPrompt;
}

/** 解析 ReAct 输出 */
function parseReActOutput(text: string): {
  thought?: string;
  action?: string;
  actionInput?: any;
  finalAnswer?: string;
} {
  const result: any = {};

  // 提取思考
  const thoughtMatch = text.match(
    /思考[:：]\s*([\s\S]*?)(?=行动[:：]|最终答案[:：]|$)/,
  );
  if (thoughtMatch) result.thought = thoughtMatch[1].trim();

  // 提取最终答案
  const answerMatch = text.match(/最终答案[:：]\s*([\s\S]*?)$/);
  if (answerMatch) {
    result.finalAnswer = answerMatch[1].trim();
    return result;
  }

  // 提取行动
  const actionMatch = text.match(/行动[:：]\s*(\S+)/);
  if (actionMatch) result.action = actionMatch[1].trim();

  // 提取行动输入
  const inputMatch = text.match(
    /行动输入[:：]\s*([\s\S]*?)(?=\n思考[:：]|\n行动[:：]|$)/,
  );
  if (inputMatch) {
    try {
      result.actionInput = JSON.parse(inputMatch[1].trim());
    } catch {
      result.actionInput = inputMatch[1].trim();
    }
  }

  return result;
}

/** 提取工具调用记录 */
function extractToolCalls(result: any): any[] {
  try {
    // Mastra / Vercel AI SDK 的 toolCalls 格式
    if (result.toolCalls && Array.isArray(result.toolCalls)) {
      return result.toolCalls.map((tc: any) => ({
        tool: tc.toolName || tc.name,
        args: tc.args || tc.arguments,
        result: tc.result,
      }));
    }
    // 兼容 steps 格式
    if (result.steps && Array.isArray(result.steps)) {
      const calls: any[] = [];
      for (const step of result.steps) {
        if (step.toolCalls) {
          for (const tc of step.toolCalls) {
            calls.push({
              tool: tc.toolName || tc.name,
              args: tc.args || tc.arguments,
            });
          }
        }
        if (step.toolResults) {
          for (let i = 0; i < step.toolResults.length; i++) {
            if (calls[calls.length - step.toolResults.length + i]) {
              calls[calls.length - step.toolResults.length + i].result =
                step.toolResults[i].result;
            }
          }
        }
      }
      return calls;
    }
  } catch (e) {
    console.warn("[Step:agent_process] Error extracting tool calls:", e);
  }
  return [];
}

/** 构建统一输出 */
function buildOutput(
  textValue: string,
  outputSchema: string | undefined,
  toolCalls: any[],
  strategy: string,
  observations?: string[],
): any {
  // 尝试解析结构化输出
  if (outputSchema) {
    const parsed = extractJsonFromText(textValue);
    if (parsed && typeof parsed === "object") {
      return {
        output: parsed,
        text: textValue,
        toolCalls,
        strategy,
        iterations: observations?.length,
      };
    }
    // 如果需要结构化但解析失败，仍然返回原文（不在此层重试，由外层处理）
    console.warn(
      "[Step:agent_process] Failed to parse structured output, returning raw text",
    );
  }

  // 尝试自动解析 JSON
  const parsed = extractJsonFromText(textValue);
  if (parsed && typeof parsed === "object") {
    return {
      output: parsed,
      text: textValue,
      toolCalls,
      strategy,
      iterations: observations?.length,
    };
  }

  return {
    output: textValue,
    text: textValue,
    toolCalls,
    strategy,
    iterations: observations?.length,
  };
}
