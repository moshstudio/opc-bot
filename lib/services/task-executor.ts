/**
 * Task Executor Service
 * 负责子任务的调度和执行
 *
 * 核心职责:
 * 1. 接收 Brain Center 拆解后的子任务列表
 * 2. 按依赖关系调度执行（无依赖的并行执行）
 * 3. 为每个子任务选择执行方式：员工工作流 or 直接 LLM 调用
 * 4. 持久化执行结果、日志到数据库
 */

import { db } from "@/lib/db";
import { getMastraAgent } from "@/lib/mastra/agents";
import { executeWorkflow } from "@/lib/workflow/workflow-engine";
import { createNotification } from "./notification";
import { getActiveCompanyId } from "@/lib/active-state";

/**
 * 调度并执行父任务的所有子任务
 * 按依赖关系分批执行
 */
export async function dispatchSubTasks(
  parentTaskId: string,
  companyId: string,
) {
  try {
    const subTasks = await db.task.findMany({
      where: { parentTaskId, companyId },
      include: { assignedTo: true },
    });

    if (subTasks.length === 0) {
      console.log("[TaskExecutor] No subtasks to dispatch for:", parentTaskId);
      return;
    }

    console.log(
      `[TaskExecutor] Dispatching ${subTasks.length} subtasks for parent: ${parentTaskId}`,
    );

    // 解析子任务的依赖关系
    const taskDeps = new Map<string, string[]>(); // taskId -> [依赖的子任务title]
    const titleToId = new Map<string, string>(); // title -> taskId

    for (const st of subTasks) {
      titleToId.set(st.title, st.id);
      let deps: string[] = [];
      if (st.context) {
        try {
          const ctx = JSON.parse(st.context);
          deps = ctx.dependencies || [];
        } catch {}
      }
      taskDeps.set(st.id, deps);
    }

    // 将title依赖转为id依赖
    const idDeps = new Map<string, string[]>();
    for (const [taskId, depTitles] of taskDeps) {
      const depIds = depTitles
        .map((title) => titleToId.get(title))
        .filter((id): id is string => !!id);
      idDeps.set(taskId, depIds);
    }

    // 按依赖关系分层执行 (BFS拓扑排序)
    const completed = new Set<string>();
    const failed = new Set<string>();
    const remaining = new Set(subTasks.map((t) => t.id));

    while (remaining.size > 0) {
      // 找出可以执行的任务（所有依赖已完成）
      const ready: string[] = [];
      for (const taskId of remaining) {
        const deps = idDeps.get(taskId) || [];
        const allDepsCompleted = deps.every((d) => completed.has(d));
        const anyDepFailed = deps.some((d) => failed.has(d));

        if (anyDepFailed) {
          // 依赖任务失败，标记为跳过/失败
          await db.task.update({
            where: { id: taskId },
            data: {
              status: "FAILED",
              result: "前置依赖任务执行失败，已跳过。",
            },
          });
          await db.taskMessage.create({
            data: {
              taskId,
              role: "system",
              content: "由于前置依赖任务失败，此任务被跳过。",
            },
          });
          failed.add(taskId);
          remaining.delete(taskId);
        } else if (allDepsCompleted) {
          ready.push(taskId);
        }
      }

      if (ready.length === 0 && remaining.size > 0) {
        // 死锁：有任务但无法执行（可能是循环依赖）
        console.error("[TaskExecutor] Deadlock detected. Remaining tasks:", [
          ...remaining,
        ]);
        for (const taskId of remaining) {
          await db.task.update({
            where: { id: taskId },
            data: { status: "FAILED", result: "调度死锁：可能存在循环依赖。" },
          });
          failed.add(taskId);
        }
        break;
      }

      // 执行前检查权限，并判断是否被手动暂停
      await checkExecutionAllowed(companyId, parentTaskId);

      // 并行执行当前批次的任务
      const results = await Promise.allSettled(
        ready.map((taskId) => executeSingleTask(taskId, companyId)),
      );

      for (let i = 0; i < ready.length; i++) {
        const taskId = ready[i];
        remaining.delete(taskId);
        const r = results[i];
        if (r.status === "fulfilled" && r.value) {
          completed.add(taskId);
        } else {
          failed.add(taskId);
        }
      }
    }

    // 更新父任务状态
    const allCompleted = failed.size === 0;
    const parentStatus = allCompleted ? "COMPLETED" : "FAILED";
    const completedCount = completed.size;
    const totalCount = subTasks.length;

    await db.task.update({
      where: { id: parentTaskId },
      data: {
        status: parentStatus,
        result: allCompleted
          ? `所有 ${totalCount} 个子任务已完成。`
          : `${completedCount}/${totalCount} 个子任务完成，${failed.size} 个失败。`,
      },
    });

    await createNotification({
      companyId,
      title: allCompleted ? `任务执行完成` : `任务执行部分失败`,
      content: allCompleted
        ? `任务的 ${totalCount} 个子任务全部执行完成。`
        : `${completedCount}/${totalCount} 个子任务完成，${failed.size} 个失败。`,
      type: allCompleted ? "success" : "warning",
      source: "system",
    });

    console.log(
      `[TaskExecutor] Parent task ${parentTaskId} finished: ${parentStatus}`,
    );
  } catch (error: any) {
    if (error.message === "EXECUTION_PAUSED") {
      console.log(`[TaskExecutor] Execution paused for company ${companyId}`);
      await db.task
        .update({ where: { id: parentTaskId }, data: { status: "PAUSED" } })
        .catch(() => {});
      return;
    }
    console.error("[TaskExecutor] Error dispatching subtasks:", error);
    await db.task
      .update({
        where: { id: parentTaskId },
        data: { status: "FAILED", result: "任务调度执行异常。" },
      })
      .catch(() => {});
  }
}

/**
 * 检查是否允许执行（基于后台运行设置和活跃状态和任务本身的状态）
 */
async function checkExecutionAllowed(companyId: string, taskId?: string) {
  if (taskId) {
    const task = await db.task.findUnique({
      where: { id: taskId },
      select: { status: true },
    });
    if (task && task.status === "PAUSED") {
      throw new Error("EXECUTION_PAUSED");
    }
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

/**
 * 执行单个子任务
 * @returns true 表示成功
 */
export async function executeSingleTask(
  taskId: string,
  companyId: string,
): Promise<boolean> {
  try {
    // 1. 获取任务详情
    const task = await db.task.findUnique({
      where: { id: taskId },
      include: { assignedTo: true },
    });

    if (!task) {
      console.error("[TaskExecutor] Task not found:", taskId);
      return false;
    }

    // 2. 检查权限
    await checkExecutionAllowed(companyId, taskId);

    // 3. 更新状态为执行中
    await db.task.update({
      where: { id: taskId },
      data: { status: "IN_PROGRESS" },
    });

    await db.taskMessage.create({
      data: {
        taskId,
        role: "system",
        content: `开始执行任务：${task.title}`,
      },
    });

    // 3. 更新员工状态为 working
    if (task.assignedTo) {
      await db.employee.update({
        where: { id: task.assignedTo.id },
        data: { status: "working" },
      });
    }

    let result: string;

    // 4. 选择执行方式
    if (task.assignedTo?.workflow) {
      // 有工作流 → 使用工作流引擎执行
      result = await executeViaWorkflow(task, companyId);
    } else {
      // 无工作流 → 直接 LLM 调用
      result = await executeViaLLM(task, companyId);
    }

    // 5. 保存结果
    await db.task.update({
      where: { id: taskId },
      data: {
        status: "COMPLETED",
        result,
      },
    });

    await db.taskMessage.create({
      data: {
        taskId,
        role: "assistant",
        content: result,
      },
    });

    // 6. 恢复员工状态
    if (task.assignedTo) {
      await db.employee.update({
        where: { id: task.assignedTo.id },
        data: { status: "idle" },
      });
    }

    console.log(`[TaskExecutor] Task ${taskId} completed successfully.`);
    return true;
  } catch (error: any) {
    if (error.message === "EXECUTION_PAUSED") {
      await db.task
        .update({ where: { id: taskId }, data: { status: "PAUSED" } })
        .catch(() => {});
      return false;
    }

    console.error(`[TaskExecutor] Task ${taskId} failed:`, error);

    await db.task
      .update({
        where: { id: taskId },
        data: {
          status: "FAILED",
          result: `执行失败: ${error.message}`,
        },
      })
      .catch(() => {});

    await db.taskMessage
      .create({
        data: {
          taskId,
          role: "system",
          content: `执行失败: ${error.message}`,
        },
      })
      .catch(() => {});

    // 恢复员工状态
    const task = await db.task.findUnique({
      where: { id: taskId },
      select: { assignedToId: true },
    });
    if (task?.assignedToId) {
      await db.employee
        .update({
          where: { id: task.assignedToId },
          data: { status: "idle" },
        })
        .catch(() => {});
    }

    return false;
  }
}

/**
 * 通过员工工作流执行任务
 */
async function executeViaWorkflow(
  task: any,
  companyId: string,
): Promise<string> {
  let workflowDef;
  try {
    workflowDef = JSON.parse(task.assignedTo.workflow);
  } catch {
    throw new Error("员工工作流配置解析失败");
  }

  let employeeConfig: any = {};
  if (task.assignedTo.config) {
    try {
      employeeConfig = JSON.parse(task.assignedTo.config);
    } catch {}
  }

  const input = `任务：${task.title}\n说明：${task.description || "无"}`;

  const wfResult = await executeWorkflow(
    workflowDef,
    input,
    task.assignedTo.id,
    { ...employeeConfig, companyId },
  );

  if (!wfResult.success) {
    throw new Error(wfResult.error || "工作流执行失败");
  }

  const output =
    typeof wfResult.finalOutput === "string"
      ? wfResult.finalOutput
      : JSON.stringify(wfResult.finalOutput);

  return output || "工作流执行完成，无输出内容。";
}

/**
 * 通过直接 LLM 调用执行任务
 */
async function executeViaLLM(task: any, companyId: string): Promise<string> {
  // 获取可用模型
  const aiModel = await db.aiModel.findFirst({
    where: { companyId, isActive: true },
    orderBy: { createdAt: "desc" },
  });

  if (!aiModel) {
    throw new Error("系统尚未配置可用的大模型，请前往「模型管理」页面添加。");
  }

  let systemPrompt =
    "你是一个高效的AI员工。请认真执行分配给你的任务，给出详细的执行结果。";
  let modelId = aiModel.id;
  const role = task.assignedTo?.role || "assistant";

  // 如果有指定员工，使用其配置
  if (task.assignedTo?.config) {
    try {
      const config = JSON.parse(task.assignedTo.config);
      if (config.prompt) systemPrompt = config.prompt;
      if (config.model || config.modelId) {
        modelId = config.model || config.modelId;
      }
    } catch {}
  }

  const prompt = `你需要完成以下任务：\n\n【任务标题】${task.title}\n【任务说明】${task.description || "无具体说明"}\n\n请给出详细、完整的执行结果。`;

  const agent = await getMastraAgent(
    role,
    modelId,
    systemPrompt,
    undefined,
    undefined,
    companyId,
  );

  const result = await agent.generate(prompt);
  return result.text || "任务执行完成，无输出内容。";
}
