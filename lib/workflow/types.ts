// ==========================================
// 工作流系统 - 核心类型定义
// ==========================================

/** 节点类型枚举 */
export type WorkflowNodeType =
  // 开始 (Start) - 触发器
  | "start" // 用户输入触发
  | "cron_trigger" // 定时触发器
  | "webhook" // Webhook 触发器
  // 节点 (Node) - 处理节点
  | "llm" // LLM 调用
  | "knowledge_retrieval" // 知识检索
  | "output" // 输出节点
  | "agent" // Agent 智能体
  | "question_understanding" // 问题理解
  | "question_classifier" // 问题分类器
  | "logic" // 逻辑节点
  | "condition" // 条件分支
  | "iteration" // 迭代
  | "loop" // 循环
  | "transform" // 数据转换
  | "code" // 代码执行
  | "template_transform" // 模板转换
  | "variable_aggregator" // 变量聚合器
  | "document_extractor" // 文档提取器
  | "variable_assignment" // 变量赋值
  | "parameter_extractor" // 参数提取器
  | "tool_node" // 工具调用节点
  | "http_request" // HTTP 请求
  | "list_operation" // 列表操作
  // 工具 (Tool) - 插件 / 自定义工具 / 工作流 / MCP
  | "sub_employee" // 子员工
  | "custom_tool" // 自定义工具
  | "sub_workflow" // 子工作流
  | "mcp_tool" // MCP 工具
  | "plugin" // 插件
  | "notification" // 通知
  // 兼容旧类型
  | "process" // LLM 处理 (旧)
  | "text_template" // 文本模板 (旧)
  | "message"; // 消息节点 (旧)

/** 节点执行状态 */
export type NodeExecutionStatus =
  | "pending" // 等待执行
  | "running" // 执行中
  | "completed" // 完成
  | "failed" // 失败
  | "skipped"; // 被条件跳过

/** 工作流节点数据 */
export interface WorkflowNodeData {
  label: string;
  description?: string;

  // 定时触发器 (cron_trigger)
  scheduleType?: "visual" | "cron";
  cron?: string;
  cronExpression?: string;
  triggerInterval?: number;
  frequency?: string;
  time?: string;
  daysOfWeek?: string;
  daysOfMonth?: string;
  minute?: number;

  // 知识/数据检索 (knowledge_retrieval)
  queryType?:
    | "logs"
    | "knowledge_base"
    | "notifications"
    | "execution_results"
    | "database";
  queryLimit?: number;
  queryFilter?: string; // 级别过滤 (info, warning, error, success)
  queryKeyword?: string; // 关键词
  queryTimeRange?: "1h" | "24h" | "7d" | "30d" | "all";
  queryEmployeeId?: string;
  queryIncludeProcessed?: boolean;
  limit?: number;
  embeddingModel?: string; // 所选的 Embedding 模型 ID

  // LLM 处理节点 (llm / process)
  model?: string;
  prompt?: string;
  outputSchema?: string;
  temperature?: number;
  maxTokens?: number;
  retryCount?: number; // 重试次数
  timeout?: number; // 超时时间 (毫秒)

  // Agent 节点
  agentType?: string;
  agentTools?: string[];

  // 问题理解
  rewriteStrategy?: string;

  // 问题分类器
  categories?: string[];
  classificationPrompt?: string;

  // 子员工节点
  employeeName?: string;
  employeeRole?: string;
  linkedEmployeeId?: string;

  // 条件节点
  conditionType?:
    | "contains"
    | "equals"
    | "not_empty"
    | "regex"
    | "js_expression";
  conditionValue?: string;
  conditionVariable?: string;

  // 迭代 / 循环
  iterationVariable?: string;
  maxIterations?: number;
  loopCondition?: string;

  // HTTP 请求节点
  httpMethod?: "GET" | "POST" | "PUT" | "DELETE";
  httpUrl?: string;
  httpHeaders?: string;
  httpBody?: string;

  // 代码节点
  codeLanguage?: "javascript";
  codeContent?: string;

  // 模板节点 (template_transform / text_template)
  templateContent?: string;

  // 变量聚合器
  aggregateVariables?: string[];
  aggregateStrategy?: "concat" | "merge" | "array";

  // 文档提取器
  documentSource?: string;
  extractionSchema?: string;

  // 变量赋值
  variableName?: string;
  variableValue?: string;

  // 参数提取器
  extractionPrompt?: string;
  parameterSchema?: string;

  // 列表操作
  listOperationType?: "filter" | "map" | "sort" | "reduce" | "slice";
  listExpression?: string;

  // 工具调用
  toolId?: string;
  toolConfig?: string;

  // 子工作流
  workflowId?: string;

  // MCP
  mcpServer?: string;
  mcpTool?: string;

  // 消息节点
  messageContent?: string;

  // 通知节点
  notificationType?: "site" | "email" | "both";
  recipient?: string;
  subject?: string;
  content?: string;

  // 转换
  transformExpression?: string;
  transformType?: "json" | "text" | "number";

  // 逻辑
  logicType?: "and" | "or" | "not" | "custom";
  logicExpression?: string;
}

/** 工作流节点 */
export interface WorkflowNode {
  id: string;
  type: WorkflowNodeType;
  position: { x: number; y: number };
  data: WorkflowNodeData;
}

/** 工作流边（连接） */
export interface WorkflowEdge {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string;
  label?: string;
}

/** 工作流定义 */
export interface WorkflowDefinition {
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
}

/** 单个节点的执行结果 */
export interface NodeExecutionResult {
  nodeId: string;
  nodeType: WorkflowNodeType;
  nodeLabel: string;
  status: NodeExecutionStatus;
  output?: string;
  error?: string;
  startTime: number;
  endTime?: number;
  duration?: number;
}

/** 工作流执行上下文（节点间共享数据） */
export interface WorkflowContext {
  /** 原始用户输入 */
  input: string;

  /** 变量存储：每个节点执行完后将输出存入 variables[nodeId] */
  variables: Record<string, string>;

  /** 员工 ID（当前正在执行工作流的员工） */
  employeeId: string;

  /** 公司 ID */
  companyId?: string;

  /** 员工的配置信息 */
  employeeConfig?: {
    model?: string;
    prompt?: string;
    temperature?: number;
    modelConfig?: {
      baseUrl?: string;
      apiKey?: string;
    };
  };
}

/** 执行状态回调（用于实时更新 UI） */
export type ExecutionCallback = (
  nodeId: string,
  status: NodeExecutionStatus,
  output?: string,
  error?: string,
) => void;

/** 完整工作流执行结果 */
export interface WorkflowExecutionResult {
  success: boolean;
  /** 最终输出（output 节点的结果） */
  finalOutput: string;
  /** 所有节点执行详情 */
  nodeResults: NodeExecutionResult[];
  /** 总耗时 ms */
  totalDuration: number;
  /** 错误信息 */
  error?: string;
}
