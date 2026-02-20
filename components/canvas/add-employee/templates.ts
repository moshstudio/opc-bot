export const ROLE_TEMPLATES: Record<
  string,
  {
    label: string;
    defaultName: string;
    prompt: string;
    model: string;
    icon: string;
    color: string;
    workflow?: { nodes: any[]; edges: any[] };
  }
> = {
  assistant: {
    label: "助理 (监控 & 总结)",
    defaultName: "艾薇 (Ivy)",
    prompt:
      "你是艾薇 (Ivy)，一人公司的 AI 助理员工。你的职责是：\n1. 监控和总结其他 AI 员工的工作动态\n2. 识别值得关注的事项（错误、异常、重要成果）\n3. 生成简洁明了的工作总结报告",
    model: "gpt-4o",
    icon: "🌿",
    color: "from-emerald-500 to-teal-500",
    workflow: {
      nodes: [
        {
          id: "node-1",
          type: "cron_trigger",
          position: { x: 50, y: 200 },
          data: {
            label: "定时启动",
            scheduleType: "visual",
            frequency: "daily",
            time: "09:00",
            cron: "0 0 9 * * *",
            cronExpression: "0 0 9 * * *",
          },
        },
        {
          id: "node-2",
          type: "knowledge_retrieval",
          position: { x: 350, y: 50 },
          data: {
            label: "检索员工日志",
            queryType: "logs",
            queryTimeRange: "24h",
            queryLimit: 20,
          },
        },
        {
          id: "node-3",
          type: "knowledge_retrieval",
          position: { x: 350, y: 200 },
          data: {
            label: "检索执行结果",
            queryType: "execution_results",
            queryTimeRange: "24h",
            queryLimit: 10,
          },
        },
        {
          id: "node-4",
          type: "knowledge_retrieval",
          position: { x: 350, y: 350 },
          data: {
            label: "检索系统通知",
            queryType: "notifications",
            queryTimeRange: "24h",
            queryLimit: 10,
          },
        },
        {
          id: "node-5",
          type: "variable_aggregator",
          position: { x: 650, y: 200 },
          data: {
            label: "信息汇总",
            aggregateStrategy: "array",
            aggregateVariables: ["node-2", "node-3", "node-4"],
          },
        },
        {
          id: "node-6",
          type: "llm",
          position: { x: 950, y: 200 },
          data: {
            label: "AI 分析总结",
            prompt:
              "你是 AI 助理艾薇。请分析下面的提供的“一人公司”运行数据（包含日志、执行结果和通知），提取核心成果、警告和错误。请以温暖、专业的语气生成一份工作概览。\n```数据列表(可能为空)\n{{node-5}}\n```",
            outputSchema: JSON.stringify({
              type: "object",
              properties: {
                hasNotableItems: {
                  type: "boolean",
                  description: "Whether there are notable items to report",
                },
                summary: {
                  type: "string",
                  description: "A concise summary of the daily work",
                },
                items: {
                  type: "array",
                  items: { type: "string" },
                  description: "List of key achievements, warnings, or errors",
                },
              },
              required: ["hasNotableItems", "summary", "items"],
            }),
          },
        },
        {
          id: "node-check",
          type: "condition",
          position: { x: 1250, y: 200 },
          data: {
            label: "检查重要事项",
            logicalOperator: "AND",
            conditions: [
              {
                id: "c1",
                variable: "node-6.hasNotableItems",
                operator: "equals",
                value: true,
              },
            ],
          },
        },
        {
          id: "node-format",
          type: "code",
          position: { x: 1550, y: 100 },
          data: {
            label: "格式化日报",
            codeLanguage: "javascript",
            codeContent: `async function main({ summary, items }) {
  const itemList = Array.isArray(items)
    ? items.map((i) => '- ' + i).join('\\n')
    : '- 无重点事项';
  return {
    result: '### 工作概览\\n' + summary + '\\n\\n### 重点事项\\n' + itemList
  };
}`,
            codeContentPython: `def main(summary: str, items: list) -> dict:
    item_list = '\\n'.join(['- ' + i for i in items]) if items else '- 无重点事项'
    return {
        'result': f'### 工作概览\\n{summary}\\n\\n### 重点事项\\n{item_list}'
    }`,
            variables: {
              summary: "{{node-6.summary}}",
              items: "{{node-6.items}}",
            },
            outputVariables: [{ name: "result", type: "string" }],
            retryCount: 0,
            retryInterval: 1000,
            timeout: 10000,
            errorHandling: "fail",
          },
        },
        {
          id: "node-7",
          type: "notification",
          position: { x: 1850, y: 100 },
          data: {
            label: "发送日报",
            notificationType: "both",
            subject: "艾薇 · 每日工作动态总结",
            content: "{{node-format.result}}",
          },
        },
      ],
      edges: [
        { id: "e1-2", source: "node-1", target: "node-2" },
        { id: "e1-3", source: "node-1", target: "node-3" },
        { id: "e1-4", source: "node-1", target: "node-4" },
        { id: "e2-5", source: "node-2", target: "node-5" },
        { id: "e3-5", source: "node-3", target: "node-5" },
        { id: "e4-5", source: "node-4", target: "node-5" },
        { id: "e5-6", source: "node-5", target: "node-6" },
        { id: "e6-check", source: "node-6", target: "node-check" },
        {
          id: "check-format",
          source: "node-check",
          target: "node-format",
          sourceHandle: "true",
        },
        { id: "format-7", source: "node-format", target: "node-7" },
      ],
    },
  },
  life_assistant: {
    label: "生活助理 (个人)",
    defaultName: "阿尔弗雷德 (Alfred)",
    prompt:
      "你是阿尔弗雷德 (Alfred)，一位贴心且专业的个人生活助理。你像一位经验丰富的英式管家，既温暖体贴又高效精准。你负责关心用户的健康、日程安排和个人琐事，总能给出既实用又暖心的建议。",
    model: "gpt-4o",
    icon: "🏠",
    color: "from-green-500 to-emerald-500",
    workflow: {
      nodes: [
        {
          id: "node-start",
          type: "start",
          position: { x: 50, y: 250 },
          data: { label: "接收消息", desc: "接收用户发送的生活相关消息" },
        },
        {
          id: "node-classifier",
          type: "question_classifier",
          position: { x: 350, y: 250 },
          data: {
            label: "意图分类",
            desc: "智能分析并分发用户需求",
            categories: [
              {
                key: "health",
                label: "健康建议",
                description: "饮食、运动、睡眠、身体状况、心理健康等",
              },
              {
                key: "schedule",
                label: "日程管理",
                description: "时间安排、会议、提醒、计划、待办事项等",
              },
              {
                key: "general",
                label: "生活杂事",
                description: "购物、家务、出行、天气、闲聊等",
              },
            ],
          },
        },
        {
          id: "node-health",
          type: "llm",
          position: { x: 750, y: 50 },
          data: {
            label: "健康顾问",
            desc: "提供专业的健康生活建议",
            prompt:
              "你是阿尔弗雷德的健康顾问模块。用户的需求概要：{{node-classifier.summary}}，关键词：{{node-classifier.keywords}}，紧急程度：{{node-classifier.urgency}}。\n\n请基于用户的原始消息，提供温暖且专业的健康建议，包括：\n1. 针对性的健康指导（饮食/运动/作息/心理）\n2. 简单可执行的行动建议（不超过3条）\n3. 需要注意的风险提示（如有必要）\n\n用户原始消息：{{__input__}}\n\n请用温暖关怀的语气回复，像一位贴心的老朋友。",
          },
        },
        {
          id: "node-schedule",
          type: "llm",
          position: { x: 750, y: 250 },
          data: {
            label: "日程管家",
            desc: "智能日程规划与时间管理",
            prompt:
              "你是阿尔弗雷德的日程管家模块。用户的需求概要：{{node-classifier.summary}}，关键词：{{node-classifier.keywords}}，紧急程度：{{node-classifier.urgency}}。\n\n请基于用户的原始消息，提供高效的日程管理建议，包括：\n1. 时间安排建议或优化方案\n2. 优先级排序建议\n3. 温馨的时间管理小贴士\n\n用户原始消息：{{__input__}}\n\n请用高效又不失温度的语气回复。",
          },
        },
        {
          id: "node-general",
          type: "llm",
          position: { x: 750, y: 450 },
          data: {
            label: "生活百事通",
            desc: "处理日常琐事与生活咨询",
            prompt:
              "你是阿尔弗雷德的生活百事通模块。用户的需求概要：{{node-classifier.summary}}，关键词：{{node-classifier.keywords}}，紧急程度：{{node-classifier.urgency}}。\n\n请基于用户的原始消息，提供实用的生活建议，包括：\n1. 具体问题的解决方案\n2. 实用的小技巧或推荐\n3. 额外的贴心提示\n\n用户原始消息：{{__input__}}\n\n请用热心且接地气的语气回复，像一位见多识广的好友。",
          },
        },
        {
          id: "node-format",
          type: "code",
          position: { x: 1100, y: 250 },
          data: {
            label: "温馨格式化",
            desc: "将回复包装为阿尔弗雷德风格",
            codeLanguage: "javascript",
            codeContent: `async function main({ scene, urgency, advice }) {
  const icons = { health: '💚', schedule: '📅', general: '✨' };
  const titles = { health: '健康关怀', schedule: '日程安排', general: '生活助手' };
  const icon = icons[scene] || '🏠';
  const title = titles[scene] || '生活助手';
  const urgencyTag = urgency === 'high' ? ' 🔴 紧急' : urgency === 'medium' ? ' 🟡 留意' : '';

  const greeting = new Date().getHours() < 12
    ? '早上好！'
    : new Date().getHours() < 18
      ? '下午好！'
      : '晚上好！';

  return {
    result: icon + ' **' + title + '**' + urgencyTag + '\\n\\n'
      + greeting + '\\n\\n'
      + (typeof advice === 'string' ? advice : JSON.stringify(advice))
      + '\\n\\n---\\n_阿尔弗雷德随时为您效劳_ 🎩'
  };
}`,
            codeContentPython: `def main(scene: str, urgency: str, advice: str) -> dict:
    from datetime import datetime
    icons = {'health': '💚', 'schedule': '📅', 'general': '✨'}
    titles = {'health': '健康关怀', 'schedule': '日程安排', 'general': '生活助手'}
    icon = icons.get(scene, '🏠')
    title = titles.get(scene, '生活助手')
    urgency_tag = ' 🔴 紧急' if urgency == 'high' else (' 🟡 留意' if urgency == 'medium' else '')
    hour = datetime.now().hour
    greeting = '早上好！' if hour < 12 else ('下午好！' if hour < 18 else '晚上好！')
    return {
        'result': f'{icon} **{title}**{urgency_tag}\\n\\n{greeting}\\n\\n{advice}\\n\\n---\\n_阿尔弗雷德随时为您效劳_ 🎩'
    }`,
            variables: {
              scene: "{{node-classifier.result}}",
              urgency: "{{node-classifier.urgency}}",
              advice: "{{node-health}}{{node-schedule}}{{node-general}}",
            },
            outputVariables: [{ name: "result", type: "string" }],
            retryCount: 0,
            retryInterval: 1000,
            timeout: 10000,
            errorHandling: "fail",
          },
        },
        {
          id: "node-output",
          type: "output",
          position: { x: 1450, y: 250 },
          data: {
            label: "发送回复",
            desc: "将阿尔弗雷德的回复发送给用户",
          },
        },
      ],
      edges: [
        {
          id: "e-start-classifier",
          source: "node-start",
          target: "node-classifier",
        },
        // 分类器分支路由
        {
          id: "e-classifier-health",
          source: "node-classifier",
          target: "node-health",
          sourceHandle: "health",
        },
        {
          id: "e-classifier-schedule",
          source: "node-classifier",
          target: "node-schedule",
          sourceHandle: "schedule",
        },
        {
          id: "e-classifier-general",
          source: "node-classifier",
          target: "node-general",
          sourceHandle: "general",
        },
        // 汇聚到格式化节点
        { id: "e-health-format", source: "node-health", target: "node-format" },
        {
          id: "e-schedule-format",
          source: "node-schedule",
          target: "node-format",
        },
        {
          id: "e-general-format",
          source: "node-general",
          target: "node-format",
        },
        { id: "e-format-output", source: "node-format", target: "node-output" },
      ],
    },
  },
  devops: {
    label: "DevOps 工程师",
    defaultName: "OpsMaster",
    prompt:
      "你是一个资深的 DevOps 工程师。你精通 Docker, Kubernetes, CI/CD 流水线以及云基础设施管理。如果不清楚具体指令，请询问更多上下文。请用简洁的技术语言回答。",
    model: "gpt-4-turbo",
    icon: "⚙️",
    color: "from-orange-500 to-amber-500",
    workflow: {
      nodes: [
        {
          id: "node-1",
          type: "start",
          position: { x: 100, y: 150 },
          data: { label: "指令接收", desc: "接收运维相关指令" },
        },
        {
          id: "node-2",
          type: "llm",
          position: { x: 500, y: 150 },
          data: {
            label: "技术风险评估",
            desc: "分析操作对生产环境的影响",
            prompt: "评估该指令对生产环境的影响及风险等级。",
          },
        },
        {
          id: "node-3",
          type: "code",
          position: { x: 900, y: 150 },
          data: {
            label: "脚本生成",
            desc: "自动编写 K8s 部署脚本",
            codeLanguage: "javascript",
            codeContent: `async function main({ riskAssessment }) {
  // 根据风险评估结果生成 K8s 部署脚本
  const script = [
    '#!/bin/bash',
    '# 自动生成的部署脚本',
    '# 基于风险评估: ' + (typeof riskAssessment === 'string' ? riskAssessment.slice(0, 50) : 'N/A'),
    '',
    'kubectl apply -f config.yaml',
    'kubectl rollout status deployment/app',
  ].join('\\n');
  return { result: script };
}`,
            codeContentPython: `def main(riskAssessment: str) -> dict:
    # 根据风险评估结果生成 K8s 部署脚本
    script = """#!/bin/bash
# 自动生成的部署脚本
# 基于风险评估: {assessment}

kubectl apply -f config.yaml
kubectl rollout status deployment/app""".format(assessment=riskAssessment[:50] if riskAssessment else 'N/A')
    return {'result': script}`,
            variables: {
              riskAssessment: "{{node-2}}",
            },
            outputVariables: [{ name: "result", type: "string" }],
            retryCount: 0,
            retryInterval: 1000,
            timeout: 10000,
            errorHandling: "fail",
          },
        },
        {
          id: "node-4",
          type: "output",
          position: { x: 1300, y: 150 },
          data: { label: "交付脚本", desc: "输出最终的可执行脚本" },
        },
      ],
      edges: [
        { id: "edge-1", source: "node-1", target: "node-2" },
        { id: "edge-2", source: "node-2", target: "node-3" },
        { id: "edge-3", source: "node-3", target: "node-4" },
      ],
    },
  },
  deployment: {
    label: "部署工程师",
    defaultName: "DeployBot",
    prompt:
      "你是一个专注于代码部署和发布的工程师。你熟悉各种发布策略（蓝绿部署、金丝雀发布）和回滚机制。你的首要任务是保证生产环境的稳定性。",
    model: "gpt-4-turbo",
    icon: "🚀",
    color: "from-red-500 to-rose-500",
    workflow: {
      nodes: [
        {
          id: "node-1",
          type: "start",
          position: { x: 100, y: 250 },
          data: { label: "触发部署", desc: "开始部署流程" },
        },
        {
          id: "node-2",
          type: "condition",
          position: { x: 500, y: 250 },
          data: {
            label: "环境检查",
            desc: "判断是否为生产环境",
            conditionType: "contains",
            conditionValue: "PROD",
          },
        },
        {
          id: "node-3",
          type: "notification",
          position: { x: 900, y: 100 },
          data: {
            label: "高风险警告",
            desc: "发送环境预警通知",
            notificationType: "site",
            subject: "生产环境部署预警",
            content: "⚠️ 正在向生产环境执行部署操作，请确认！",
          },
        },
        {
          id: "node-4",
          type: "llm",
          position: { x: 900, y: 400 },
          data: {
            label: "执行部署逻辑",
            desc: "生成标准部署序列",
            prompt: "生成标准的部署序列指令。",
          },
        },
        {
          id: "node-5",
          type: "output",
          position: { x: 1300, y: 250 },
          data: { label: "任务完成", desc: "部署流程执行完毕" },
        },
      ],
      edges: [
        { id: "edge-1", source: "node-1", target: "node-2" },
        {
          id: "edge-2",
          source: "node-2",
          target: "node-3",
          sourceHandle: "true",
        },
        {
          id: "edge-3",
          source: "node-2",
          target: "node-4",
          sourceHandle: "false",
        },
        { id: "edge-4", source: "node-3", target: "node-4" },
        { id: "edge-5", source: "node-4", target: "node-5" },
      ],
    },
  },
  product_manager: {
    label: "产品经理",
    defaultName: "PM 智囊",
    prompt:
      "你是一个富有洞察力的产品经理。你擅长用户需求分析、功能定义和路线图规划。在回答问题时，请始终从用户价值和商业目标的角度出发。",
    model: "gpt-4o",
    icon: "📊",
    color: "from-violet-500 to-purple-500",
    workflow: {
      nodes: [
        {
          id: "node-start",
          type: "start",
          position: { x: 50, y: 250 },
          data: { label: "需求输入", desc: "接收产品相关的需求或问题" },
        },
        {
          id: "node-classifier",
          type: "question_classifier",
          position: { x: 350, y: 250 },
          data: {
            label: "任务拆解",
            desc: "智能分发产品任务类型",
            categories: [
              {
                key: "feature",
                label: "功能设计",
                description: "需求策划、PRD文档、功能定义、交互逻辑等",
              },
              {
                key: "analysis",
                label: "分析调研",
                description: "竞品分析、市场调研、数据洞察、用户反馈等",
              },
              {
                key: "strategy",
                label: "战略规划",
                description: "商业模式、增长策略、路线图、OKR拆解等",
              },
            ],
          },
        },
        {
          id: "node-feature",
          type: "llm",
          position: { x: 750, y: 50 },
          data: {
            label: "产品策划",
            desc: "输出专业的功能方案",
            prompt:
              "你是资深产品经理。用户需求：{{node-classifier.summary}}。请输出一份结构化的功能方案，包含：\n1. ✨ 核心价值 (Value Proposition)\n2. 🎯 用户故事 (User Stories)\n3. 🛠 功能详情与逻辑\n4. 🚀 MVP 建议",
          },
        },
        {
          id: "node-analysis",
          type: "llm",
          position: { x: 750, y: 250 },
          data: {
            label: "深度分析",
            desc: "提供市场与竞品洞察",
            prompt:
              "你是资深产品分析师。分析课题：{{node-classifier.summary}}。请提供深度的分析报告，包含：\n1. 📊 关键结论 Summary\n2. 👁 竞品/市场现状分析\n3. 💡 机会点与差异化建议\n4. ⚠️ 潜在风险提醒",
          },
        },
        {
          id: "node-strategy",
          type: "llm",
          position: { x: 750, y: 450 },
          data: {
            label: "战略顾问",
            desc: "制定宏观策略与规划",
            prompt:
              "你是首席产品官 (CPO)。战略议题：{{node-classifier.summary}}。请提供高维度的战略建议，包含：\n1. 💎 商业画布/核心策略分析\n2. 🗺 演进路线图 (Roadmap) 建议\n3. 📈 关键指标 (North Star Metric)\n4. ⚔️ 执行侧重点",
          },
        },
        {
          id: "node-format",
          type: "code",
          position: { x: 1100, y: 250 },
          data: {
            label: "方案整合",
            desc: "生成标准产品文档",
            codeLanguage: "javascript",
            codeContent: `async function main({ type, content }) {
  const titles = { feature: '功能策划案', analysis: '深度分析报告', strategy: '战略规划建议' };
  const icons = { feature: '📱', analysis: '📊', strategy: '♟️' };
  
  const title = titles[type] || '产品建议';
  const icon = icons[type] || '📝';
  
  return {
    result: '## ' + icon + ' ' + title + '\\n\\n' + content + '\\n\\n---\\n*Create by PM 智囊*'
  };
}`,
            codeContentPython: `def main(type: str, content: str) -> dict:
    titles = {'feature': '功能策划案', 'analysis': '深度分析报告', 'strategy': '战略规划建议'}
    icons = {'feature': '📱', 'analysis': '📊', 'strategy': '♟️'}
    
    title = titles.get(type, '产品建议')
    icon = icons.get(type, '📝')
    
    return {
        'result': f'## {icon} {title}\\n\\n{content}\\n\\n---\\n*Create by PM 智囊*'
    }`,
            variables: {
              type: "{{node-classifier.result}}",
              content: "{{node-feature}}{{node-analysis}}{{node-strategy}}",
            },
            outputVariables: [{ name: "result", type: "string" }],
            retryCount: 0,
            retryInterval: 1000,
            timeout: 10000,
            errorHandling: "fail",
          },
        },
        {
          id: "node-output",
          type: "output",
          position: { x: 1450, y: 250 },
          data: {
            label: "输出方案",
            desc: "展示最终产品方案",
          },
        },
      ],
      edges: [
        {
          id: "e-start-classifier",
          source: "node-start",
          target: "node-classifier",
        },
        {
          id: "e-classifier-feature",
          source: "node-classifier",
          target: "node-feature",
          sourceHandle: "feature",
        },
        {
          id: "e-classifier-analysis",
          source: "node-classifier",
          target: "node-analysis",
          sourceHandle: "analysis",
        },
        {
          id: "e-classifier-strategy",
          source: "node-classifier",
          target: "node-strategy",
          sourceHandle: "strategy",
        },
        {
          id: "e-feature-format",
          source: "node-feature",
          target: "node-format",
        },
        {
          id: "e-analysis-format",
          source: "node-analysis",
          target: "node-format",
        },
        {
          id: "e-strategy-format",
          source: "node-strategy",
          target: "node-format",
        },
        {
          id: "e-format-output",
          source: "node-format",
          target: "node-output",
        },
      ],
    },
  },
  content_creator: {
    label: "内容创作者",
    defaultName: "灵感缪斯",
    prompt:
      "你是一个创意十足的内容创作者。你擅长撰写引人入胜的文章、社交媒体文案和营销脚本。你的文字风格多变，可以根据受众调整。",
    model: "gpt-4o",
    icon: "✍️",
    color: "from-pink-500 to-rose-500",
    workflow: {
      nodes: [
        {
          id: "node-1",
          type: "start",
          position: { x: 100, y: 150 },
          data: { label: "创意触发", desc: "输入主题关键词" },
        },
        {
          id: "node-2",
          type: "llm",
          position: { x: 500, y: 150 },
          data: {
            label: "素材收集",
            desc: "自动扩展相关创意素材",
            prompt: "根据输入关键词，联想并整理相关的文案素材和风格建议。",
          },
        },
        {
          id: "node-3",
          type: "llm",
          position: { x: 900, y: 150 },
          data: {
            label: "文案润色",
            desc: "生成最终高质量文案",
            prompt: "将素材整合成通顺且具有感染力的最终文案。",
          },
        },
        {
          id: "node-4",
          type: "output",
          position: { x: 1300, y: 150 },
          data: { label: "发布内容", desc: "完成创作任务" },
        },
      ],
      edges: [
        { id: "edge-1", source: "node-1", target: "node-2" },
        { id: "edge-2", source: "node-2", target: "node-3" },
        { id: "edge-3", source: "node-3", target: "node-4" },
      ],
    },
  },
};
