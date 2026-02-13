import { createTool } from "@mastra/core/tools";
import { z } from "zod";

/**
 * 日志检索工具
 * 用于获取员工未处理的工作日志
 */
export const logRetrievalTool = createTool({
  id: "get_employee_logs",
  description: "获取特定公司下未处理的员工工作日志，用于扫描风险和摘要报告。",
  inputSchema: z.object({
    companyId: z.string().describe("公司 ID"),
    limit: z.number().optional().default(50).describe("返回的最大日志条数"),
  }),
  outputSchema: z.any(),
  execute: async ({
    input,
  }: {
    input: { companyId: string; limit: number };
  }) => {
    const { getUnprocessedLogs } = await import("@/lib/services/employee-log");
    const logs = await getUnprocessedLogs(input.limit);
    // 过滤公司日志 (假设 getUnprocessedLogs 返回全量，需要在此过滤)
    return logs.filter((l) => l.employee.companyId === input.companyId);
  },
});

/**
 * 站内通知工具
 */
export const siteNotificationTool = createTool({
  id: "send_site_notification",
  description: "向公司管理层发送站内通知消息。",
  inputSchema: z.object({
    companyId: z.string().describe("公司 ID"),
    title: z.string().describe("通知标题"),
    content: z.string().describe("通知内容 (Markdown 格式)"),
    type: z
      .enum(["info", "warning", "error", "success"])
      .optional()
      .default("info"),
  }),
  execute: async ({
    input,
  }: {
    input: {
      companyId: string;
      title: string;
      content: string;
      type: "info" | "warning" | "error" | "success";
    };
  }) => {
    const { createNotification } = await import("@/lib/services/notification");
    return await createNotification({
      companyId: input.companyId,
      title: input.title,
      content: input.content,
      type: input.type,
      source: "ivy",
    });
  },
});

/**
 * 邮件通知工具
 */
export const emailNotificationTool = createTool({
  id: "send_email_notification",
  description: "向公司的主要联系人发送电子邮件摘要。前提是公司已配置 SMTP。",
  inputSchema: z.object({
    companyId: z.string().describe("公司 ID"),
    subject: z.string().describe("邮件主题"),
    content: z.string().describe("邮件正文 (HTML/Markdown)"),
  }),
  execute: async ({
    input,
  }: {
    input: { companyId: string; subject: string; content: string };
  }) => {
    const { sendNotificationEmail, isEmailConfigured } =
      await import("@/lib/services/email");
    const configured = await isEmailConfigured(input.companyId);
    if (!configured) {
      return {
        success: false,
        error: "Email SMTP not configured for this company",
      };
    }
    await sendNotificationEmail(input.companyId, input.subject, input.content);
    return { success: true };
  },
});

export const tools = {
  logRetrieval: logRetrievalTool,
  siteNotification: siteNotificationTool,
  emailNotification: emailNotificationTool,
};
