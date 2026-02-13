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
    const { queryType = "logs", queryLimit, limit = 50 } = data;
    const finalLimit = queryLimit || limit;

    if (queryType === "logs") {
      const { getUnprocessedLogs } =
        await import("@/lib/services/employee-log");
      const logs = await getUnprocessedLogs(finalLimit);
      const companyLogs = context.companyId
        ? logs.filter((l: any) => l.employee.companyId === context.companyId)
        : logs;

      return JSON.stringify(companyLogs);
    }

    return JSON.stringify([]);
  },
};

// ===== LLM 处理节点 =====
export const processExecutor: NodeExecutor = {
  async execute(data, context) {
    const { getMastraAgent } = await import("@/lib/mastra/agents");

    const model = data.model || context.employeeConfig?.model || "gpt-4o";

    let systemPrompt = data.prompt || context.employeeConfig?.prompt || "";

    if (data.outputSchema) {
      systemPrompt += `\n\n**重要：必须按以下 JSON Schema 格式输出结果：**\n${data.outputSchema}`;
    }

    systemPrompt = interpolateVariables(systemPrompt, context.variables);

    const previousOutput = getLastOutput(context);
    const input = interpolateVariables(
      previousOutput || context.input,
      context.variables,
    );

    const agent = getMastraAgent("assistant", model, systemPrompt);

    const result = await agent.generate(input);
    return result.text;
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

    if (!companyId) throw new Error("缺少上下文公司 ID");

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
  question_understanding: passthroughExecutor, // TODO
  question_classifier: passthroughExecutor, // TODO
  logic: passthroughExecutor, // TODO
  condition: conditionExecutor,
  iteration: passthroughExecutor, // TODO
  loop: passthroughExecutor, // TODO
  transform: passthroughExecutor, // TODO
  code: codeExecutor,
  template_transform: textTemplateExecutor,
  variable_aggregator: variableAggregatorExecutor,
  document_extractor: passthroughExecutor, // TODO
  variable_assignment: variableAssignmentExecutor,
  parameter_extractor: passthroughExecutor, // TODO
  tool_node: passthroughExecutor, // TODO
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

export function getExecutor(nodeType: WorkflowNodeType): NodeExecutor {
  const executor = executors[nodeType];
  if (!executor) {
    throw new Error(`未知的节点类型: ${nodeType}`);
  }
  return executor;
}
