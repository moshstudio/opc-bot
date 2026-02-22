import { createTool } from "@mastra/core/tools";
import { z } from "zod";

/**
 * 日志检索工具
 * 用于获取员工未处理的工作日志
 */
export const logRetrievalTool = createTool({
  id: "get_employee_logs",
  description:
    "获取特定公司下员工的工作日志。默认获取未处理日志，用于风险监控和生成摘要报告。",
  inputSchema: z.object({
    input: z.object({
      companyId: z.string().describe("公司 ID"),
      limit: z.number().default(50).describe("返回的最大日志条数"),
      includeProcessed: z
        .boolean()
        .default(false)
        .describe("是否包含已处理的日志 (用于总结过去的任务)"),
    }),
  }),
  outputSchema: z.any(),
  execute: async ({ input }) => {
    console.log("[Tool:logRetrieval] Executing with input:", input);
    const { db } = await import("@/lib/db");

    const logs = await db.employeeLog.findMany({
      where: {
        employee: { companyId: input.companyId },
        ...(input.includeProcessed ? {} : { isProcessed: false }),
      },
      include: {
        employee: {
          select: { id: true, name: true, role: true, companyId: true },
        },
      },
      orderBy: { createdAt: "desc" },
      take: input.limit,
    });

    return logs;
  },
});

/**
 * 站内通知工具
 */
export const siteNotificationTool = createTool({
  id: "send_site_notification",
  description: "向公司管理层发送站内通知消息。",
  inputSchema: z.object({
    input: z.object({
      companyId: z.string().describe("公司 ID"),
      title: z.string().describe("通知标题"),
      content: z.any().describe("通知内容 (支持字符串、对象或数组)"),
      type: z
        .enum(["info", "warning", "error", "success"])
        .describe("通知类型"),
    }),
  }),
  execute: async ({ input }: { input: any }) => {
    console.log("[Tool:siteNotification] Executing with input:", input);
    const { createNotification } = await import("@/lib/services/notification");
    const { renderToMarkdown } = await import("../workflows/steps/utils");

    return await createNotification({
      companyId: input.companyId,
      title: input.title,
      content: renderToMarkdown(input.content),
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
    input: z.object({
      companyId: z.string().describe("公司 ID"),
      subject: z.string().describe("邮件主题"),
      content: z.any().describe("邮件正文 (支持字符串、对象或数组)"),
    }),
  }),
  execute: async ({ input }: { input: any }) => {
    console.log("[Tool:emailNotification] Executing with input:", input);
    const { sendNotificationEmail, isEmailConfigured } =
      await import("@/lib/services/email");
    const { renderToMarkdown } = await import("../workflows/steps/utils");

    const configured = await isEmailConfigured(input.companyId);
    if (!configured) {
      return {
        success: false,
        error: "Email SMTP not configured for this company",
      };
    }
    await sendNotificationEmail(
      input.companyId,
      input.subject,
      renderToMarkdown(input.content),
    );
    return { success: true };
  },
});

import { knowledgeSearchTool } from "./knowledge-tools";

export const tools = {
  logRetrieval: logRetrievalTool,
  siteNotification: siteNotificationTool,
  emailNotification: emailNotificationTool,
  knowledgeSearch: knowledgeSearchTool,
};
