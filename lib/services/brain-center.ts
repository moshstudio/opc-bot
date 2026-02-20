import { db } from "@/lib/db";
import { getMastraAgent } from "@/lib/mastra/agents";
import { createNotification } from "./notification";

// System prompt for Brain Center
const BRAIN_SYSTEM_PROMPT = `你是一个高级企业大脑中枢架构师。你的老板提出了一个任务需求。
当前，你的公司中包含一组拥有不同技能和配置的员工角色。
请根据你的可用的员工列表，仔细思考并将该需求拆解为多个子任务（1-5个）。
由于这是一人公司模拟器的后端 AI 调度核心，请高度自动化和精确！

每个子任务必须明确：
1. 它的目标是什么？
2. 它的执行标准或需要生成的产物是什么？
3. 分配给哪一位员工（请使用员工的唯一角色/名称，如果找不到完全匹配，请指定最合适的那个员工或者留空让系统决定）。

你需要始终返回合法的 JSON 格式。返回格式如下：
{
  "analysis": "对老板需求的简短理解分析",
  "subTasks": [
    {
      "title": "清晰的任务标题",
      "description": "具体的执行说明，明确任务的前置条件和交付标准",
      "assigneeRole": "期望指派给什么角色的员工。如 frontend、backend、devops 等",
      "dependencies": ["如果该任务需要等待其他某个子任务完成，在这里写明前置子任务标题，否则为空白数组"]
    }
  ]
}
注意：必须保证返回纯 JSON 格式文本，不要有任何多余的 Markdown 标记导致解析失败，如果必须包裹，请包裹在 \`\`\`json 和 \`\`\` 之间。`;

interface BrainAnalysisResult {
  analysis: string;
  subTasks: {
    title: string;
    description: string;
    assigneeRole: string;
    dependencies: string[];
  }[];
}

/**
 * 触发 Brain Center 分析并拆解任务
 * @param parentTaskId 顶层任务的 ID
 * @param companyId 公司 ID
 */
export async function processTaskByBrain(
  parentTaskId: string,
  companyId: string,
) {
  try {
    // 1. 查找顶层任务
    const topTask = await db.task.findUnique({
      where: { id: parentTaskId, companyId },
    });

    if (!topTask || topTask.status !== "PENDING") {
      console.log(
        "[Brain Center] Task not found or already processed:",
        parentTaskId,
      );
      return;
    }

    // 更新任务状态为处理中（中枢分析中）
    await db.task.update({
      where: { id: topTask.id },
      data: { status: "Brain_Processing" },
    });

    // 2. 获取公司内所有的员工状态
    const employees = await db.employee.findMany({
      where: { companyId, isActive: true },
    });

    const employeesSummary = employees
      .map((e) => {
        return `- 姓名: ${e.name}, 角色: ${e.role}, 状态: ${e.status}`;
      })
      .join("\n");

    const userPrompt = `这是一次大脑调度拆解。\n\n老板布置的任务要求是：\n【标题】${topTask.title}\n【具体说明】${topTask.description || "无具体说明"}\n\n【本公司的员工阵容如下】：\n${employeesSummary}\n\n请分析此任务，并给出必须拆解的 Json 执行计划。`;

    // 3. 获取 Brain 专用的高级模型
    // 必须从系统配置中查找指定的 Brain 模型，严禁自动 fallback
    const brainModelConfig = await db.systemConfig.findUnique({
      where: {
        companyId_key: {
          companyId,
          key: "BRAIN_MODEL_ID",
        },
      },
    });

    let aiModel = null;
    let errorMsg = "";

    if (!brainModelConfig?.value) {
      errorMsg =
        "尚未指定「大脑模型」，请前往「系统设置 -> 核心大脑」进行配置。";
    } else {
      aiModel = await db.aiModel.findUnique({
        where: { id: brainModelConfig.value },
      });
      if (!aiModel || !aiModel.isActive) {
        errorMsg =
          "指定的大脑模型已失效或被禁用，请前往「系统设置 -> 核心大脑」重新显式指定可用模型。";
        aiModel = null;
      }
    }

    if (!aiModel) {
      await db.task.update({
        where: { id: topTask.id },
        data: {
          status: "FAILED",
          result: errorMsg,
        },
      });
      await createNotification({
        companyId,
        title: `⚠️ 核心大脑配置错误`,
        content: `任务 "${topTask.title}" 拆解失败：${errorMsg}`,
        type: "error",
        source: "system",
      });
      return;
    }

    const agent = await getMastraAgent(
      "ceo",
      aiModel.id,
      BRAIN_SYSTEM_PROMPT,
      undefined,
      undefined,
      companyId,
    );
    const result = await agent.generate(userPrompt);

    // 4. 解析结果
    let plan: BrainAnalysisResult | null = null;
    const cleanedText = result.text.trim();
    const jsonMatch = cleanedText.match(/\{([\s\S]*)\}/);
    if (jsonMatch) {
      try {
        plan = JSON.parse(jsonMatch[0]) as BrainAnalysisResult;
      } catch (e) {
        console.error("[Brain Center] JSON Parse failed", e);
      }
    }

    if (!plan || !plan.subTasks) {
      // 拆解失败，状态退回到 Pending 或改成 failed
      await db.task.update({
        where: { id: topTask.id },
        data: {
          status: "FAILED",
          result: "中枢拆解任务失败，未返回合法的计划结构。",
        },
      });
      return;
    }

    // 5. 持久化子任务到数据库
    for (const st of plan.subTasks) {
      // 尝试匹配员工
      let assignedToId = null;
      const matchedEmp = employees.find(
        (e) => e.role === st.assigneeRole || e.name.includes(st.assigneeRole),
      );
      if (matchedEmp) {
        assignedToId = matchedEmp.id;
      }

      await db.task.create({
        data: {
          title: st.title,
          description: st.description,
          companyId,
          parentTaskId: topTask.id,
          status: "PENDING",
          assignedToId,
          context: JSON.stringify({ dependencies: st.dependencies }),
        },
      });
    }

    // 更新原任务的状态和分析结果
    await db.task.update({
      where: { id: topTask.id },
      data: {
        status: "IN_PROGRESS", // 或者自定义状态 "DISPATCHED"
        context: JSON.stringify({ brainAnalysis: plan.analysis }),
      },
    });

    // 通知用户
    await createNotification({
      companyId,
      title: `🧠 任务已由大脑中枢拆解: ${topTask.title}`,
      content: `中枢分析结果: ${plan.analysis}\n已拆解为 ${plan.subTasks.length} 个子任务。`,
      type: "info",
      source: "system",
    });

    console.log(
      `[Brain Center] Successfully dispatched task ${topTask.id} into ${plan.subTasks.length} subtasks.`,
    );
  } catch (error) {
    console.error("[Brain Center] Error processing task:", error);
    await db.task
      .update({ where: { id: parentTaskId }, data: { status: "FAILED" } })
      .catch(() => {});
  }
}
