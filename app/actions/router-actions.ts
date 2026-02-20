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

    // 3. 获取大模型配置
    // 必须从系统配置中查找指定的 Brain 模型，严禁自动 fallback
    const brainModelConfig = await db.systemConfig.findUnique({
      where: {
        companyId_key: {
          companyId,
          key: "BRAIN_MODEL_ID",
        },
      },
    });

    if (!brainModelConfig?.value) {
      return {
        success: false,
        error: "尚未指定「大脑模型」，请前往「系统设置 -> 核心大脑」进行配置。",
      };
    }

    const aiModel = await db.aiModel.findUnique({
      where: { id: brainModelConfig.value },
    });

    if (!aiModel || !aiModel.isActive) {
      return {
        success: false,
        error:
          "指定的大脑模型已失效或被禁用，请前往「系统设置 -> 核心大脑」重新显式指定可用模型。",
      };
    }

    // 4. Router Agent Logic (using Mastra)
    const { getMastraAgent } = await import("@/lib/mastra/agents");
    const routerAgent = await getMastraAgent(
      "assistant",
      aiModel.id,
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
      undefined,
      undefined,
      companyId,
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
