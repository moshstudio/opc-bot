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
    requiresGithub?: boolean;
    requiresIDE?: boolean;
  }
> = {
  assistant: {
    label: "助理 (监控 & 总结)",
    defaultName: "艾薇 (Ivy)",
    prompt:
      "你是艾薇 (Ivy)，一人公司的 AI 助理员工。你的职责是：\n1. 监控和总结其他 AI 员工的工作动态\n2. 识别值得关注的事项（错误、异常、重要成果）\n3. 生成简洁明了的工作总结报告",
    model: "",
    icon: "🌿",
    color: "from-emerald-500 to-teal-500",
    workflow: {
      nodes: [
        {
          id: "node-1",
          type: "cron_trigger",
          position: { x: 50, y: 200 },
          data: {
            label: "每小时定时启动",
            scheduleType: "visual",
            frequency: "hourly",
            time: "00:00",
            cron: "0 0 * * * *",
            cronExpression: "0 0 * * * *",
          },
        },
        {
          id: "node-2",
          type: "knowledge_retrieval",
          position: { x: 350, y: 50 },
          data: {
            label: "检索小时日志",
            queryType: "logs",
            queryTimeRange: "1h",
            queryLimit: 20,
          },
        },
        {
          id: "node-3",
          type: "knowledge_retrieval",
          position: { x: 350, y: 200 },
          data: {
            label: "检索小时执行结果",
            queryType: "execution_results",
            queryTimeRange: "1h",
            queryLimit: 10,
          },
        },
        {
          id: "node-4",
          type: "knowledge_retrieval",
          position: { x: 350, y: 350 },
          data: {
            label: "检索小时系统通知",
            queryType: "notifications",
            queryTimeRange: "1h",
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
            label: "格式化工作总结",
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
            label: "发送工作总结",
            notificationType: "both",
            subject: "艾薇 · 实时工作动态总结",
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
    model: "",
    icon: "🏠",
    color: "from-green-500 to-emerald-500",
    workflow: {
      nodes: [
        {
          id: "node-start",
          type: "start",
          position: { x: 50, y: 250 },
          data: { label: "接收消息", },
        },
        {
          id: "node-classifier",
          type: "question_classifier",
          position: { x: 350, y: 250 },
          data: {
            label: "意图分类",
            
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
    model: "",
    icon: "⚙️",
    color: "from-orange-500 to-amber-500",
    requiresGithub: true,
    workflow: {
      nodes: [
        {
          id: "node-1",
          type: "start",
          position: { x: 100, y: 150 },
          data: { label: "指令接收", },
        },
        {
          id: "node-2",
          type: "llm",
          position: { x: 500, y: 150 },
          data: {
            label: "技术风险评估",
            
            prompt: "评估该指令对生产环境的影响及风险等级。",
          },
        },
        {
          id: "node-3",
          type: "code",
          position: { x: 900, y: 150 },
          data: {
            label: "脚本生成",
            
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
          data: { label: "交付脚本", },
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
    model: "",
    icon: "🚀",
    color: "from-red-500 to-rose-500",
    requiresGithub: true,
    workflow: {
      nodes: [
        {
          id: "node-1",
          type: "start",
          position: { x: 100, y: 250 },
          data: { label: "触发部署", },
        },
        {
          id: "node-2",
          type: "condition",
          position: { x: 500, y: 250 },
          data: {
            label: "环境检查",
            
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
            
            prompt: "生成标准的部署序列指令。",
          },
        },
        {
          id: "node-5",
          type: "output",
          position: { x: 1300, y: 250 },
          data: { label: "任务完成", },
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
    model: "",
    icon: "📊",
    color: "from-violet-500 to-purple-500",
    workflow: {
      nodes: [
        {
          id: "node-start",
          type: "start",
          position: { x: 50, y: 250 },
          data: { label: "需求输入", },
        },
        {
          id: "node-classifier",
          type: "question_classifier",
          position: { x: 350, y: 250 },
          data: {
            label: "任务拆解",
            
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
    model: "",
    icon: "✍️",
    color: "from-pink-500 to-rose-500",
    workflow: {
      nodes: [
        {
          id: "node-1",
          type: "start",
          position: { x: 100, y: 150 },
          data: { label: "创意触发", },
        },
        {
          id: "node-2",
          type: "llm",
          position: { x: 500, y: 150 },
          data: {
            label: "素材收集",
            
            prompt: "根据输入关键词，联想并整理相关的文案素材和风格建议。",
          },
        },
        {
          id: "node-3",
          type: "llm",
          position: { x: 900, y: 150 },
          data: {
            label: "文案润色",
            
            prompt: "将素材整合成通顺且具有感染力的最终文案。",
          },
        },
        {
          id: "node-4",
          type: "output",
          position: { x: 1300, y: 150 },
          data: { label: "发布内容", },
        },
      ],
      edges: [
        { id: "edge-1", source: "node-1", target: "node-2" },
        { id: "edge-2", source: "node-2", target: "node-3" },
        { id: "edge-3", source: "node-3", target: "node-4" },
      ],
    },
  },
  fullstack_engineer: {
    label: "全栈工程师",
    defaultName: "全栈大神",
    prompt:
      "你是一名高级全栈工程师，精通 React, Next.js, Node.js 以及各种数据库设计。负责项目前后端架构设计、接口开发及复杂问题排查。在回答问题时，请提供高质量的代码示例和架构建议。",
    model: "",
    icon: "💻",
    color: "from-cyan-500 to-emerald-600",
    requiresIDE: true,
    workflow: {
      nodes: [
        {
          id: "node-1",
          type: "start",
          position: { x: 100, y: 150 },
          data: { label: "接收需求", },
        },
        {
          id: "node-2",
          type: "llm",
          position: { x: 500, y: 150 },
          data: {
            label: "全栈架构设计",
            
            prompt:
              "作为全栈工程师，请先分析该需求，并输出前后端架构设计方案、组件拆分及数据库表结构建议。",
          },
        },
        {
          id: "node-3",
          type: "llm",
          position: { x: 900, y: 150 },
          data: {
            label: "代码生成",
            
            prompt:
              "根据设计方案，使用现代技术栈，编写高质量的前后端代码示例，注意处理异常校验和安全性。",
          },
        },
        {
          id: "node-4",
          type: "output",
          position: { x: 1300, y: 150 },
          data: { label: "交付全栈代码", },
        },
      ],
      edges: [
        { id: "edge-1", source: "node-1", target: "node-2" },
        { id: "edge-2", source: "node-2", target: "node-3" },
        { id: "edge-3", source: "node-3", target: "node-4" },
      ],
    },
  },
  qa_engineer: {
    label: "测试工程师",
    defaultName: "Bug 终结者",
    prompt:
      "你是一名严谨的测试工程师。擅长编写测试用例、边界条件分析和自动化测试脚本，致力于找出现有代码或业务逻辑中的漏洞。",
    model: "",
    icon: "🐛",
    color: "from-red-500 to-orange-500",
    workflow: {
      nodes: [
        {
          id: "node-1",
          type: "start",
          position: { x: 100, y: 150 },
          data: { label: "接收内容", },
        },
        {
          id: "node-2",
          type: "llm",
          position: { x: 500, y: 150 },
          data: {
            label: "用例设计",
            
            prompt:
              "分析输入内容，梳理出需要覆盖的测试点，特别是异常流和边界条件。",
          },
        },
        {
          id: "node-3",
          type: "llm",
          position: { x: 900, y: 150 },
          data: {
            label: "测试脚本编写",
            
            prompt:
              "为上述测试点编写自动化测试脚本（如 Jest或Playwright 规范代码）。",
          },
        },
        {
          id: "node-4",
          type: "output",
          position: { x: 1300, y: 150 },
          data: { label: "交付测试方案", },
        },
      ],
      edges: [
        { id: "edge-1", source: "node-1", target: "node-2" },
        { id: "edge-2", source: "node-2", target: "node-3" },
        { id: "edge-3", source: "node-3", target: "node-4" },
      ],
    },
  },

  // =====================
  // 媒体公司 (Media)
  // =====================
  copywriter: {
    label: "文案策划",
    defaultName: "爆款制造机",
    prompt:
      "你是一名爆款文案策划师，精通各类社交媒体(小红书、抖音、公众号)的内容调性，擅长撰写高转化、高互动的文案。请注重情绪价值和网感。",
    model: "",
    icon: "✍️",
    color: "from-pink-500 to-rose-500",
    workflow: {
      nodes: [
        {
          id: "node-1",
          type: "start",
          position: { x: 100, y: 150 },
          data: { label: "接收素材", },
        },
        {
          id: "node-2",
          type: "llm",
          position: { x: 500, y: 150 },
          data: {
            label: "痛点提取",
            
            prompt:
              "分析素材，提炼出能激发用户共鸣的核心痛点、情绪价值和主要卖点。",
          },
        },
        {
          id: "node-3",
          type: "llm",
          position: { x: 900, y: 150 },
          data: {
            label: "文案生成",
            
            prompt:
              "基于提炼出的痛点和卖点，生成一篇小红书风格（带Emoji与标签）的爆款文案，和一篇公众号风格的深度软文。",
          },
        },
        {
          id: "node-4",
          type: "output",
          position: { x: 1300, y: 150 },
          data: { label: "输出文案", },
        },
      ],
      edges: [
        { id: "edge-1", source: "node-1", target: "node-2" },
        { id: "edge-2", source: "node-2", target: "node-3" },
        { id: "edge-3", source: "node-3", target: "node-4" },
      ],
    },
  },
  video_director: {
    label: "短视频编导",
    defaultName: "镜头大师",
    prompt:
      "你是一名极具创意的短视频编导，负责从爆款创意构思到分镜头脚本输出。深谙黄金三秒和完播率技巧。",
    model: "",
    icon: "🎬",
    color: "from-fuchsia-600 to-purple-600",
    workflow: {
      nodes: [
        {
          id: "node-1",
          type: "start",
          position: { x: 100, y: 150 },
          data: { label: "输入主题", },
        },
        {
          id: "node-2",
          type: "llm",
          position: { x: 500, y: 150 },
          data: {
            label: "创意构思",
            
            prompt:
              "设计具有吸引力的开头(黄金三秒)、强反转的情节或核心价值输出点。",
          },
        },
        {
          id: "node-3",
          type: "llm",
          position: { x: 900, y: 150 },
          data: {
            label: "分镜脚本",
            
            prompt:
              "将创意转化为标准的分镜头脚本（包括画面、景别、台词、音效、时长）。",
          },
        },
        {
          id: "node-4",
          type: "output",
          position: { x: 1300, y: 150 },
          data: { label: "输出脚本", },
        },
      ],
      edges: [
        { id: "edge-1", source: "node-1", target: "node-2" },
        { id: "edge-2", source: "node-2", target: "node-3" },
        { id: "edge-3", source: "node-3", target: "node-4" },
      ],
    },
  },
  social_media_manager: {
    label: "社交媒体运营",
    defaultName: "运营大牛",
    prompt:
      "你是一名社交媒体运营专家，负责数据分析、账号定位、涨粉策略及用户互动分析。",
    model: "",
    icon: "📱",
    color: "from-blue-500 to-indigo-500",
    workflow: {
      nodes: [
        {
          id: "node-1",
          type: "start",
          position: { x: 100, y: 150 },
          data: { label: "现状输入", },
        },
        {
          id: "node-2",
          type: "llm",
          position: { x: 500, y: 150 },
          data: {
            label: "赛道分析",
            
            prompt: "分析该垂直领域的爆款逻辑、用户画像以及对标账号的打法。",
          },
        },
        {
          id: "node-3",
          type: "llm",
          position: { x: 900, y: 150 },
          data: {
            label: "运营规划",
            
            prompt: "针对该账号制定一周的选题库规划及具体的涨粉和互动策略。",
          },
        },
        {
          id: "node-4",
          type: "output",
          position: { x: 1300, y: 150 },
          data: { label: "输出报告", },
        },
      ],
      edges: [
        { id: "edge-1", source: "node-1", target: "node-2" },
        { id: "edge-2", source: "node-2", target: "node-3" },
        { id: "edge-3", source: "node-3", target: "node-4" },
      ],
    },
  },

  // =====================
  // 教育公司 (Education)
  // =====================
  instructional_designer: {
    label: "课程设计师",
    defaultName: "教育专家",
    prompt:
      "你是一名专业的课程设计师，负责梳理课程大纲、知识图谱及设计科学的教学闭环。擅长将复杂知识拆解为易消化的模块。",
    model: "",
    icon: "📚",
    color: "from-amber-500 to-orange-500",
    workflow: {
      nodes: [
        {
          id: "node-1",
          type: "start",
          position: { x: 100, y: 150 },
          data: { label: "接收课题", },
        },
        {
          id: "node-2",
          type: "llm",
          position: { x: 500, y: 150 },
          data: {
            label: "目标拆解",
            
            prompt: "明确该课程的核心教学目标、知识体系图谱，以及先修要求。",
          },
        },
        {
          id: "node-3",
          type: "llm",
          position: { x: 900, y: 150 },
          data: {
            label: "大纲设计",
            
            prompt:
              "基于学习目标，产出结构清晰、层层递进的课程大纲（细化到每节课重点架构）。",
          },
        },
        {
          id: "node-4",
          type: "output",
          position: { x: 1300, y: 150 },
          data: { label: "输出大纲", },
        },
      ],
      edges: [
        { id: "edge-1", source: "node-1", target: "node-2" },
        { id: "edge-2", source: "node-2", target: "node-3" },
        { id: "edge-3", source: "node-3", target: "node-4" },
      ],
    },
  },
  assessment_manager: {
    label: "题库管理员",
    defaultName: "出题考官",
    prompt:
      "你负责各类学科测试题目的设计与审核，确保题目的质量、难度梯度和教育意义。精通各种题型设计及陷阱布置。",
    model: "",
    icon: "📝",
    color: "from-teal-500 to-emerald-500",
    workflow: {
      nodes: [
        {
          id: "node-1",
          type: "start",
          position: { x: 100, y: 150 },
          data: { label: "输入知识点", },
        },
        {
          id: "node-2",
          type: "llm",
          position: { x: 500, y: 150 },
          data: {
            label: "考点梳理",
            
            prompt: "提炼该知识点的常见误区、混淆项和核心考察方向。",
          },
        },
        {
          id: "node-3",
          type: "llm",
          position: { x: 900, y: 150 },
          data: {
            label: "批量制题",
            
            prompt:
              "生成包括单选、多选、简答在内的不同难度梯度（基础/进阶/挑战）的测试题，并附带详尽的解析。",
          },
        },
        {
          id: "node-4",
          type: "output",
          position: { x: 1300, y: 150 },
          data: { label: "输出考卷", },
        },
      ],
      edges: [
        { id: "edge-1", source: "node-1", target: "node-2" },
        { id: "edge-2", source: "node-2", target: "node-3" },
        { id: "edge-3", source: "node-3", target: "node-4" },
      ],
    },
  },
  tutor: {
    label: "答疑辅导员",
    defaultName: "知心学长",
    prompt:
      "你是一名耐心细致的答疑辅导员，能够针对学生的问题提供详尽、易懂的解答。善于启发式教学而非直接给答案。",
    model: "",
    icon: "🎓",
    color: "from-indigo-500 to-violet-500",
    workflow: {
      nodes: [
        {
          id: "node-1",
          type: "start",
          position: { x: 100, y: 150 },
          data: { label: "接收问题", },
        },
        {
          id: "node-2",
          type: "llm",
          position: { x: 500, y: 150 },
          data: {
            label: "症结诊断",
            
            prompt: "分析学生该问题背后缺失的底层知识点或思维逻辑漏洞。",
          },
        },
        {
          id: "node-3",
          type: "llm",
          position: { x: 900, y: 150 },
          data: {
            label: "启发引导",
            
            prompt:
              "使用类比和生动的语言，分步骤地解答问题，最后抛出启发性问题引导学生自主思考。",
          },
        },
        {
          id: "node-4",
          type: "output",
          position: { x: 1300, y: 150 },
          data: { label: "输出辅导", },
        },
      ],
      edges: [
        { id: "edge-1", source: "node-1", target: "node-2" },
        { id: "edge-2", source: "node-2", target: "node-3" },
        { id: "edge-3", source: "node-3", target: "node-4" },
      ],
    },
  },

  // =====================
  // 通用/自定义公司 (Custom)
  // =====================
  general_assistant: {
    label: "通用助理",
    defaultName: "全能小智",
    prompt:
      "你是一名全能的AI助理，可以协助用户处理各种日常事务和问题。你知识渊博且服务态度极佳。",
    model: "",
    icon: "🤖",
    color: "from-slate-500 to-gray-500",
    workflow: {
      nodes: [
        {
          id: "node-1",
          type: "start",
          position: { x: 100, y: 150 },
          data: { label: "接收指令", },
        },
        {
          id: "node-2",
          type: "llm",
          position: { x: 500, y: 150 },
          data: {
            label: "意图解析",
            
            prompt: "分析用户指令的真实意图和需要用到的背景知识体系。",
          },
        },
        {
          id: "node-3",
          type: "llm",
          position: { x: 900, y: 150 },
          data: {
            label: "综合处理",
            
            prompt:
              "结合知识库与逻辑推演，给出兼具专业度与可读性的详尽回答或方案。",
          },
        },
        {
          id: "node-4",
          type: "output",
          position: { x: 1300, y: 150 },
          data: { label: "输出回复", },
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
