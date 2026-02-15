"use server";
import { db } from "@/lib/db";

interface RoutingResult {
  reasoning: string;
  selectedEmployeeIds: string[];
}

export async function routeTaskToEmployees(
  taskDescription: string,
  companyId: string,
): Promise<{ success: boolean; result?: RoutingResult; error?: string }> {
  try {
    // 1. Fetch available employees
    const employees = await db.employee.findMany({
      where: { companyId, isActive: true },
      select: { id: true, name: true, role: true, config: true },
    });

    if (employees.length === 0) {
      return { success: false, error: "No employees found" };
    }

    // 2. Prepare employee manifest for the Router
    const roster = employees
      .map((e) => {
        let skills = "General Assistant";
        try {
          if (e.config) {
            const config = JSON.parse(e.config);
            if (config.prompt) skills = config.prompt.substring(0, 200) + "...";
          }
        } catch {}
        return `- ID: ${e.id}\n  Name: ${e.name}\n  Role: ${e.role}\n  Skills/Persona: ${skills}`;
      })
      .join("\n\n");

    // 3. Router Agent Logic (using Mastra)
    const { getMastraAgent } = await import("@/lib/mastra/agents");
    const routerAgent = await getMastraAgent(
      "assistant",
      "gpt-4o",
      `
You are an intelligent Task Dispatcher for a company.
Your job is to select the BEST employee(s) to handle a specific user task.

Here is the roster of available employees:
${roster}

Rules:
1. Analyze the USER TASK carefully.
2. Provide detailed reasoning for why you chose specific employees.
3. If the task is general, you can select multiple employees for different perspectives.
4. If the task is specific (e.g., "Write python code"), select ONLY the expert.
5. You MUST return a JSON object in this format:
   {
     "reasoning": "I selected X because...",
     "selectedEmployeeIds": ["id1", "id2"]
   }
6. Do NOT return markdown formatting, just the raw JSON string.
`,
    );

    const result_ = await routerAgent.generate(taskDescription);
    const rawContent = result_.text;

    // Cleanup potential markdown code blocks
    const jsonStr = rawContent
      .replace(/```json/g, "")
      .replace(/```/g, "")
      .trim();

    const result = JSON.parse(jsonStr) as RoutingResult;

    return { success: true, result };
  } catch (error: any) {
    console.error("Routing failed:", error);
    return { success: false, error: error.message };
  }
}
