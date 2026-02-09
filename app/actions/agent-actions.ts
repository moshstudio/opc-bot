"use server";

import { createAgent } from "@/lib/agents/agent-factory";

export async function runAgentAction(role: string, input: string) {
  try {
    const agent = await createAgent(role);
    const response = await agent.invoke(input);
    return { success: true, response };
  } catch (error: any) {
    console.error("Agent Error:", error);
    return { success: false, error: error.message };
  }
}
