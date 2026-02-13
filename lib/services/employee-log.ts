/**
 * 员工日志记录服务
 * 在所有员工操作发生时记录日志，供助理 Ivy 监控和总结。
 */

import { db } from "@/lib/db";

export type EmployeeLogType =
  | "workflow_execution"
  | "chat_response"
  | "task_completion"
  | "error"
  | "status_change";

export type EmployeeLogLevel = "info" | "warning" | "error" | "success";

export interface CreateLogParams {
  employeeId: string;
  type: EmployeeLogType;
  title: string;
  content: string;
  metadata?: Record<string, unknown>;
  level?: EmployeeLogLevel;
}

/**
 * 记录一条员工日志
 */
export async function createEmployeeLog(params: CreateLogParams) {
  try {
    const log = await db.employeeLog.create({
      data: {
        employeeId: params.employeeId,
        type: params.type,
        title: params.title,
        content: params.content,
        metadata: params.metadata ? JSON.stringify(params.metadata) : null,
        level: params.level || "info",
      },
    });
    return log;
  } catch (error) {
    // 日志记录失败不应影响主流程
    console.error("[EmployeeLog] Failed to create log:", error);
    return null;
  }
}

/**
 * 记录工作流执行日志
 */
export async function logWorkflowExecution(
  employeeId: string,
  employeeName: string,
  input: string,
  success: boolean,
  output?: string,
  error?: string,
  nodeResults?: Array<{ nodeLabel: string; status: string; output?: string }>,
  duration?: number,
) {
  const level: EmployeeLogLevel = success ? "success" : "error";
  const title = success
    ? `${employeeName} 完成工作流执行`
    : `${employeeName} 工作流执行失败`;

  const contentParts = [
    `📋 输入指令: ${input}`,
    success
      ? `✅ 执行结果: ${output?.substring(0, 500) || "完成"}`
      : `❌ 错误: ${error}`,
  ];

  if (duration) {
    contentParts.push(`⏱️ 耗时: ${duration}ms`);
  }

  return createEmployeeLog({
    employeeId,
    type: "workflow_execution",
    title,
    content: contentParts.join("\n"),
    metadata: {
      input,
      output: output?.substring(0, 1000),
      error,
      nodeResults,
      duration,
      success,
    },
    level,
  });
}

/**
 * 记录聊天回复日志
 */
export async function logChatResponse(
  employeeId: string,
  employeeName: string,
  userMessage: string,
  aiResponse: string,
) {
  return createEmployeeLog({
    employeeId,
    type: "chat_response",
    title: `${employeeName} 回复了消息`,
    content: `💬 用户: ${userMessage.substring(0, 200)}\n🤖 回复: ${aiResponse.substring(0, 500)}`,
    metadata: {
      userMessage: userMessage.substring(0, 500),
      aiResponse: aiResponse.substring(0, 1000),
    },
    level: "info",
  });
}

/**
 * 记录错误日志
 */
export async function logEmployeeError(
  employeeId: string,
  employeeName: string,
  errorMessage: string,
  context?: string,
) {
  return createEmployeeLog({
    employeeId,
    type: "error",
    title: `${employeeName} 发生错误`,
    content: `⚠️ 错误: ${errorMessage}${context ? `\n📍 上下文: ${context}` : ""}`,
    metadata: { error: errorMessage, context },
    level: "error",
  });
}

/**
 * 获取未处理的日志（供 Ivy 扫描）
 */
export async function getUnprocessedLogs(limit: number = 50) {
  return db.employeeLog.findMany({
    where: { isProcessed: false },
    include: {
      employee: {
        select: { id: true, name: true, role: true, companyId: true },
      },
    },
    orderBy: { createdAt: "asc" },
    take: limit,
  });
}

/**
 * 将日志标记为已处理
 */
export async function markLogsProcessed(logIds: string[]) {
  return db.employeeLog.updateMany({
    where: { id: { in: logIds } },
    data: { isProcessed: true },
  });
}
