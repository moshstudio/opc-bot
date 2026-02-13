import { Agent } from "@mastra/core";
import { openai } from "@ai-sdk/openai";
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
export function getMastraAgent(
  role: string,
  modelName: string = "gpt-4o",
  instructions?: string,
) {
  const model = openai(modelName);

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
    },
  });
}

// 导出所有定义的 tools 供 Workflow 使用
export { tools };
