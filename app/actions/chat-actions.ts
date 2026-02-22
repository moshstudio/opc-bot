"use server";

import { db } from "@/lib/db";
import { getMastraAgent } from "@/lib/mastra/agents";
import { revalidatePath } from "next/cache";
import { logChatResponse } from "@/lib/services/employee-log";

export async function getChatHistory(employeeId: string) {
  try {
    const messages = await db.message.findMany({
      where: { employeeId },
      orderBy: { createdAt: "asc" },
      // Take last 50 messages to avoid context overflow for now
      take: 50,
    });

    return { success: true, messages };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function sendMessage(
  employeeId: string,
  message: string,
  clientModelConfig?: {
    modelName?: string;
    baseUrl?: string;
    apiKey?: string;
    provider?: string;
  },
) {
  try {
    // 1. Get Employee details
    const employee = await db.employee.findUnique({
      where: { id: employeeId },
    });

    if (!employee) {
      return { success: false, error: "Employee not found" };
    }

    // 2. Save User Message
    await db.message.create({
      data: {
        content: message,
        role: "user",
        employeeId,
      },
    });

    // 4. Call AI Agent
    // Parse config
    let config: any = {};
    if (employee.config) {
      try {
        config = JSON.parse(employee.config);
      } catch (e) {
        console.error("Failed to parse employee config", e);
      }
    }

    // 4. 获取大模型配置
    const aiModel = await db.aiModel.findFirst({
      where: { companyId: employee.companyId, isActive: true },
      orderBy: { createdAt: "desc" },
    });

    if (
      !aiModel &&
      !clientModelConfig?.modelName &&
      !config.modelName &&
      !config.model
    ) {
      return {
        success: false,
        error: "系统尚未配置任何可用的大模型，请先前往「模型管理」页面添加。",
      };
    }

    const modelName =
      clientModelConfig?.modelName ||
      config.modelName ||
      config.model ||
      aiModel?.id ||
      "gpt-4o"; // Fallback to string only if absolutely necessary for getMastraAgent to try env

    const systemPrompt = config.prompt;

    const agent = await getMastraAgent(
      employee.role || "assistant",
      modelName,
      systemPrompt,
      clientModelConfig,
      clientModelConfig?.provider,
      employee.companyId,
    );
    const result = await agent.generate(message);
    const aiResponse = result.text;

    // 5. Save Assistant Message
    await db.message.create({
      data: {
        content: aiResponse,
        role: "assistant",
        employeeId,
      },
    });

    // 记录聊天日志
    await logChatResponse(employeeId, employee.name, message, aiResponse);

    revalidatePath("/dashboard");

    return { success: true, message: aiResponse };
  } catch (error: any) {
    console.error("Chat Error:", error);
    return { success: false, error: error.message };
  }
}

export async function clearChatHistory(employeeId: string) {
  try {
    await db.message.deleteMany({
      where: { employeeId },
    });
    revalidatePath("/dashboard");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
