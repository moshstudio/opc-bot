// ==========================================
// 工作流系统 - 各节点类型的执行器
// ==========================================

import { WorkflowNodeData, WorkflowContext, WorkflowNodeType } from "./types";

/**
 * 节点执行器接口
 * 每种节点类型实现自己的执行逻辑
 */
export interface NodeExecutor {
  execute(data: WorkflowNodeData, context: WorkflowContext): Promise<string>;
}

// ===== 开始节点 =====
export const startExecutor: NodeExecutor = {
  async execute(_data, context) {
    return context.input;
  },
};

// ===== 定时工作流触发器 =====
export const cronTriggerExecutor: NodeExecutor = {
  async execute(data, context) {
    const {
      scheduleType = "visual",
      cron,
      frequency,
      time,
      daysOfWeek,
      daysOfMonth,
    } = data;

    console.log(
      `[Workflow] Cron Trigger "${data.label}" executed at ${new Date().toLocaleString()} for employee: ${context.employeeId}`,
    );

    const triggerInfo = {
      triggeredAt: new Date().toISOString(),
      timestamp: Date.now(),
      scheduleType,
      config:
        scheduleType === "cron"
          ? { cron }
          : { frequency, time, daysOfWeek, daysOfMonth },
    };

    return JSON.stringify(triggerInfo);
  },
};

// ===== 知识/数据检索节点 =====
export const knowledgeRetrievalExecutor: NodeExecutor = {
  async execute(data, context) {
    const {
      queryType = "logs",
      queryLimit,
      limit = 50,
      queryFilter,
      queryKeyword,
      queryTimeRange = "24h",
      queryEmployeeId,
      queryIncludeProcessed = false,
    } = data;

    const finalLimit = queryLimit || limit;
    const companyId = context.companyId;

    if (!companyId) {
      console.warn(
        `[Workflow] Knowledge Retrieval: 缺少上下文公司 ID (employeeId=${context.employeeId})，跳过检索`,
      );
      return JSON.stringify([]);
    }

    // 1. 构建时间过滤条件
    let timeFilter = {};
    if (queryTimeRange !== "all") {
      const now = new Date();
      let startTime = new Date(0);
      switch (queryTimeRange) {
        case "1h":
          startTime = new Date(now.getTime() - 60 * 60 * 1000);
          break;
        case "24h":
          startTime = new Date(now.getTime() - 24 * 60 * 60 * 1000);
          break;
        case "7d":
          startTime = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case "30d":
          startTime = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          break;
      }
      timeFilter = { createdAt: { gte: startTime } };
    }

    // 2. 根据类型执行不同的检索逻辑
    const { db } = await import("@/lib/db");

    // --- 日志检索 & 执行结果检索 ---
    if (queryType === "logs" || queryType === "execution_results") {
      const where: any = {
        employee: { companyId },
        ...timeFilter,
      };

      if (queryType === "execution_results") {
        where.type = "workflow_execution";
      }

      if (queryEmployeeId && queryEmployeeId !== "all") {
        where.employeeId = queryEmployeeId;
      }

      if (queryFilter && queryFilter !== "all") {
        where.level = queryFilter;
      }

      if (queryType === "logs" && !queryIncludeProcessed) {
        where.isProcessed = false;
      }

      if (queryKeyword) {
        where.OR = [
          { title: { contains: queryKeyword } },
          { content: { contains: queryKeyword } },
        ];
      }

      const logs = await db.employeeLog.findMany({
        where,
        include: {
          employee: {
            select: { id: true, name: true, role: true },
          },
        },
        orderBy: { createdAt: "desc" },
        take: finalLimit,
      });

      return JSON.stringify(logs);
    }

    // --- 通知检索 ---
    if (queryType === "notifications") {
      const where: any = {
        companyId,
        ...timeFilter,
      };

      if (queryFilter && queryFilter !== "all") {
        where.type = queryFilter;
      }

      if (queryKeyword) {
        where.OR = [
          { title: { contains: queryKeyword } },
          { content: { contains: queryKeyword } },
        ];
      }

      const notifications = await db.notification.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take: finalLimit,
      });

      return JSON.stringify(notifications);
    }

    // --- 知识库 (RAG) 检索 ---
    if (queryType === "knowledge_base") {
      const { rag } = await import("@/lib/mastra/rag");
      const previousOutput = getLastOutput(context);
      const query = queryKeyword || previousOutput || context.input;

      if (!query) {
        return JSON.stringify([]);
      }

      const results = await rag.retrieve({
        connection: { indexName: companyId }, // 假设 indexName 与 companyId 关联
        query: query,
        topK: finalLimit,
      });

      return JSON.stringify(results);
    }

    return JSON.stringify([]);
  },
};

// ===== LLM 处理节点 =====
export const processExecutor: NodeExecutor = {
  async execute(data, context) {
    const { getMastraAgent } = await import("@/lib/mastra/agents");

    const companyId = context.companyId;
    const { db } = await import("@/lib/db");

    // 获取可用模型
    const aiModel = await db.aiModel.findFirst({
      where: { companyId, isActive: true },
      orderBy: { createdAt: "desc" },
    });

    if (!aiModel && !data.model && !context.employeeConfig?.model) {
      throw new Error(
        "系统尚未配置任何可用的大模型，请先前往「模型管理」页面添加。",
      );
    }

    const model =
      data.model || context.employeeConfig?.model || aiModel?.id || "gpt-4o";

    let systemPrompt = data.prompt || context.employeeConfig?.prompt || "";

    systemPrompt = interpolateVariables(systemPrompt, context.variables);

    const previousOutput = getLastOutput(context);
    const input = interpolateVariables(
      previousOutput || context.input,
      context.variables,
    );

    const agent = await getMastraAgent(
      "assistant",
      model,
      systemPrompt,
      undefined,
      undefined,
      companyId,
    );

    const retryCount = data.retryCount || 0;
    const timeout = data.timeout || 30000;

    let lastError: any;

    for (let attempt = 0; attempt <= retryCount; attempt++) {
      try {
        let generatePromise;

        // 当定义了 outputSchema 时，使用 structuredOutput 强制结构化输出
        if (data.outputSchema) {
          try {
            const jsonSchema = JSON.parse(data.outputSchema);
            generatePromise = agent.generate(input, {
              structuredOutput: {
                schema: jsonSchema,
              },
            });
          } catch {
            // outputSchema 解析失败，回退到 prompt 注入
            const promptWithSchema =
              input +
              `\n\n**必须按以下 JSON 格式输出：**\n${data.outputSchema}`;
            generatePromise = agent.generate(promptWithSchema);
          }
        } else {
          generatePromise = agent.generate(input);
        }

        // Create a timeout promise that rejects
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => {
            reject(new Error(`Operation timed out after ${timeout}ms`));
          }, timeout);
        });

        const result: any = await Promise.race([
          generatePromise,
          timeoutPromise,
        ]);

        // 如果有结构化输出，优先使用 object
        if (data.outputSchema && result.object) {
          return JSON.stringify(result.object);
        }

        return result.text;
      } catch (error: any) {
        console.warn(
          `[Workflow] Node execution failed (attempt ${attempt + 1}/${retryCount + 1}):`,
          error.message,
        );
        lastError = error;
        // Wait a bit before retrying (exponential backoff could be added here)
        if (attempt < retryCount) {
          await new Promise((resolve) =>
            setTimeout(resolve, 1000 * (attempt + 1)),
          );
        }
      }
    }

    throw lastError || new Error("Execution failed after retries");
  },
};

// ===== 消息节点 =====
export const messageExecutor: NodeExecutor = {
  async execute(data, context) {
    const content = data.messageContent || getLastOutput(context) || "";
    return interpolateVariables(content, context.variables);
  },
};

// ===== 子员工委派节点 =====
export const subEmployeeExecutor: NodeExecutor = {
  async execute(data, context) {
    if (!data.linkedEmployeeId) {
      throw new Error("子员工节点未配置关联员工");
    }

    const { sendMessage } = await import("@/app/actions/chat-actions");

    const previousOutput = getLastOutput(context);
    const input = previousOutput || context.input;

    const result = await sendMessage(data.linkedEmployeeId, input);

    if (!result.success) {
      throw new Error(result.error || "子员工执行失败");
    }

    return result.message as string;
  },
};

// ===== 输出节点 =====
export const outputExecutor: NodeExecutor = {
  async execute(data, context) {
    const previousOutput = getLastOutput(context);

    if (data.templateContent) {
      return interpolateVariables(data.templateContent, context.variables);
    }

    return previousOutput || context.input;
  },
};

// ===== 条件判断节点 =====
export const conditionExecutor: NodeExecutor = {
  async execute(data, context) {
    // 1. 新版多条件逻辑
    if (
      data.conditions &&
      Array.isArray(data.conditions) &&
      data.conditions.length > 0
    ) {
      const results = data.conditions.map((condition: any) => {
        // 获取变量值（支持 node.field 写法）
        let val = "";
        if (condition.variable === "__input__") {
          val = context.variables["__input__"] || "";
        } else {
          val = getVariableValue(context.variables, condition.variable);
        }

        return checkCondition(val, condition.operator, condition.value);
      });

      const logic = data.logicalOperator || "AND";
      if (logic === "OR") {
        return results.some(Boolean) ? "true" : "false";
      } else {
        return results.every(Boolean) ? "true" : "false";
      }
    }

    // 2. 旧版单条件逻辑 (兼容)
    const previousOutput = getLastOutput(context);
    const valueToCheck = data.conditionVariable
      ? context.variables[data.conditionVariable] || ""
      : previousOutput;

    let result = false;

    switch (data.conditionType) {
      case "contains":
        result = valueToCheck.includes(data.conditionValue || "");
        break;
      case "equals":
        result = valueToCheck === (data.conditionValue || "");
        break;
      case "not_empty":
        result = valueToCheck.trim().length > 0;
        break;
      case "regex":
        try {
          const regex = new RegExp(data.conditionValue || "");
          result = regex.test(valueToCheck);
        } catch {
          result = false;
        }
        break;
      case "js_expression":
        try {
          const fn = new Function(
            "input",
            "variables",
            `return Boolean(${data.conditionValue || "false"})`,
          );
          result = fn(valueToCheck, context.variables);
        } catch {
          result = false;
        }
        break;
      default:
        result = valueToCheck.trim().length > 0;
    }

    return result ? "true" : "false";
  },
};

// ===== HTTP 请求节点 =====
export const httpRequestExecutor: NodeExecutor = {
  async execute(data, context) {
    const url = interpolateVariables(data.httpUrl || "", context.variables);
    const method = data.httpMethod || "GET";

    let headers: Record<string, string> = {};
    if (data.httpHeaders) {
      try {
        headers = JSON.parse(
          interpolateVariables(data.httpHeaders, context.variables),
        );
      } catch {
        headers = {};
      }
    }

    const fetchOptions: RequestInit = {
      method,
      headers: {
        "Content-Type": "application/json",
        ...headers,
      },
    };

    if (data.httpBody && method !== "GET") {
      fetchOptions.body = interpolateVariables(
        data.httpBody,
        context.variables,
      );
    }

    const response = await fetch(url, fetchOptions);
    const text = await response.text();

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${text.substring(0, 500)}`);
    }

    return text;
  },
};

// ===== 代码执行节点 =====
export const codeExecutor: NodeExecutor = {
  async execute(data, context) {
    if (!data.codeContent) {
      throw new Error("代码节点内容为空");
    }

    try {
      const fn = new Function(
        "input",
        "variables",
        `
        const output = (function() {
          ${data.codeContent}
        })();
        return output !== undefined ? String(output) : "";
        `,
      );

      const previousOutput = getLastOutput(context);
      const result = fn(previousOutput || context.input, {
        ...context.variables,
      });
      return String(result || "");
    } catch (error: any) {
      throw new Error(`代码执行错误: ${error.message}`);
    }
  },
};

// ===== 文本模板节点 =====
export const textTemplateExecutor: NodeExecutor = {
  async execute(data, context) {
    if (!data.templateContent) {
      return getLastOutput(context) || "";
    }

    return interpolateVariables(data.templateContent, context.variables);
  },
};

// ===== 通知节点 (站内信 & 邮件) =====
export const notificationExecutor: NodeExecutor = {
  async execute(data, context) {
    const { notificationType = "site", subject, content } = data;
    const companyId = context.companyId;

    if (!companyId) {
      console.warn(
        "[Workflow] Notification: Missing companyId, skipping notification",
      );
      return JSON.stringify({
        siteSent: false,
        emailSent: false,
        error: "Missing companyId",
      });
    }

    const finalSubject = interpolateVariables(
      subject || "系统通知",
      context.variables,
    );
    const finalContent = interpolateVariables(
      content || getLastOutput(context),
      context.variables,
    );

    const results: any = {};

    if (notificationType === "site" || notificationType === "both") {
      const { createNotification } =
        await import("@/lib/services/notification");
      await createNotification({
        companyId,
        title: finalSubject,
        content: finalContent,
        type: "info",
        source: "system",
      });
      results.siteSent = true;
    }

    if (notificationType === "email" || notificationType === "both") {
      const { sendNotificationEmail, isEmailConfigured } =
        await import("@/lib/services/email");
      const emailConfigured = await isEmailConfigured(companyId);

      if (emailConfigured) {
        await sendNotificationEmail(companyId, finalSubject, finalContent);
        results.emailSent = true;
      } else {
        results.emailSent = false;
        results.emailError = "邮箱未配置";
      }
    }

    return JSON.stringify(results);
  },
};

// ===== 通用透传执行器（新增节点的 placeholder） =====
const passthroughExecutor: NodeExecutor = {
  async execute(_data, context) {
    return getLastOutput(context) || context.input;
  },
};

// ===== 变量赋值节点 =====
const variableAssignmentExecutor: NodeExecutor = {
  async execute(data, context) {
    const value = data.variableValue
      ? interpolateVariables(data.variableValue, context.variables)
      : getLastOutput(context);
    if (data.variableName) {
      context.variables[data.variableName] = value;
    }
    return value;
  },
};

// ===== 变量聚合器 =====
const variableAggregatorExecutor: NodeExecutor = {
  async execute(data, context) {
    const vars = data.aggregateVariables || [];
    const values = vars.map((v) => context.variables[v] || "");
    switch (data.aggregateStrategy) {
      case "array":
        return JSON.stringify(values);
      case "merge":
        return values.join("");
      case "concat":
      default:
        return values.join("\n");
    }
  },
};

// ===== 列表操作节点 =====
const listOperationExecutor: NodeExecutor = {
  async execute(data, context) {
    const previousOutput = getLastOutput(context);
    let list: any[];
    try {
      list = JSON.parse(previousOutput);
      if (!Array.isArray(list)) throw new Error("not array");
    } catch {
      return previousOutput;
    }

    const expr = data.listExpression || "";
    switch (data.listOperationType) {
      case "filter":
        try {
          const fn = new Function("item", "index", `return ${expr}`);
          return JSON.stringify(list.filter((item, i) => fn(item, i)));
        } catch {
          return JSON.stringify(list);
        }
      case "map":
        try {
          const fn = new Function("item", "index", `return ${expr}`);
          return JSON.stringify(list.map((item, i) => fn(item, i)));
        } catch {
          return JSON.stringify(list);
        }
      case "sort":
        return JSON.stringify([...list].sort());
      case "slice":
        try {
          const [start, end] = expr.split(",").map(Number);
          return JSON.stringify(list.slice(start, end));
        } catch {
          return JSON.stringify(list);
        }
      case "reduce":
      default:
        return JSON.stringify(list);
    }
  },
};

// ==========================================
// 工具函数
// ==========================================

function getLastOutput(context: WorkflowContext): string {
  const keys = Object.keys(context.variables);
  if (keys.length === 0) return "";
  return context.variables[keys[keys.length - 1]] || "";
}

function interpolateVariables(
  template: string,
  variables: Record<string, string>,
): string {
  return template.replace(/\{\{(\w[\w.-]*)\}\}/g, (match, key) => {
    if (key === "input") return variables["__input__"] || "";
    return variables[key] ?? match;
  });
}

// ==========================================
// 执行器注册表
// ==========================================

const executors: Record<WorkflowNodeType, NodeExecutor> = {
  // 开始
  start: startExecutor,
  cron_trigger: cronTriggerExecutor,
  webhook: {
    async execute(_data, context) {
      return context.input;
    },
  },
  // 节点
  llm: processExecutor,
  knowledge_retrieval: knowledgeRetrievalExecutor,
  output: outputExecutor,
  agent: passthroughExecutor, // TODO: 实现 agent 执行逻辑

  question_classifier: passthroughExecutor, // TODO

  condition: conditionExecutor,
  iteration: passthroughExecutor, // TODO
  loop: passthroughExecutor, // TODO
  exit_loop: passthroughExecutor, // TODO

  code: codeExecutor,
  template_transform: textTemplateExecutor,
  variable_aggregator: variableAggregatorExecutor,
  document_extractor: passthroughExecutor, // TODO
  variable_assignment: variableAssignmentExecutor,
  parameter_extractor: passthroughExecutor, // TODO

  http_request: httpRequestExecutor,
  list_operation: listOperationExecutor,
  // 工具
  sub_employee: subEmployeeExecutor,
  custom_tool: passthroughExecutor, // TODO
  sub_workflow: passthroughExecutor, // TODO
  mcp_tool: passthroughExecutor, // TODO
  plugin: passthroughExecutor, // TODO
  notification: notificationExecutor,
  // 兼容旧类型
  process: processExecutor,
  text_template: textTemplateExecutor,
  message: messageExecutor,
};

// ==========================================
// 辅助函数：变量访问与条件判断
// ==========================================

function getVariableValue(variables: Record<string, any>, path: string): any {
  if (!path) return "";

  // 1. 直接匹配 (如 "node-1")
  if (variables[path] !== undefined) return variables[path];

  // 2. 路径访问 (如 "node-1.summary")
  const parts = path.split(".");
  const nodeId = parts[0];
  const rest = parts.slice(1);

  // 获取节点输出
  let current = variables[nodeId];

  // 如果节点不存在，返回空
  if (current === undefined) return "";

  // 尝试解析 JSON 字符串
  if (typeof current === "string") {
    try {
      if (current.trim().startsWith("{") || current.trim().startsWith("[")) {
        current = JSON.parse(current);
      }
    } catch {
      // 解析失败则保留原字符串
    }
  }

  // 递归访问属性
  for (const part of rest) {
    if (current && typeof current === "object" && current[part] !== undefined) {
      current = current[part];
    } else {
      return ""; // 路径中断
    }
  }

  // 返回最终值 (如果是对象则转回字符串)
  return typeof current === "object"
    ? JSON.stringify(current)
    : String(current ?? "");
}

function checkCondition(
  val: string,
  operator: string,
  target: string,
): boolean {
  switch (operator) {
    case "contains":
      return val.includes(target);
    case "not_contains":
      return !val.includes(target);
    case "equals":
      return val === target;
    case "not_equals":
      return val !== target;
    case "start_with":
      return val.startsWith(target);
    case "end_with":
      return val.endsWith(target);
    case "is_empty":
      return !val || val.trim().length === 0;
    case "not_empty":
      return !!val && val.trim().length > 0;
    case "gt":
      return Number(val) > Number(target);
    case "gte":
      return Number(val) >= Number(target);
    case "lt":
      return Number(val) < Number(target);
    case "lte":
      return Number(val) <= Number(target);
    default:
      return false;
  }
}

export function getExecutor(nodeType: WorkflowNodeType): NodeExecutor {
  const executor = executors[nodeType];
  if (!executor) {
    throw new Error(`未知的节点类型: ${nodeType}`);
  }
  return executor;
}
