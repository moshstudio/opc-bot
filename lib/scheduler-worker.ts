import cron, { ScheduledTask } from "node-cron";
import { db } from "./db";
import { executeEmployeeWorkflow } from "@/app/actions/workflow-actions";

/**
 * 内存中存储已调度的任务，用于管理（如避免重复、动态更新）
 * 使用全局单例模式以支持 Next.js 开发环境下的热更新
 */
const globalForScheduler = global as unknown as {
  scheduledJobs: Map<string, ScheduledTask>;
};

const scheduledJobs =
  globalForScheduler.scheduledJobs || new Map<string, ScheduledTask>();

if (process.env.NODE_ENV !== "production") {
  globalForScheduler.scheduledJobs = scheduledJobs;
}

/**
 * 扫描并调度所有具备定时触发器的员工
 */
export async function syncScheduledWorkflows() {
  console.log("[Scheduler] 正在扫描并同步具备定时触发工作流的员工...");

  try {
    // 1. 获取所有配置了工作流的员工
    const employees = await db.employee.findMany({
      where: {
        workflow: {
          not: null,
        },
        isActive: true,
      },
    });

    const activeEmployeeIds = new Set<string>();

    for (const employee of employees) {
      if (!employee.workflow) continue;

      try {
        const workflow = JSON.parse(employee.workflow);
        // 查找 cron_trigger 节点
        const cronNode = workflow.nodes?.find(
          (n: any) => n.type === "cron_trigger",
        );

        if (cronNode && cronNode.data?.cron) {
          const cronExpression = cronNode.data.cron;
          activeEmployeeIds.add(employee.id);

          // 如果任务已存在且表达式没变，则跳过
          // 这里为了简单，我们选择先停止并重新创建，或者检查版本
          // 这里检查之前的 Job 是否存在
          if (scheduledJobs.has(employee.id)) {
            // 如果存在且表达式一致，可以保持原样（可选）
            // 这里我们采取“先停止后创建”策略以保证最新配置
            scheduledJobs.get(employee.id)?.stop();
          }

          console.log(
            `[Scheduler] 为员工 "${employee.name}" (${employee.id}) 调度任务: ${cronExpression}`,
          );

          const job = cron.schedule(cronExpression, async () => {
            console.log(
              `[Scheduler] 定时触发员工 "${employee.name}" 的工作流...`,
            );
            try {
              const result = await executeEmployeeWorkflow(
                employee.id,
                "Auto-triggered by scheduler",
              );
              console.log(
                `[Scheduler] 任务完成: ${employee.name}, 成功: ${result.success}`,
              );
            } catch (err) {
              console.error(
                `[Scheduler] 执行员工 "${employee.name}" 工作流时出错:`,
                err,
              );
            }
          });

          scheduledJobs.set(employee.id, job);
        }
      } catch (err) {
        console.error(
          `[Scheduler] 解析员工 "${employee.name}" 的工作流时出错:`,
          err,
        );
      }
    }

    // 2. 清理掉不再具备定时器的任务
    for (const [id, job] of scheduledJobs.entries()) {
      if (!activeEmployeeIds.has(id)) {
        console.log(`[Scheduler] 停止并移除失效的定时任务: ${id}`);
        job.stop();
        scheduledJobs.delete(id);
      }
    }
  } catch (err) {
    console.error("[Scheduler] 同步工作流时出错:", err);
  }
}

/**
 * 启动调度器监听
 */
export function initScheduler() {
  console.log("[Scheduler] 调度器初始化中...");

  // 立即同步一次
  syncScheduledWorkflows();

  // 每分钟同步一次数据库中的配置变化（或者根据业务需要调整频率）
  // 也可以在保存员工时手动触发 syncScheduledWorkflows
  cron.schedule("*/5 * * * *", () => {
    syncScheduledWorkflows();
  });
}
