import { Agent } from "@mastra/core";
import { openai, createOpenAI } from "@ai-sdk/openai";
import { google, createGoogleGenerativeAI } from "@ai-sdk/google";
import { anthropic, createAnthropic } from "@ai-sdk/anthropic";
import { db } from "@/lib/db";
import { tools } from "../tools";

// Basic role prompts
export const ROLE_PROMPTS: Record<string, string> = {
  ceo: "你是 CEO。负责高层决策。简洁且有权威。",
  assistant:
    "你是艾薇 (Ivy)，一名高效的行政助理。你负责监控员工日志、分析风险、生成摘要并发送通知。你可以调用工具来获取实时数据或发送消息。请始终保持专业和有条理。",
  life_assistant: "你是生活助理。关心用户福祉。共情且支持。",
  devops: "你是运维工程师。监控系统并管理部署。",
  deployment: "你是部署工程师。专注于 CI/CD 管道。",
  product_manager: "你是产品经理。关注需求和路线图。",
  content_creator: "你是内容创作者。创作社交媒体内容。",
};

export const agents: Record<string, Agent> = {};

/**
 * 获取或创建 Mastra Agent
 */
export async function getMastraAgent(
  role: string,
  modelIdOrName?: string,
  instructions?: string,
  modelConfig?: { apiKey?: string; baseUrl?: string },
  provider?: string,
  companyId?: string,
) {
  let model;
  let finalModelName = modelIdOrName;
  let finalApiKey = modelConfig?.apiKey;
  let finalBaseUrl = modelConfig?.baseUrl;
  let finalProvider = provider;

  // 1. If no model specified but companyId available, get default from DB
  if (!finalModelName && companyId) {
    try {
      const dbModel = await db.aiModel.findFirst({
        where: { companyId, isActive: true },
        orderBy: { createdAt: "desc" },
      });
      if (dbModel) {
        finalModelName = dbModel.id; // Use ID for lookup in next step
      }
    } catch (err) {
      console.error(
        "[getMastraAgent] Error fetching default model for company",
        err,
      );
    }
  }

  // 2. If it's potentially an ID, try to lookup in DB
  if (finalModelName && !finalApiKey && !finalBaseUrl) {
    try {
      const dbModel = await db.aiModel.findUnique({
        where: { id: finalModelName },
      });
      if (dbModel) {
        finalModelName = dbModel.name; // The actual model slug (e.g. "gpt-4o")
        finalProvider = dbModel.provider;
        finalApiKey = dbModel.apiKey || undefined;
        finalBaseUrl = dbModel.baseUrl || undefined;
      }
    } catch {
      // Ignore lookup errors (might be a direct slug name instead of ID)
    }
  }

  // 3. Final Fallback if still no model after all lookups
  if (!finalModelName) {
    finalModelName = "gpt-4o";
  }

  // Handle different providers
  if (finalProvider === "transformers") {
    // TODO: Implement Transformers.js adapter for AI SDK
    console.warn(
      "Transformers provider not yet fully implemented in Agent, falling back to OpenAI compatible check",
    );
  }

  if (finalProvider === "google") {
    console.log("Using Google provider");
    if (finalApiKey || finalBaseUrl) {
      const customGoogle = createGoogleGenerativeAI({
        apiKey: finalApiKey,
        baseURL: finalBaseUrl,
      });
      model = customGoogle(finalModelName);
    } else {
      model = google(finalModelName);
    }
  } else if (finalProvider === "anthropic") {
    console.log("Using Anthropic provider");
    if (finalApiKey || finalBaseUrl) {
      const customAnthropic = createAnthropic({
        apiKey: finalApiKey,
        baseURL: finalBaseUrl,
      });
      model = customAnthropic(finalModelName);
    } else {
      model = anthropic(finalModelName);
    }
  } else if (finalApiKey || finalBaseUrl) {
    console.log("Using Custom OpenAI provider");
    const customOpenai = createOpenAI({
      apiKey: finalApiKey || "dummy-key", // Use dummy key if not provided but config exists
      baseURL: finalBaseUrl,
    });
    model = customOpenai.chat(finalModelName);
  } else {
    console.log("Using Default OpenAI provider");
    // Fallback to default instance (env vars)
    model = openai.chat(finalModelName);
  }

  return new Agent({
    id: `agent-${role}`,
    name: role,
    instructions:
      instructions || ROLE_PROMPTS[role] || "你是一个得力的 AI 员工。",
    model: model,
    tools: {
      get_employee_logs: tools.logRetrieval,
      send_site_notification: tools.siteNotification,
      send_email_notification: tools.emailNotification,
      search_knowledge: tools.knowledgeSearch,
    },
  });
}

// 导出所有定义的 tools 供 Workflow 使用
export { tools };
