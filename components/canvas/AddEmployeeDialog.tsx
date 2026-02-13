"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  AlertTriangle,
  UserPlus,
  Sparkles,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { useModelContext } from "@/components/ModelContext";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const formSchema = z.object({
  name: z.string().min(2, {
    message: "姓名至少需要 2 个字符。",
  }),
  role: z.string().min(1, {
    message: "请选择一个角色。",
  }),
  prompt: z.string().optional(),
  model: z.string().min(1, {
    message: "请选择一个模型。",
  }),
});

const ROLE_TEMPLATES: Record<
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
          position: { x: 100, y: 150 },
          data: {
            label: "定时启动",
            desc: "每日早晨自动触发日志扫描",
            scheduleType: "visual",
            frequency: "daily",
            time: "09:00",
            daysOfWeek: "1",
            daysOfMonth: "1",
            interval: 1,
            cron: "0 0 9 * * *",
            cronExpression: "0 0 9 * * *",
          },
        },
        {
          id: "node-2",
          type: "knowledge_retrieval",
          position: { x: 500, y: 150 },
          data: {
            label: "检索员工日志",
            desc: "获取所有员工最近的活动记录",
            queryType: "logs",
            queryLimit: 50,
          },
        },
        {
          id: "node-3",
          type: "llm",
          position: { x: 900, y: 150 },
          data: {
            label: "AI 分析总结",
            desc: "识别潜在风险与核心成就",
            prompt:
              "请分析以下员工日志，提取其中的核心成果、重要警告和错误信息。如果没有异常，请生成一份语气温和的日常工作汇总。输出要求：使用 JSON 格式，包含 hasNotableItems, summary 和 items 列表。",
            model: "",
            outputSchema:
              '{"hasNotableItems": "boolean", "summary": "string", "items": "array"}',
          },
        },
        {
          id: "node-4",
          type: "notification",
          position: { x: 1300, y: 150 },
          data: {
            label: "推送汇总通知",
            desc: "向系统和邮件发送摘要报告",
            notificationType: "both",
            subject: "艾薇 · 每日工作摘要",
            content: "发现以下值得关注的事项：\n{{node-3}}",
          },
        },
      ],
      edges: [
        { id: "edge-1", source: "node-1", target: "node-2" },
        { id: "edge-2", source: "node-2", target: "node-3" },
        { id: "edge-3", source: "node-3", target: "node-4" },
      ],
    },
  },
  life_assistant: {
    label: "生活助理 (个人)",
    defaultName: "阿尔弗雷德 (Alfred)",
    prompt:
      "你是一个贴心的个人生活助理。你负责关心用户的健康、日程安排和个人琐事。你的语气应该像一个老朋友一样温暖和体贴。",
    model: "gpt-4o",
    icon: "🏠",
    color: "from-green-500 to-emerald-500",
    workflow: {
      nodes: [
        {
          id: "node-1",
          type: "start",
          position: { x: 100, y: 150 },
          data: { label: "开始", desc: "接收用户发送的消息" },
        },
        {
          id: "node-2",
          type: "llm",
          position: { x: 500, y: 150 },
          data: {
            label: "场景识别",
            desc: "分析用户需求的场景分类",
            prompt: "识别用户的当前需求属于哪种生活场景（健康、日程、琐事）。",
          },
        },
        {
          id: "node-3",
          type: "template_transform",
          position: { x: 900, y: 150 },
          data: {
            label: "情感化建议",
            desc: "生成个性化的关怀内容",
            templateContent:
              "你好！关于你的需求：{{node-2}}\n\n今天也要保持好心情哦！",
          },
        },
        {
          id: "node-4",
          type: "output",
          position: { x: 1300, y: 150 },
          data: { label: "发送回复", desc: "将关怀内容返回给用户" },
        },
      ],
      edges: [
        { id: "edge-1", source: "node-1", target: "node-2" },
        { id: "edge-2", source: "node-2", target: "node-3" },
        { id: "edge-3", source: "node-3", target: "node-4" },
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
            codeContent:
              "return `// 执行脚本\\nkubectl apply -f config.yaml // 基于: ${input}`",
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
          id: "node-1",
          type: "start",
          position: { x: 100, y: 150 },
          data: { label: "需求输入", desc: "提交新功能或优化建议" },
        },
        {
          id: "node-2",
          type: "llm",
          position: { x: 500, y: 150 },
          data: {
            label: "价值拆解",
            desc: "识别核心痛点与商业价值",
            prompt: "分析该需求背后的用户痛苦点和商业价值。",
          },
        },
        {
          id: "node-3",
          type: "llm",
          position: { x: 900, y: 150 },
          data: {
            label: "Roadmap 生成",
            desc: "制定开发路线图",
            prompt: "基于价值拆解结果，生成分阶段的开发计划。",
          },
        },
        {
          id: "node-4",
          type: "output",
          position: { x: 1300, y: 150 },
          data: { label: "提交方案", desc: "输出完整策划文档" },
        },
      ],
      edges: [
        { id: "edge-1", source: "node-1", target: "node-2" },
        { id: "edge-2", source: "node-2", target: "node-3" },
        { id: "edge-3", source: "node-3", target: "node-4" },
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

interface AddEmployeeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAdd: (
    data: z.infer<typeof formSchema> & {
      workflow?: any;
      modelName?: string;
      modelConfig?: any;
    },
  ) => void;
}

export function AddEmployeeDialog({
  open,
  onOpenChange,
  onAdd,
}: AddEmployeeDialogProps) {
  const { models } = useModelContext();
  const [showAdvanced, setShowAdvanced] = useState(false);

  const defaultRole = "assistant";
  const template = ROLE_TEMPLATES[defaultRole];

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: template.defaultName,
      role: defaultRole,
      prompt: template.prompt,
      model: "",
    },
  });

  const selectedRole = form.watch("role");
  const currentTemplate = ROLE_TEMPLATES[selectedRole];

  // 当模型列表加载后，如果没有选中有效模型，设置一个默认模型
  useEffect(() => {
    if (open && models.length > 0) {
      const currentModel = form.getValues("model");
      const isCurrentModelValid = models.some((m) => m.id === currentModel);

      if (!isCurrentModelValid) {
        const defaultModelId =
          models.find(
            (m) => m.id === template.model || m.name === template.model,
          )?.id || models[0].id;
        form.setValue("model", defaultModelId);
      }
    }
  }, [open, models, template.model, form]);

  const handleRoleChange = (role: string) => {
    const t = ROLE_TEMPLATES[role];
    if (t) {
      form.setValue("role", role);
      form.setValue("name", t.defaultName);
      form.setValue("prompt", t.prompt);

      // 尝试匹配模板建议的模型，如果找到则切换
      const matchingModel = models.find(
        (m) => m.id === t.model || m.name === t.model,
      );
      if (matchingModel) {
        form.setValue("model", matchingModel.id);
      }
    }
  };

  function onSubmit(values: z.infer<typeof formSchema>) {
    const tmpl = ROLE_TEMPLATES[values.role];

    // 同步模型到工作流中的 AI 节点
    let updatedWorkflow = tmpl?.workflow;
    if (updatedWorkflow && updatedWorkflow.nodes) {
      // 深拷贝工作流，避免修改原始模板
      const clonedWorkflow = JSON.parse(JSON.stringify(updatedWorkflow));
      clonedWorkflow.nodes = clonedWorkflow.nodes.map((node: any) => {
        // 如果是 AI 处理 (process/llm) 节点，将其使用的模型同步为当前选择的模型
        if (node.type === "process" || node.type === "llm") {
          return {
            ...node,
            data: {
              ...node.data,
              model: values.model,
            },
          };
        }
        return node;
      });
      updatedWorkflow = clonedWorkflow;
    }

    onAdd({
      ...values,
      workflow: updatedWorkflow,
    });
    onOpenChange(false);

    const defaultTmpl = ROLE_TEMPLATES[defaultRole];
    const defaultModelId =
      models.find(
        (m) => m.id === defaultTmpl.model || m.name === defaultTmpl.model,
      )?.id || (models.length > 0 ? models[0].id : "");

    form.reset({
      name: defaultTmpl.defaultName,
      role: defaultRole,
      prompt: defaultTmpl.prompt,
      model: defaultModelId,
    });
  }

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
    >
      <DialogContent className='sm:max-w-[500px] p-0 overflow-hidden border-0 shadow-2xl rounded-2xl bg-white dark:bg-slate-950'>
        {/* Gradient Header */}
        <div
          className={`relative px-6 pt-6 pb-4 bg-gradient-to-br ${currentTemplate?.color || "from-violet-500 to-purple-600"} transition-all duration-500`}
        >
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImEiIHBhdHRlcm5Vbml0cz0idXNlclNwYWNlT25Vc2UiIHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCI+PHBhdGggZD0iTTAgMGg2MHY2MEgweiIgZmlsbD0ibm9uZSIvPjxjaXJjbGUgY3g9IjMwIiBjeT0iMzAiIHI9IjEiIGZpbGw9InJnYmEoMjU1LDI1NSwyNTUsMC4wOCkiLz48L3BhdHRlcm4+PC9kZWZzPjxyZWN0IGZpbGw9InVybCgjYSkiIHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiLz48L3N2Zz4=')] opacity-50" />
          <DialogHeader className='relative z-10'>
            <div className='flex items-center gap-3 mb-1'>
              <div className='p-2 bg-white/20 backdrop-blur-sm rounded-xl text-xl'>
                <UserPlus className='h-5 w-5 text-white' />
              </div>
              <DialogTitle className='text-xl font-bold text-white tracking-tight'>
                添加新员工
              </DialogTitle>
            </div>
            <DialogDescription className='text-white/70 text-sm pl-[3.25rem]'>
              创建一个新的 AI 员工，创建后可在工作流画布中编辑。
            </DialogDescription>
          </DialogHeader>
        </div>

        {/* Body */}
        {models.length === 0 ? (
          <div className='flex flex-col items-center justify-center py-10 px-6 text-center space-y-4'>
            <div className='p-3 bg-amber-100 dark:bg-amber-900/20 rounded-full text-amber-600 dark:text-amber-400'>
              <AlertTriangle className='w-8 h-8' />
            </div>
            <div className='space-y-2'>
              <h3 className='font-semibold text-lg'>还没有可用的 AI 模型</h3>
              <p className='text-sm text-muted-foreground max-w-[300px] mx-auto'>
                在创建员工之前，您需要先配置至少一个 AI 模型。
              </p>
            </div>
            <Button
              asChild
              className='mt-4 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-md'
              onClick={() => onOpenChange(false)}
            >
              <Link href='/dashboard/models'>前往模型管理</Link>
            </Button>
          </div>
        ) : (
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(onSubmit)}
              className='px-6 pb-6 pt-5 space-y-5'
            >
              {/* Role Selector – Card Grid */}
              <FormField
                control={form.control}
                name='role'
                render={() => (
                  <FormItem>
                    <FormLabel className='text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400'>
                      选择角色
                    </FormLabel>
                    <div className='grid grid-cols-3 gap-2 mt-1.5'>
                      {Object.entries(ROLE_TEMPLATES).map(([key, tmpl]) => {
                        const isSelected = selectedRole === key;
                        return (
                          <button
                            key={key}
                            type='button'
                            onClick={() => handleRoleChange(key)}
                            className={`relative flex flex-col items-center gap-1 p-2.5 rounded-xl border-2 transition-all duration-200 cursor-pointer hover:scale-[1.03] active:scale-[0.97] ${
                              isSelected
                                ? "border-violet-400 bg-violet-50 dark:bg-violet-900/20 shadow-md ring-2 ring-violet-400/30"
                                : "border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 hover:shadow-sm"
                            }`}
                          >
                            <span className='text-lg leading-none'>
                              {tmpl.icon}
                            </span>
                            <span className='text-[10px] font-semibold leading-tight text-center text-slate-600 dark:text-slate-300'>
                              {tmpl.label.split(" (")[0]}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Name */}
              <FormField
                control={form.control}
                name='name'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className='text-sm font-medium flex items-center gap-2'>
                      <Sparkles className='h-3.5 w-3.5 text-amber-500' />
                      员工姓名
                    </FormLabel>
                    <FormControl>
                      <Input
                        placeholder='例如：贾维斯'
                        className='rounded-xl h-10 bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 focus:ring-2 focus:ring-violet-500/20 transition-shadow'
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Model */}
              <FormField
                control={form.control}
                name='model'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className='text-sm font-medium'>模型</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                      value={field.value}
                    >
                      <FormControl>
                        <SelectTrigger className='rounded-xl h-10 bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800'>
                          <SelectValue placeholder='选择模型' />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {models.map((m) => (
                          <SelectItem
                            key={m.id}
                            value={m.id}
                          >
                            <div className='flex items-center gap-2'>
                              <span>{m.name}</span>
                              <span className='text-xs text-muted-foreground capitalize'>
                                {m.provider}
                              </span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Advanced Toggle */}
              <button
                type='button'
                onClick={() => setShowAdvanced(!showAdvanced)}
                className='flex items-center gap-2 text-sm text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 transition-colors w-full'
              >
                {showAdvanced ? (
                  <ChevronUp className='h-4 w-4' />
                ) : (
                  <ChevronDown className='h-4 w-4' />
                )}
                <span>
                  {showAdvanced ? "隐藏高级设置" : "显示高级设置 (Prompt)"}
                </span>
              </button>

              {showAdvanced && (
                <div className='space-y-4 pt-2 border-t border-slate-100 dark:border-slate-800 animate-in slide-in-from-top-1 duration-200'>
                  <FormField
                    control={form.control}
                    name='prompt'
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className='text-sm font-medium'>
                          系统提示词 (System Prompt)
                        </FormLabel>
                        <FormControl>
                          <textarea
                            className='flex min-h-[100px] w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 px-4 py-3 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500/20 disabled:cursor-not-allowed disabled:opacity-50 transition-shadow'
                            placeholder='输入系统提示词...'
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              )}

              <Button
                type='submit'
                className={`w-full h-11 rounded-xl font-semibold text-white shadow-lg transition-all duration-300 hover:shadow-xl hover:scale-[1.01] active:scale-[0.99] bg-gradient-to-r ${currentTemplate?.color || "from-violet-500 to-purple-600"}`}
              >
                创建员工
              </Button>
            </form>
          </Form>
        )}
      </DialogContent>
    </Dialog>
  );
}
