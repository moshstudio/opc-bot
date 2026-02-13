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
  clientModelConfig?: { modelName?: string; baseUrl?: string; apiKey?: string },
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

    const modelName =
      clientModelConfig?.modelName ||
      config.modelName ||
      config.model ||
      "gpt-4o";
    const systemPrompt = config.prompt;

    const agent = getMastraAgent(
      employee.role || "assistant",
      modelName,
      systemPrompt,
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
