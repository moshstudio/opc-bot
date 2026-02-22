import {
  Zap,
  Bot,
  Users,
  ArrowRightFromLine,
  GitBranch,
  Globe,
  Code2,
  FileText,
  MessageCircle,
  Clock,
  Search,
  Bell,
  Brain,
  ListFilter,
  Repeat,
  RefreshCw,
  FileCode2,
  GitMerge,
  FileSearch,
  PenLine,
  ScanSearch,
  Wrench,
  List,
  Plug,
  Workflow,
  Package,
  Store,
  type LucideIcon,
} from "lucide-react";

// ===== Tab 分类 =====
export type NodeTabCategory = "node" | "tool" | "start";

// ===== 节点主题配置 =====
export interface NodeTheme {
  /** 类型标签（中文） */
  typeLabel: string;
  /** 默认节点名 */
  defaultLabel: string;
  /** 图标组件 */
  icon: LucideIcon;
  /** 主色调名称，用于生成 Tailwind class */
  color: string;
  /** 渐变色配对 */
  gradientPair: string;
  /** Tab 分类: node | tool | start */
  tab: NodeTabCategory;
  /** 菜单中的描述 */
  menuLabel: string;
  /** 菜单中的简短描述 */
  menuDesc?: string;
  /** 是否有虚线边框 */
  dashed?: boolean;
  /** 是否需要打开配置对话框 */
  needsDialog?: boolean;
  /** 是否允许重试 */
  allowRetry?: boolean;
  /** 是否允许设置超时 */
  allowTimeout?: boolean;
  /** 是否在节点上显示执行计划（仅定时触发使用） */
  showSchedule?: boolean;
  /** 默认配置数据 */
  defaultData?: Record<string, any>;
}

/** 模型提供商图标映射 */
export const MODEL_PROVIDER_ICONS: Record<string, string> = {
  openai: "https://api.opc-bot.com/api/v1/node-icon/openai",
  anthropic: "https://api.opc-bot.com/api/v1/node-icon/anthropic",
  google: "https://api.opc-bot.com/api/v1/node-icon/google",
  mistral: "https://api.opc-bot.com/api/v1/node-icon/mistral",
  deepseek: "https://api.opc-bot.com/api/v1/node-icon/deepseek",
};

export const NODE_THEMES: Record<string, NodeTheme> = {
  // ============================================================
  // 开始 (Start) - 触发器
  // ============================================================
  start: {
    typeLabel: "用户输入",
    defaultLabel: "用户输入",
    icon: Zap,
    color: "emerald",
    gradientPair: "teal",
    tab: "start",
    menuLabel: "用户输入",
    menuDesc: "当用户发送消息时触发工作流",
    needsDialog: true,
  },
  cron_trigger: {
    typeLabel: "定时触发",
    defaultLabel: "定时触发",
    icon: Clock,
    color: "teal",
    gradientPair: "emerald",
    tab: "start",
    menuLabel: "定时触发器",
    menuDesc: "按 Cron 表达式定时触发工作流",
    showSchedule: true,
    defaultData: {
      frequency: "daily",
      time: "09:00",
      daysOfWeek: "1",
      daysOfMonth: "1",
      interval: 1,
      minute: 0,
      cron: "0 9 * * *",
      cronExpression: "0 9 * * *",
    },
  },
  webhook: {
    typeLabel: "Webhook",
    defaultLabel: "Webhook 触发",
    icon: Globe,
    color: "indigo",
    gradientPair: "violet",
    tab: "start",
    menuLabel: "Webhook 触发器",
    menuDesc: "通过 HTTP POST 请求触发工作流",
  },

  // ============================================================
  // 节点 (Node) - 处理节点
  // ============================================================
  llm: {
    typeLabel: "LLM",
    defaultLabel: "LLM 调用",
    icon: Bot,
    color: "violet",
    gradientPair: "purple",
    tab: "node",
    menuLabel: "LLM",
    menuDesc: "调用大语言模型处理文本",
    allowRetry: true,
    allowTimeout: true,
  },
  knowledge_retrieval: {
    typeLabel: "知识检索",
    defaultLabel: "知识检索",
    icon: Search,
    color: "emerald",
    gradientPair: "teal",
    tab: "node",
    menuLabel: "知识检索",
    menuDesc: "从知识库中检索相关内容",
    defaultData: {
      queryType: "logs",
      queryLimit: 50,
      queryFilter: "all",
      queryTimeRange: "24h",
      queryEmployeeId: "all",
      queryIncludeProcessed: false,
    },
  },
  output: {
    typeLabel: "输出",
    defaultLabel: "输出结果",
    icon: ArrowRightFromLine,
    color: "amber",
    gradientPair: "orange",
    tab: "node",
    menuLabel: "输出",
    menuDesc: "工作流的最终输出节点",
  },
  agent: {
    typeLabel: "Agent",
    defaultLabel: "智能体",
    icon: Brain,
    color: "violet",
    gradientPair: "purple",
    tab: "node",
    menuLabel: "Agent",
    menuDesc: "自主决策的智能体节点",
    allowRetry: true,
    allowTimeout: true,
    defaultData: {
      agentType: "function_calling",
      prompt: "",
      model: "",
      inputVariable: "__input__",
      tools: ["get_employee_logs", "search_knowledge"],
      maxIterations: 5,
      memory: { enabled: false, window: 10 },
      retryCount: 0,
      timeout: 60000,
    },
  },
  question_classifier: {
    typeLabel: "问题分类",
    defaultLabel: "问题分类器",
    icon: ListFilter,
    color: "blue",
    gradientPair: "indigo",
    tab: "node",
    menuLabel: "问题分类器",
    menuDesc: "将问题分类到预定义类别",
    allowRetry: true,
    allowTimeout: true,
    defaultData: {
      categories: [
        { key: "category_1", label: "分类一", description: "" },
        { key: "category_2", label: "分类二", description: "" },
      ],
      instructions: "",
      model: "",
      memory: { enabled: false, window: 5 },
    },
  },

  condition: {
    typeLabel: "条件分支",
    defaultLabel: "条件分支",
    icon: GitBranch,
    color: "yellow",
    gradientPair: "amber",
    tab: "node",
    menuLabel: "条件分支",
    menuDesc: "根据条件选择不同的执行路径",
  },
  iteration: {
    typeLabel: "迭代",
    defaultLabel: "迭代",
    icon: Repeat,
    color: "teal",
    gradientPair: "emerald",
    tab: "node",
    menuLabel: "迭代",
    menuDesc: "对列表中的每个元素执行操作",
    defaultData: {
      iterationVariable: "",
      processingMode: "sequential",
      errorHandling: "terminate",
      workflowId: "",
    },
  },
  loop: {
    typeLabel: "循环",
    defaultLabel: "循环",
    icon: RefreshCw,
    color: "teal",
    gradientPair: "cyan",
    tab: "node",
    menuLabel: "循环",
    menuDesc: "重复执行直到满足条件",
  },

  code: {
    typeLabel: "代码执行",
    defaultLabel: "代码执行",
    icon: Code2,
    color: "rose",
    gradientPair: "pink",
    tab: "node",
    menuLabel: "代码执行",
    menuDesc: "运行自定义 Python / JavaScript 代码",
    allowRetry: true,
    allowTimeout: true,
    defaultData: {
      codeLanguage: "javascript",
      codeContent: `async function main({ input, vars }) {
  // 在这里编写你的处理逻辑
  const result = input.toUpperCase();
  return {
    result: result,
  };
}`,
      codeContentPython: `def main(input: str, vars: dict) -> dict:
    # 在这里编写你的处理逻辑
    result = input.upper()
    return {
        "result": result,
    }`,
      variables: {},
      outputVariables: [{ name: "result", type: "string" }],
      retryCount: 0,
      retryInterval: 1000,
      timeout: 30000,
      errorHandling: "fail", // "fail" | "default_value" | "continue"
      errorDefaultValue: "",
    },
  },
  template_transform: {
    typeLabel: "模板转换",
    defaultLabel: "模板转换",
    icon: FileCode2,
    color: "indigo",
    gradientPair: "violet",
    tab: "node",
    menuLabel: "模板转换",
    menuDesc: "使用模板引擎渲染文本",
  },
  variable_aggregator: {
    typeLabel: "变量聚合",
    defaultLabel: "变量聚合器",
    icon: GitMerge,
    color: "violet",
    gradientPair: "indigo",
    tab: "node",
    menuLabel: "变量聚合器",
    menuDesc: "合并多个节点的输出变量",
  },
  document_extractor: {
    typeLabel: "文档提取",
    defaultLabel: "文档提取器",
    icon: FileSearch,
    color: "amber",
    gradientPair: "orange",
    tab: "node",
    menuLabel: "文档提取器",
    menuDesc: "从文档中提取结构化信息",
  },
  variable_assignment: {
    typeLabel: "变量赋值",
    defaultLabel: "变量赋值",
    icon: PenLine,
    color: "cyan",
    gradientPair: "teal",
    tab: "node",
    menuLabel: "变量赋值",
    menuDesc: "设置或修改变量的值",
  },
  parameter_extractor: {
    typeLabel: "参数提取",
    defaultLabel: "参数提取器",
    icon: ScanSearch,
    color: "blue",
    gradientPair: "violet",
    tab: "node",
    menuLabel: "参数提取器",
    menuDesc: "从文本中提取结构化参数",
  },

  http_request: {
    typeLabel: "HTTP 请求",
    defaultLabel: "HTTP 请求",
    icon: Globe,
    color: "cyan",
    gradientPair: "blue",
    tab: "node",
    menuLabel: "HTTP 请求",
    menuDesc: "发送 HTTP API 请求",
    allowRetry: true,
    allowTimeout: true,
  },
  list_operation: {
    typeLabel: "列表操作",
    defaultLabel: "列表操作",
    icon: List,
    color: "indigo",
    gradientPair: "blue",
    tab: "node",
    menuLabel: "列表操作",
    menuDesc: "对列表进行筛选、排序、映射等操作",
  },

  // ============================================================
  // 工具 (Tool) - 插件 / 自定义工具 / 工作流 / MCP
  // ============================================================
  sub_employee: {
    typeLabel: "子员工",
    defaultLabel: "子员工",
    icon: Users,
    color: "blue",
    gradientPair: "cyan",
    tab: "tool",
    menuLabel: "子员工",
    menuDesc: "委派任务给其他 AI 员工",
    dashed: true,
  },
  custom_tool: {
    typeLabel: "自定义工具",
    defaultLabel: "自定义工具",
    icon: Wrench,
    color: "rose",
    gradientPair: "pink",
    tab: "tool",
    menuLabel: "自定义工具",
    menuDesc: "调用自定义开发的工具函数",
  },
  sub_workflow: {
    typeLabel: "子工作流",
    defaultLabel: "子工作流",
    icon: Workflow,
    color: "violet",
    gradientPair: "purple",
    tab: "tool",
    menuLabel: "其他工作流",
    menuDesc: "嵌套调用另一个工作流",
  },
  mcp_tool: {
    typeLabel: "MCP",
    defaultLabel: "MCP 工具",
    icon: Plug,
    color: "teal",
    gradientPair: "emerald",
    tab: "tool",
    menuLabel: "MCP",
    menuDesc: "连接 Model Context Protocol 服务",
  },
  plugin: {
    typeLabel: "插件",
    defaultLabel: "插件",
    icon: Package,
    color: "indigo",
    gradientPair: "violet",
    tab: "tool",
    menuLabel: "插件",
    menuDesc: "使用已安装的第三方插件",
  },
  notification: {
    typeLabel: "通知",
    defaultLabel: "发送通知",
    icon: Bell,
    color: "amber",
    gradientPair: "orange",
    tab: "tool",
    menuLabel: "发送通知",
    menuDesc: "发送站内信或邮件通知",
    defaultData: {
      subject: "工作汇总通知",
      content: "您好，这是过去 24 小时的工作汇总：\n\n{{node-6}}",
    },
  },
  marketplace: {
    typeLabel: "市场",
    defaultLabel: "工具市场",
    icon: Store,
    color: "emerald",
    gradientPair: "teal",
    tab: "tool",
    menuLabel: "从市场添加",
    menuDesc: "浏览和安装更多工具与插件",
  },

  // ============================================================
  // 兼容旧类型 (保持向后兼容)
  // ============================================================
  process: {
    typeLabel: "AI 处理",
    defaultLabel: "处理节点",
    icon: Bot,
    color: "violet",
    gradientPair: "purple",
    tab: "node",
    menuLabel: "AI 处理节点",
    menuDesc: "AI 处理节点",
  },
  text_template: {
    typeLabel: "文本模板",
    defaultLabel: "模板节点",
    icon: FileText,
    color: "indigo",
    gradientPair: "violet",
    tab: "node",
    menuLabel: "文本模板",
  },
  message: {
    typeLabel: "消息",
    defaultLabel: "消息节点",
    icon: MessageCircle,
    color: "teal",
    gradientPair: "green",
    tab: "node",
    menuLabel: "消息节点",
  },
};

// ===== 获取某个 tab 下的所有节点类型 =====
export function getNodesByTab(tab: NodeTabCategory): [string, NodeTheme][] {
  return Object.entries(NODE_THEMES).filter(([, theme]) => theme.tab === tab);
}

// 不在添加面板中显示的旧类型（仅保持向后兼容）
const HIDDEN_TYPES = new Set([
  "process",
  "text_template",
  "message",
  "marketplace",
]);

export function getVisibleNodesByTab(
  tab: NodeTabCategory,
): [string, NodeTheme][] {
  return Object.entries(NODE_THEMES).filter(
    ([key, theme]) => theme.tab === tab && !HIDDEN_TYPES.has(key),
  );
}

// ===== 颜色 class 映射工具 =====
const colorMap: Record<
  string,
  {
    bg: string;
    bgGradient: string;
    darkBgGradient: string;
    border: string;
    borderSelected: string;
    shadow: string;
    topBar: string;
    iconBg: string;
    iconText: string;
    labelText: string;
    handleBg: string;
  }
> = {
  emerald: {
    bg: "bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-950/40 dark:to-teal-950/40",
    bgGradient:
      "bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-950/40 dark:to-teal-950/40",
    darkBgGradient: "dark:from-emerald-950/40 dark:to-teal-950/40",
    border: "border-emerald-200/60 dark:border-emerald-800/40",
    borderSelected: "border-emerald-400",
    shadow: "shadow-emerald-500/20",
    topBar: "bg-gradient-to-r from-emerald-400 to-teal-400",
    iconBg: "bg-emerald-500/10",
    iconText: "text-emerald-600 dark:text-emerald-400",
    labelText: "text-emerald-600/70 dark:text-emerald-400/70",
    handleBg: "bg-emerald-500",
  },
  violet: {
    bg: "bg-white dark:bg-slate-900",
    bgGradient: "bg-white dark:bg-slate-900",
    darkBgGradient: "dark:bg-slate-900",
    border: "border-slate-200/60 dark:border-slate-800/60",
    borderSelected: "border-violet-400",
    shadow: "shadow-violet-500/20",
    topBar: "bg-gradient-to-r from-violet-400 to-purple-400",
    iconBg: "bg-violet-500/10",
    iconText: "text-violet-600 dark:text-violet-400",
    labelText: "text-violet-600/70 dark:text-violet-400/70",
    handleBg: "bg-violet-500",
  },
  blue: {
    bg: "bg-blue-50/50 dark:bg-blue-950/20",
    bgGradient: "bg-blue-50/50 dark:bg-blue-950/20",
    darkBgGradient: "dark:bg-blue-950/20",
    border: "border-blue-200/60 dark:border-blue-800/40",
    borderSelected: "border-blue-400",
    shadow: "shadow-blue-500/20",
    topBar: "bg-gradient-to-r from-blue-400 to-cyan-400",
    iconBg: "bg-blue-500/10",
    iconText: "text-blue-600 dark:text-blue-400",
    labelText: "text-blue-600/70 dark:text-blue-400/70",
    handleBg: "bg-blue-500",
  },
  amber: {
    bg: "bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/40 dark:to-orange-950/40",
    bgGradient:
      "bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/40 dark:to-orange-950/40",
    darkBgGradient: "dark:from-amber-950/40 dark:to-orange-950/40",
    border: "border-amber-200/60 dark:border-amber-800/40",
    borderSelected: "border-amber-400",
    shadow: "shadow-amber-500/20",
    topBar: "bg-gradient-to-r from-amber-400 to-orange-400",
    iconBg: "bg-amber-500/10",
    iconText: "text-amber-600 dark:text-amber-400",
    labelText: "text-amber-600/70 dark:text-amber-400/70",
    handleBg: "bg-amber-500",
  },
  yellow: {
    bg: "bg-gradient-to-br from-yellow-50 to-amber-50 dark:from-yellow-950/30 dark:to-amber-950/30",
    bgGradient:
      "bg-gradient-to-br from-yellow-50 to-amber-50 dark:from-yellow-950/30 dark:to-amber-950/30",
    darkBgGradient: "dark:from-yellow-950/30 dark:to-amber-950/30",
    border: "border-yellow-200/60 dark:border-yellow-800/40",
    borderSelected: "border-yellow-400",
    shadow: "shadow-yellow-500/20",
    topBar: "bg-gradient-to-r from-yellow-400 to-amber-400",
    iconBg: "bg-yellow-500/10",
    iconText: "text-yellow-600 dark:text-yellow-400",
    labelText: "text-yellow-600/70 dark:text-yellow-400/70",
    handleBg: "bg-yellow-500",
  },
  cyan: {
    bg: "bg-gradient-to-br from-cyan-50 to-blue-50 dark:from-cyan-950/30 dark:to-blue-950/30",
    bgGradient:
      "bg-gradient-to-br from-cyan-50 to-blue-50 dark:from-cyan-950/30 dark:to-blue-950/30",
    darkBgGradient: "dark:from-cyan-950/30 dark:to-blue-950/30",
    border: "border-cyan-200/60 dark:border-cyan-800/40",
    borderSelected: "border-cyan-400",
    shadow: "shadow-cyan-500/20",
    topBar: "bg-gradient-to-r from-cyan-400 to-blue-400",
    iconBg: "bg-cyan-500/10",
    iconText: "text-cyan-600 dark:text-cyan-400",
    labelText: "text-cyan-600/70 dark:text-cyan-400/70",
    handleBg: "bg-cyan-500",
  },
  rose: {
    bg: "bg-gradient-to-br from-rose-50 to-pink-50 dark:from-rose-950/30 dark:to-pink-950/30",
    bgGradient:
      "bg-gradient-to-br from-rose-50 to-pink-50 dark:from-rose-950/30 dark:to-pink-950/30",
    darkBgGradient: "dark:from-rose-950/30 dark:to-pink-950/30",
    border: "border-rose-200/60 dark:border-rose-800/40",
    borderSelected: "border-rose-400",
    shadow: "shadow-rose-500/20",
    topBar: "bg-gradient-to-r from-rose-400 to-pink-400",
    iconBg: "bg-rose-500/10",
    iconText: "text-rose-600 dark:text-rose-400",
    labelText: "text-rose-600/70 dark:text-rose-400/70",
    handleBg: "bg-rose-500",
  },
  indigo: {
    bg: "bg-gradient-to-br from-indigo-50 to-violet-50 dark:from-indigo-950/30 dark:to-violet-950/30",
    bgGradient:
      "bg-gradient-to-br from-indigo-50 to-violet-50 dark:from-indigo-950/30 dark:to-violet-950/30",
    darkBgGradient: "dark:from-indigo-950/30 dark:to-violet-950/30",
    border: "border-indigo-200/60 dark:border-indigo-800/40",
    borderSelected: "border-indigo-400",
    shadow: "shadow-indigo-500/20",
    topBar: "bg-gradient-to-r from-indigo-400 to-violet-400",
    iconBg: "bg-indigo-500/10",
    iconText: "text-indigo-600 dark:text-indigo-400",
    labelText: "text-indigo-600/70 dark:text-indigo-400/70",
    handleBg: "bg-indigo-500",
  },
  teal: {
    bg: "bg-gradient-to-br from-teal-50 to-green-50 dark:from-teal-950/30 dark:to-green-950/30",
    bgGradient:
      "bg-gradient-to-br from-teal-50 to-green-50 dark:from-teal-950/30 dark:to-green-950/30",
    darkBgGradient: "dark:from-teal-950/30 dark:to-green-950/30",
    border: "border-teal-200/60 dark:border-teal-800/40",
    borderSelected: "border-teal-400",
    shadow: "shadow-teal-500/20",
    topBar: "bg-gradient-to-r from-teal-400 to-green-400",
    iconBg: "bg-teal-500/10",
    iconText: "text-teal-600 dark:text-teal-400",
    labelText: "text-teal-600/70 dark:text-teal-400/70",
    handleBg: "bg-teal-500",
  },
};

export function getColorClasses(color: string) {
  return colorMap[color] || colorMap.violet;
}
