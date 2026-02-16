"use server";

import { getMastraAgent } from "@/lib/mastra/agents";

export async function runAgentAction(role: string, input: string) {
  try {
    const agent = await getMastraAgent(role);
    const result = await agent.generate(input);
    return { success: true, response: result.text };
  } catch (error: any) {
    console.error("Agent Error:", error);
    return { success: false, error: error.message };
  }
}
