"use server";

import { db } from "@/lib/db";
import { runAgentAction } from "./agent-actions";
import { createAgent as createAgent_ } from "@/lib/agents/agent-factory";
import { revalidatePath } from "next/cache";

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

export async function sendMessage(employeeId: string, message: string) {
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

    // 3. Get Conversation History
    const history = await db.message.findMany({
      where: { employeeId },
      orderBy: { createdAt: "desc" }, // Get latest first
      take: 10, // Limit context to last 10 messages
    });

    // Reverse to chronological order for the agent
    const chronologicalHistory = history
      .reverse()
      .map((msg: { role: string; content: string }) => ({
        role: msg.role,
        content: msg.content,
      }));

    // 4. Call AI Agent
    // We cast the role to string because the factory expects a string,
    // and we trust our DB data or default to 'assistant' if unknown.
    const agent = await createAgent_(
      employee.role || "assistant",
      "gpt-4o",
      chronologicalHistory,
    );
    const aiResponse = await agent.invoke(message);

    // 5. Save Assistant Message
    await db.message.create({
      data: {
        content: aiResponse,
        role: "assistant",
        employeeId,
      },
    });

    revalidatePath("/dashboard");

    return { success: true, message: aiResponse };
  } catch (error: any) {
    console.error("Chat Error:", error);
    return { success: false, error: error.message };
  }
}
