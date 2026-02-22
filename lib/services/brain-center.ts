import { db } from "@/lib/db";
import { getMastraAgent } from "@/lib/mastra/agents";
import { createNotification } from "./notification";
import { dispatchSubTasks } from "./task-executor";
import { getActiveCompanyId } from "@/lib/active-state";

// System prompt for Brain Center
const BRAIN_SYSTEM_PROMPT = `你是一个高级企业大脑中枢架构师。你的老板提出了一个任务需求。
当前，你的公司中包含一组拥有不同技能和配置的员工角色。
请根据你可用的“员工阵容”及其“职责描述”，仔细思考并将该需求拆解为多个子任务（1-5个）。

分配原则：
1. **职责契合**：必须根据员工的“职责描述”来分配任务。例如：涉及代码架构或数据库的应分配给“全栈工程师”，涉及线上部署或 K8s 的应分配给“DevOps 工程师”，涉及总结监控的应分配给“助理”。
2. **角色一致性**：在返回的 JSON 中，assigneeRole 必须填写下方员工列表中对应的【角色】字段，以便系统自动指派。

每个子任务必须明确：
1. 它的目标是什么？
2. 它的执行标准或需要生成的产物是什么？
3. 分配给哪一位员工（务必使用下方列表中提供的【角色】）。

你需要始终返回合法的 JSON 格式。返回格式如下：
{
  "analysis": "对老板需求的理解分析，以及这样进行任务拆解和员工分配的理由",
  "subTasks": [
    {
      "title": "清晰的任务标题",
      "description": "具体的执行说明，明确任务的前置条件和交付标准",
      "assigneeRole": "必须匹配下方员工列表中的【角色】字段",
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

    // 权限检查
    await checkExecutionAllowed(companyId, parentTaskId);

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
        let responsibilities = "无详细描述";
        if (e.config) {
          try {
            const config = JSON.parse(e.config);
            responsibilities = config.prompt || "无详细描述";
          } catch {
            // ignore parse error
          }
        }
        return `【角色】: ${e.role}\n【姓名】: ${e.name}\n【职责描述】: ${responsibilities}\n【状态】: ${e.status}`;
      })
      .join("\n\n---\n\n");

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
      // 尝试匹配员工（精确匹配 → 包含匹配 → 模糊匹配）
      let assignedToId = null;
      const role = st.assigneeRole?.toLowerCase() || "";
      const matchedEmp =
        employees.find((e) => e.role.toLowerCase() === role) ||
        employees.find(
          (e) =>
            e.role.toLowerCase().includes(role) ||
            role.includes(e.role.toLowerCase()),
        ) ||
        employees.find(
          (e) =>
            e.name.toLowerCase().includes(role) ||
            role.includes(e.name.toLowerCase()),
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
        status: "IN_PROGRESS",
        context: JSON.stringify({ brainAnalysis: plan.analysis }),
      },
    });

    // 通知用户
    await createNotification({
      companyId,
      title: `任务已由大脑中枢拆解: ${topTask.title}`,
      content: `中枢分析结果: ${plan.analysis}\n已拆解为 ${plan.subTasks.length} 个子任务，正在自动调度执行...`,
      type: "info",
      source: "system",
    });

    console.log(
      `[Brain Center] Successfully split task ${topTask.id} into ${plan.subTasks.length} subtasks. Starting dispatch...`,
    );

    // 6. 自动调度执行子任务（异步）
    dispatchSubTasks(topTask.id, companyId).catch((err) => {
      console.error("[Brain Center] Auto-dispatch failed:", err);
    });
  } catch (error: any) {
    if (error.message === "EXECUTION_PAUSED") {
      await db.task
        .update({ where: { id: parentTaskId }, data: { status: "PAUSED" } })
        .catch(() => {});
      return;
    }
    console.error("[Brain Center] Error processing task:", error);
    await db.task
      .update({ where: { id: parentTaskId }, data: { status: "FAILED" } })
      .catch(() => {});
  }
}

/**
 * 检查是否允许执行（基于后台运行设置和活跃状态）
 */
async function checkExecutionAllowed(companyId: string, taskId?: string) {
  if (taskId) {
    const task = await db.task.findUnique({
      where: { id: taskId },
      select: { status: true },
    });
    if (task?.status === "PAUSED") throw new Error("EXECUTION_PAUSED");
  }

  const config = await db.systemConfig.findUnique({
    where: {
      companyId_key: {
        companyId,
        key: "BACKGROUND_SCHEDULER_ENABLED",
      },
    },
  });

  const backgroundEnabled = config?.value === "true";
  const isActive = getActiveCompanyId() === companyId;

  if (!backgroundEnabled && !isActive) {
    throw new Error("EXECUTION_PAUSED");
  }
}
