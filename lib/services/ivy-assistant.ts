/**
 * Ivy 助理服务
 * 艾薇 (Ivy) - AI 助理员工
 *
 * 核心职责：
 * 1. 持续监听所有员工的输出日志
 * 2. 定时总结日志内容
 * 3. 将值得关注的信息通过站内通知和邮件进行通知
 */

import { db } from "@/lib/db";
import { getUnprocessedLogs, markLogsProcessed } from "./employee-log";
import { createNotification } from "./notification";
import { sendNotificationEmail, isEmailConfigured } from "./email";
import { getMastraAgent } from "@/lib/mastra/agents";

/**
 * Ivy 的系统提示词
 */
const IVY_SYSTEM_PROMPT = `你是艾薇 (Ivy)，一人公司的 AI 助理员工。你的职责是：

1. 监控和总结其他 AI 员工的工作动态
2. 识别值得关注的事项（错误、异常、重要成果）
3. 生成简洁明了的工作总结报告

**输出规则：**
- 使用简洁中文
- 按重要程度排序（错误 > 警告 > 重要成果 > 常规信息）
- 对每条值得关注的日志给出简短分析和建议
- 如果没有值得关注的内容，简单说明一切正常

**输出格式：**
以 JSON 格式输出，格式如下：
{
  "hasNotableItems": true/false,
  "summary": "总体概述（1-2句话）",
  "items": [
    {
      "level": "error|warning|success|info",
      "title": "简短标题",
      "detail": "详细说明和建议",
      "employeeName": "涉及的员工名",
      "originalLogId": "原始日志ID"
    }
  ]
}`;

interface IvySummaryItem {
  level: "error" | "warning" | "success" | "info";
  title: string;
  detail: string;
  employeeName: string;
  originalLogId?: string;
}

interface IvySummaryResult {
  hasNotableItems: boolean;
  summary: string;
  items: IvySummaryItem[];
}

/**
 * Ivy 扫描并总结日志
 * 这是 Ivy 的核心功能：读取未处理日志 → AI 分析总结 → 生成通知
 */
export async function ivyScanAndSummarize(companyId: string): Promise<
  | {
      success: true;
      processedCount: number;
      notificationCount: number;
      summary: string;
      processedItems?: any[];
    }
  | {
      success: false;
      processedCount: number;
      notificationCount: number;
      error: string;
      summary?: string;
    }
> {
  try {
    // 1. 获取未处理的日志
    const logs = await getUnprocessedLogs(50);

    if (logs.length === 0) {
      return {
        success: true as const,
        processedCount: 0,
        notificationCount: 0,
        summary: "暂无新日志需要处理。",
      };
    }

    // 2. 过滤当前公司的日志
    const companyLogs = logs.filter(
      (log) => log.employee.companyId === companyId,
    );

    if (companyLogs.length === 0) {
      return {
        success: true as const,
        processedCount: 0,
        notificationCount: 0,
        summary: "无匹配的公司日志。",
      };
    }

    // 3. 构建日志摘要给 AI 分析
    const logsSummary = companyLogs
      .map((log, i) => {
        return `[${i + 1}] 员工: ${log.employee.name} | 类型: ${log.type} | 级别: ${log.level} | 标题: ${log.title}\n内容: ${log.content}\n时间: ${log.createdAt.toISOString()}\nID: ${log.id}`;
      })
      .join("\n\n---\n\n");

    const userPrompt = `以下是最近 ${companyLogs.length} 条员工工作日志，请分析并总结：\n\n${logsSummary}`;

    // 4. 获取大模型配置
    // 优先从公司模型库中获取一个可用的模型
    const aiModel = await db.aiModel.findFirst({
      where: { companyId, isActive: true },
      orderBy: { createdAt: "desc" },
    });

    if (!aiModel) {
      return {
        success: false as const,
        processedCount: 0,
        notificationCount: 0,
        error: "系统尚未配置任何可用的大模型，请先前往「模型管理」页面添加。",
      };
    }

    // 5. 获取 Ivy 员工配置（用于提示词等，如果需要自定义）
    const ivyEmployee = await db.employee.findFirst({
      where: {
        companyId,
        role: "assistant",
        name: { contains: "艾薇" },
      },
    });

    let modelId = aiModel.id;
    if (ivyEmployee?.config) {
      try {
        const config = JSON.parse(ivyEmployee.config);
        const configModelId = config.modelId || config.model;
        // 如果配置了具体的模型 ID，可以尝试验证或直接使用
        if (configModelId) modelId = configModelId;
      } catch {
        /* use default from aiModel */
      }
    }

    // 6. 调用 AI 进行分析
    const agent = await getMastraAgent(
      "assistant",
      modelId,
      IVY_SYSTEM_PROMPT,
      undefined,
      undefined,
      companyId,
    );
    const result = await agent.generate(userPrompt);

    // 6. 解析 AI 输出
    let summaryResult: IvySummaryResult;
    try {
      // 尝试从 AI 回复中提取 JSON
      const jsonMatch = result.text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        summaryResult = JSON.parse(jsonMatch[0]);
      } else {
        // 无法解析为 JSON，作为纯文本总结
        summaryResult = {
          hasNotableItems: companyLogs.some(
            (l) => l.level === "error" || l.level === "warning",
          ),
          summary: result.text,
          items: [],
        };
      }
    } catch {
      summaryResult = {
        hasNotableItems: false,
        summary: result.text,
        items: [],
      };
    }

    // 7. 生成通知
    let notificationCount = 0;

    if (summaryResult.hasNotableItems && summaryResult.items.length > 0) {
      // 为每个值得关注的项目创建通知
      for (const item of summaryResult.items) {
        const type =
          item.level === "error"
            ? "error"
            : item.level === "warning"
              ? "warning"
              : item.level === "success"
                ? "success"
                : "info";

        await createNotification({
          companyId,
          title: `🌿 ${item.title}`,
          content: `${item.detail}\n\n👤 相关员工: ${item.employeeName}`,
          type,
          source: "ivy",
          sourceId: ivyEmployee?.id,
        });
        notificationCount++;
      }
    }

    // 8. 总是创建一条总结通知
    await createNotification({
      companyId,
      title: "📊 艾薇 · 工作动态总结",
      content: summaryResult.summary,
      type: "summary",
      source: "ivy",
      sourceId: ivyEmployee?.id,
    });
    notificationCount++;

    // 9. 尝试发送邮件
    const emailConfigured = await isEmailConfigured(companyId);
    if (emailConfigured && summaryResult.hasNotableItems) {
      const emailBody = formatEmailContent(summaryResult);
      const emailSent = await sendNotificationEmail(
        companyId,
        `[一人公司] 艾薇工作动态通知 - ${new Date().toLocaleDateString("zh-CN")}`,
        emailBody,
      );

      if (emailSent) {
        // 更新通知的 emailSent 状态
        await db.notification.updateMany({
          where: {
            companyId,
            source: "ivy",
            emailSent: false,
            createdAt: { gte: new Date(Date.now() - 60 * 1000) }, // 最近1分钟内
          },
          data: { emailSent: true },
        });
      }
    }

    // 10. 标记日志为已处理
    await markLogsProcessed(companyLogs.map((l) => l.id));

    return {
      success: true as const,
      processedCount: companyLogs.length,
      notificationCount,
      summary: summaryResult.summary,
    };
  } catch (error: unknown) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    console.error("[Ivy] Scan and summarize error:", error);
    return {
      success: false as const,
      processedCount: 0,
      notificationCount: 0,
      error: errorMessage,
    };
  }
}

/**
 * 格式化邮件内容
 */
function formatEmailContent(summary: IvySummaryResult): string {
  const lines: string[] = [
    "━━━━━━━━━━━━━━━━━━━━━━━━━",
    "📊 一人公司 - 工作动态通知",
    "━━━━━━━━━━━━━━━━━━━━━━━━━",
    "",
    `📋 总结: ${summary.summary}`,
    "",
  ];

  if (summary.items.length > 0) {
    lines.push("📌 值得关注的事项：");
    lines.push("");

    for (const item of summary.items) {
      const icon =
        item.level === "error"
          ? "🔴"
          : item.level === "warning"
            ? "🟡"
            : item.level === "success"
              ? "🟢"
              : "🔵";
      lines.push(`${icon} ${item.title}`);
      lines.push(`   ${item.detail}`);
      lines.push(`   👤 员工: ${item.employeeName}`);
      lines.push("");
    }
  }

  lines.push("━━━━━━━━━━━━━━━━━━━━━━━━━");
  lines.push("由 艾薇 (Ivy) 自动生成");
  lines.push(`时间: ${new Date().toLocaleString("zh-CN")}`);

  return lines.join("\n");
}

/**
 * 获取 Ivy 的运行状态
 */
export async function getIvyStatus(companyId: string) {
  // 查找 Ivy 员工
  const ivyEmployee = await db.employee.findFirst({
    where: {
      companyId,
      role: "assistant",
    },
  });

  if (!ivyEmployee) {
    return { exists: false, status: "not_found" };
  }

  // 获取未处理日志数
  const unprocessedCount = await db.employeeLog.count({
    where: {
      isProcessed: false,
      employee: { companyId },
    },
  });

  // 获取最近的通知
  const latestNotification = await db.notification.findFirst({
    where: { companyId, source: "ivy" },
    orderBy: { createdAt: "desc" },
  });

  // 检查邮件是否配置
  const emailConfigured = await isEmailConfigured(companyId);

  return {
    exists: true,
    employeeId: ivyEmployee.id,
    employeeName: ivyEmployee.name,
    status: ivyEmployee.status,
    unprocessedLogs: unprocessedCount,
    lastSummary: latestNotification?.createdAt,
    emailConfigured,
  };
}
