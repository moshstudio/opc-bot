"use client";

import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { NODE_THEMES } from "./nodeTypeConfig";
import {
  Bot,
  Users,
  GitBranch,
  Globe,
  Code2,
  FileText,
  Clock,
  Search,
  Bell,
} from "lucide-react";
import SimpleCodeEditor from "react-simple-code-editor";
import Prism from "prismjs";
import "prismjs/components/prism-javascript";
import "prismjs/themes/prism-dark.css";
// Don't forget to install types: npm i --save-dev @types/prismjs
import { VariablePicker } from "./VariablePicker";

import { generateCron } from "@/lib/workflow/cron-utils";
import { CronConfigurator, CronConfigData } from "./CronConfigurator";
import { SchemaBuilder } from "./SchemaBuilder";
import { nanoid } from "nanoid";

interface NodeDialogsProps {
  activeDialog: string | null;
  setActiveDialog: (dialog: string | null) => void;
  onCreateNode: (type: string, data: any) => void;
  models: { id: string; name: string; provider: string }[];
  availableSubEmployees: { id: string; name: string; role: string }[];
  allEmployees: { id: string; name: string; role: string }[];
  companyId?: string;
}

export function NodeDialogs({
  activeDialog,
  setActiveDialog,
  onCreateNode,
  models,
  availableSubEmployees,
  allEmployees,
}: NodeDialogsProps) {
  // Form states ...
  const [cronForm, setCronForm] = useState<CronConfigData & { label: string }>(
    () => {
      const initialConfig = {
        frequency: "daily" as const,
        time: "09:00",
        daysOfWeek: "1",
        daysOfMonth: "1",
        interval: 1,
        minute: 0,
      };
      const initialCron = generateCron(initialConfig);
      return {
        label: "定时触发",
        scheduleType: "visual" as "visual" | "cron",
        cronExpression: initialCron,
        cron: initialCron,
        ...initialConfig,
      };
    },
  );

  const [retrievalForm, setRetrievalForm] = useState({
    label: "数据检索",
    queryType: "logs" as
      | "logs"
      | "knowledge_base"
      | "notifications"
      | "execution_results"
      | "database",
    queryLimit: 50,
    queryFilter: "all",
    queryKeyword: "",
    queryTimeRange: "24h" as "1h" | "24h" | "7d" | "30d" | "all",
    queryEmployeeId: "all",
    queryIncludeProcessed: false,
  });
  const [notificationForm, setNotificationForm] = useState(() => {
    const defaults = NODE_THEMES.notification.defaultData;
    return {
      label: "发送通知",
      notificationType: "site" as "site" | "email" | "both",
      subject: (defaults?.subject as string) || "艾薇 · 报告摘要",
      content:
        (defaults?.content as string) ||
        "发现以下值得关注的事项：\n{{llm-node}}",
    };
  });
  const [processForm, setProcessForm] = useState({
    label: "AI 处理",
    model: "",
    prompt: "",
    outputSchema: "",
    retryCount: 0,
    timeout: 30000,
  });
  const [conditionForm, setConditionForm] = useState({
    label: "条件判断",
    conditionType: "contains" as string,
    conditionValue: "",
  });
  const [httpForm, setHttpForm] = useState({
    label: "HTTP 请求",
    httpMethod: "GET" as string,
    httpUrl: "",
    httpBody: "",
  });
  const [codeForm, setCodeForm] = useState<{
    label: string;
    codeContent: string;
    variables: { key: string; value: string }[];
  }>({
    label: "代码处理",
    codeContent: `/**
 * @param {Object} args
 * @param {Object} args.input - 上一节点的输出
 * @param {Object} args.vars - 输入变量 (见下方配置)
 * @returns {any} - 节点输出结果
 */
async function main({ input, vars }) {
  // 示例: 获取上一节点的结果并转大写
  // const str = typeof input === 'string' ? input : JSON.stringify(input);
  // return str.toUpperCase();
  
  return {
    rawInput: input,
    processed: true,
    timestamp: Date.now()
  };
}`,
    variables: [],
  });
  const [templateForm, setTemplateForm] = useState({
    label: "文本模板",
    templateContent: "",
  });
  const [webhookForm, setWebhookForm] = useState({
    label: "Webhook 触发",
  });
  const [selectedSubEmpId, setSelectedSubEmpId] = useState("");

  return (
    <>
      {/* 定时触发节点 */}
      <Dialog
        open={activeDialog === "cron_trigger"}
        onOpenChange={(open) => !open && setActiveDialog(null)}
      >
        <DialogContent className='sm:max-w-[440px] rounded-2xl p-0 overflow-hidden border-none shadow-2xl'>
          <div className='bg-gradient-to-r from-teal-600 to-emerald-600 p-6 text-white'>
            <DialogHeader>
              <DialogTitle className='flex items-center gap-2 text-white text-xl'>
                <div className='bg-white/20 p-2 rounded-lg'>
                  <Clock className='w-5 h-5 text-white' />
                </div>
                配置定时触发
              </DialogTitle>
            </DialogHeader>
            <p className='text-teal-50/80 text-sm mt-2'>
              设定工作流自动执行的时间规则
            </p>
          </div>

          <div className='p-6 space-y-6 bg-white dark:bg-slate-900'>
            <div className='space-y-2'>
              <Label className='text-xs font-semibold text-slate-500 uppercase tracking-wider'>
                节点名称
              </Label>
              <Input
                value={cronForm.label}
                onChange={(e) =>
                  setCronForm({ ...cronForm, label: e.target.value })
                }
                className='rounded-xl bg-slate-50 border-slate-200 focus:ring-teal-500'
                placeholder='例如：每日早报触发'
              />
            </div>

            <CronConfigurator
              data={cronForm}
              onChange={(updates) => setCronForm({ ...cronForm, ...updates })}
            />

            <Button
              onClick={() => {
                const finalCron =
                  cronForm.scheduleType === "visual"
                    ? generateCron(cronForm as any)
                    : cronForm.cronExpression;

                onCreateNode("cron_trigger", {
                  ...cronForm,
                  cron: finalCron,
                  cronExpression: finalCron,
                });
                setActiveDialog(null);
              }}
              className='w-full h-12 rounded-xl bg-teal-600 hover:bg-teal-700 text-white shadow-lg shadow-teal-500/20 transition-all font-medium text-base active:scale-[0.98]'
            >
              确 定
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Webhook 触发节点 */}
      <Dialog
        open={activeDialog === "webhook"}
        onOpenChange={(open) => !open && setActiveDialog(null)}
      >
        <DialogContent className='sm:max-w-[400px] rounded-2xl'>
          <DialogHeader>
            <DialogTitle className='flex items-center gap-2'>
              <Globe className='w-5 h-5 text-indigo-500' />
              配置 Webhook 触发器
            </DialogTitle>
          </DialogHeader>
          <div className='space-y-4 pt-2'>
            <div className='space-y-2'>
              <Label>节点名称</Label>
              <Input
                value={webhookForm.label}
                onChange={(e) =>
                  setWebhookForm({ ...webhookForm, label: e.target.value })
                }
                className='rounded-xl'
              />
            </div>
            <div className='space-y-2'>
              <Label>Webhook URL</Label>
              <div className='p-3 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-mono break-all text-slate-500'>
                {`https://api.opc-bot.com/v1/webhooks/workflow/${nanoid(6)}`}
              </div>
              <p className='text-[10px] text-muted-foreground'>
                向此 URL 发送 POST 请求以触发工作流。
              </p>
            </div>
            <Button
              onClick={() => {
                onCreateNode("webhook", webhookForm);
                setActiveDialog(null);
              }}
              className='w-full rounded-xl bg-indigo-600 text-white'
            >
              添加节点
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* 知识检索节点 */}
      <Dialog
        open={activeDialog === "knowledge_retrieval"}
        onOpenChange={(open) => !open && setActiveDialog(null)}
      >
        <DialogContent className='sm:max-w-[440px] rounded-2xl p-0 overflow-hidden border-none shadow-2xl'>
          <div className='bg-gradient-to-r from-emerald-600 to-teal-600 p-6 text-white'>
            <DialogHeader>
              <DialogTitle className='flex items-center gap-2 text-white text-xl'>
                <div className='bg-white/20 p-2 rounded-lg'>
                  <Search className='w-5 h-5 text-white' />
                </div>
                配置数据检索
              </DialogTitle>
            </DialogHeader>
            <p className='text-emerald-50/80 text-sm mt-2'>
              从日志、知识库或数据库中提取工作流所需的信息
            </p>
          </div>

          <div className='p-6 space-y-5 bg-white dark:bg-slate-900 max-h-[80vh] overflow-y-auto'>
            <div className='space-y-2'>
              <Label className='text-xs font-semibold text-slate-500 uppercase tracking-wider'>
                节点名称
              </Label>
              <Input
                value={retrievalForm.label}
                onChange={(e) =>
                  setRetrievalForm({ ...retrievalForm, label: e.target.value })
                }
                className='rounded-xl bg-slate-50 border-slate-200 focus:ring-emerald-500'
                placeholder='如：获取最新报错日志'
              />
            </div>

            <div className='grid grid-cols-2 gap-4'>
              <div className='space-y-2'>
                <Label className='text-xs font-semibold text-slate-500 uppercase tracking-wider'>
                  数据源
                </Label>
                <Select
                  value={retrievalForm.queryType}
                  onValueChange={(v: any) =>
                    setRetrievalForm({ ...retrievalForm, queryType: v })
                  }
                >
                  <SelectTrigger className='rounded-xl bg-slate-50 border-slate-200'>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value='logs'>员工日志</SelectItem>
                    <SelectItem value='notifications'>站内通知</SelectItem>
                    <SelectItem value='execution_results'>执行结果</SelectItem>
                    <SelectItem value='knowledge_base'>知识库 (RAG)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className='space-y-2'>
                <Label className='text-xs font-semibold text-slate-500 uppercase tracking-wider'>
                  时间范围
                </Label>
                <Select
                  value={retrievalForm.queryTimeRange}
                  onValueChange={(v: any) =>
                    setRetrievalForm({ ...retrievalForm, queryTimeRange: v })
                  }
                >
                  <SelectTrigger className='rounded-xl bg-slate-50 border-slate-200'>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value='1h'>最近 1 小时</SelectItem>
                    <SelectItem value='24h'>最近 24 小时</SelectItem>
                    <SelectItem value='7d'>最近 7 天</SelectItem>
                    <SelectItem value='all'>全部时间</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {retrievalForm.queryType !== "knowledge_base" && (
              <div className='grid grid-cols-2 gap-4'>
                <div className='space-y-2'>
                  <Label className='text-xs font-semibold text-slate-500 uppercase tracking-wider'>
                    关联员工 (可选)
                  </Label>
                  <Select
                    value={retrievalForm.queryEmployeeId}
                    onValueChange={(v: any) =>
                      setRetrievalForm({ ...retrievalForm, queryEmployeeId: v })
                    }
                  >
                    <SelectTrigger className='rounded-xl bg-slate-50 border-slate-200'>
                      <SelectValue placeholder='全部员工' />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value='all'>全部员工</SelectItem>
                      {allEmployees.map((emp) => (
                        <SelectItem
                          key={emp.id}
                          value={emp.id}
                        >
                          {emp.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className='space-y-2'>
                  <Label className='text-xs font-semibold text-slate-500 uppercase tracking-wider'>
                    状态/级别
                  </Label>
                  <Select
                    value={retrievalForm.queryFilter}
                    onValueChange={(v: any) =>
                      setRetrievalForm({ ...retrievalForm, queryFilter: v })
                    }
                  >
                    <SelectTrigger className='rounded-xl bg-slate-50 border-slate-200'>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value='all'>全部</SelectItem>
                      <SelectItem value='info'>信息 (Info)</SelectItem>
                      <SelectItem value='success'>成功 (Success)</SelectItem>
                      <SelectItem value='warning'>警告 (Warning)</SelectItem>
                      <SelectItem value='error'>错误 (Error)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}

            <div className='space-y-2'>
              <Label className='text-xs font-semibold text-slate-500 uppercase tracking-wider'>
                关键词搜索 (可选)
              </Label>
              <Input
                value={retrievalForm.queryKeyword}
                onChange={(e) =>
                  setRetrievalForm({
                    ...retrievalForm,
                    queryKeyword: e.target.value,
                  })
                }
                className='rounded-xl bg-slate-50 border-slate-200'
                placeholder='检索包含特定文字的内容...'
              />
            </div>

            <div className='flex items-center justify-between gap-4'>
              <div className='space-y-1.5'>
                <Label className='text-xs font-semibold text-slate-500 uppercase tracking-wider'>
                  检索限制
                </Label>
                <Input
                  type='number'
                  value={retrievalForm.queryLimit}
                  onChange={(e) =>
                    setRetrievalForm({
                      ...retrievalForm,
                      queryLimit: parseInt(e.target.value),
                    })
                  }
                  className='rounded-xl bg-slate-50 border-slate-200 w-24'
                />
              </div>

              {retrievalForm.queryType === "logs" && (
                <div className='flex items-center gap-2 mt-4'>
                  <input
                    type='checkbox'
                    id='includeProcessed'
                    checked={retrievalForm.queryIncludeProcessed}
                    onChange={(e) =>
                      setRetrievalForm({
                        ...retrievalForm,
                        queryIncludeProcessed: e.target.checked,
                      })
                    }
                    className='rounded border-slate-300 text-emerald-600 focus:ring-emerald-500'
                  />
                  <Label
                    htmlFor='includeProcessed'
                    className='text-sm text-slate-600 cursor-pointer'
                  >
                    包含已处理日志
                  </Label>
                </div>
              )}
            </div>

            {retrievalForm.queryType === "knowledge_base" && (
              <div className='space-y-2'>
                <Label className='text-xs font-semibold text-slate-500 uppercase tracking-wider'>
                  Embedding 模型
                </Label>
                <Select
                  value={(retrievalForm as any).embeddingModel || ""}
                  onValueChange={(v) =>
                    setRetrievalForm({
                      ...retrievalForm,
                      embeddingModel: v,
                    } as any)
                  }
                >
                  <SelectTrigger className='rounded-xl bg-slate-50 border-slate-200'>
                    <SelectValue placeholder='使用默认 Embedding 模型' />
                  </SelectTrigger>
                  <SelectContent>
                    {(models as any[])
                      .filter((m) => m.category === "embedding")
                      .map((m) => (
                        <SelectItem
                          key={m.id}
                          value={m.id}
                        >
                          {m.name} ({m.provider})
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <Button
              onClick={() => {
                onCreateNode("knowledge_retrieval", retrievalForm);
                setActiveDialog(null);
              }}
              className='w-full h-12 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-500/20 transition-all font-medium text-base active:scale-[0.98]'
            >
              添 加 节 点
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* AI 处理节点 (process / llm) */}
      <Dialog
        open={activeDialog === "process" || activeDialog === "llm"}
        onOpenChange={(open) => !open && setActiveDialog(null)}
      >
        <DialogContent className='sm:max-w-[440px] rounded-2xl p-0 overflow-hidden border-none shadow-2xl'>
          <div className='bg-gradient-to-r from-violet-600 to-purple-600 p-6 text-white'>
            <DialogHeader>
              <DialogTitle className='flex items-center gap-2 text-white text-xl'>
                <div className='bg-white/20 p-2 rounded-lg'>
                  <Bot className='w-5 h-5 text-white' />
                </div>
                {activeDialog === "llm" ? "LLM 调用" : "AI 处理"}
              </DialogTitle>
            </DialogHeader>
            <p className='text-violet-50/80 text-sm mt-2'>
              利用大语言模型进行文本生成、分析或数据处理
            </p>
          </div>

          <div className='p-6 space-y-5 bg-white dark:bg-slate-900'>
            <div className='space-y-2'>
              <Label className='text-xs font-semibold text-slate-500 uppercase tracking-wider'>
                节点名称
              </Label>
              <Input
                value={processForm.label}
                onChange={(e) =>
                  setProcessForm({ ...processForm, label: e.target.value })
                }
                className='rounded-xl bg-slate-50 border-slate-200 focus:ring-violet-500'
                placeholder='如：文本总结'
              />
            </div>

            <div className='space-y-2'>
              <Label className='text-xs font-semibold text-slate-500 uppercase tracking-wider'>
                选择模型
              </Label>
              <Select
                value={processForm.model}
                onValueChange={(v) =>
                  setProcessForm({ ...processForm, model: v })
                }
              >
                <SelectTrigger className='rounded-xl bg-slate-50 border-slate-200'>
                  <SelectValue placeholder='默认使用员工配置模型' />
                </SelectTrigger>
                <SelectContent>
                  {(models as any[])
                    .filter((m) => m.category === "chat")
                    .map((m) => (
                      <SelectItem
                        key={m.id}
                        value={m.id}
                      >
                        {m.name} ({m.provider})
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>

            <div className='space-y-2'>
              <Label className='text-xs font-semibold text-slate-500 uppercase tracking-wider'>
                提示词 (Prompt)
              </Label>
              <textarea
                className='flex min-h-[100px] w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm focus:ring-2 focus:ring-violet-500/20 transition-shadow'
                value={processForm.prompt}
                onChange={(e) =>
                  setProcessForm({ ...processForm, prompt: e.target.value })
                }
                placeholder='描述你需要 AI 执行的具体任务...'
              />
            </div>

            <div className='space-y-2'>
              <SchemaBuilder
                initialSchema={processForm.outputSchema}
                onChange={(schema) =>
                  setProcessForm({ ...processForm, outputSchema: schema })
                }
              />
            </div>

            <div className='grid grid-cols-2 gap-4'>
              <div className='space-y-2'>
                <Label className='text-xs font-semibold text-slate-500 uppercase tracking-wider'>
                  最大重试次数
                </Label>
                <Input
                  type='number'
                  min={0}
                  max={5}
                  value={processForm.retryCount}
                  onChange={(e) =>
                    setProcessForm({
                      ...processForm,
                      retryCount: parseInt(e.target.value) || 0,
                    })
                  }
                  className='rounded-xl bg-slate-50 border-slate-200'
                />
              </div>
              <div className='space-y-2'>
                <Label className='text-xs font-semibold text-slate-500 uppercase tracking-wider'>
                  超时时间 (ms)
                </Label>
                <Input
                  type='number'
                  min={1000}
                  step={1000}
                  value={processForm.timeout}
                  onChange={(e) =>
                    setProcessForm({
                      ...processForm,
                      timeout: parseInt(e.target.value) || 0,
                    })
                  }
                  className='rounded-xl bg-slate-50 border-slate-200'
                  placeholder='30000'
                />
              </div>
            </div>

            <Button
              onClick={() => {
                const nodeType = activeDialog === "llm" ? "llm" : "process";
                onCreateNode(nodeType, processForm);
                setActiveDialog(null);
              }}
              className='w-full h-12 rounded-xl bg-violet-600 hover:bg-violet-700 text-white shadow-lg shadow-violet-500/20 transition-all font-medium text-base active:scale-[0.98]'
            >
              确 定
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* 通知节点 */}
      <Dialog
        open={activeDialog === "notification"}
        onOpenChange={(open) => !open && setActiveDialog(null)}
      >
        <DialogContent className='sm:max-w-[440px] rounded-2xl p-0 overflow-hidden border-none shadow-2xl'>
          <div className='bg-gradient-to-r from-amber-500 to-orange-600 p-6 text-white'>
            <DialogHeader>
              <DialogTitle className='flex items-center gap-2 text-white text-xl'>
                <div className='bg-white/20 p-2 rounded-lg'>
                  <Bell className='w-5 h-5 text-white' />
                </div>
                发送通知
              </DialogTitle>
            </DialogHeader>
            <p className='text-amber-50/80 text-sm mt-2'>
              通过站内信或电子邮件发送工作流执行状态或结果
            </p>
          </div>

          <div className='p-6 space-y-5 bg-white dark:bg-slate-900'>
            <div className='grid grid-cols-2 gap-4'>
              <div className='space-y-2'>
                <Label className='text-xs font-semibold text-slate-500 uppercase tracking-wider'>
                  通知通道
                </Label>
                <Select
                  value={notificationForm.notificationType}
                  onValueChange={(v: any) =>
                    setNotificationForm({
                      ...notificationForm,
                      notificationType: v,
                    })
                  }
                >
                  <SelectTrigger className='rounded-xl bg-slate-50 border-slate-200'>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value='site'>站内消息</SelectItem>
                    <SelectItem value='email'>电子邮件</SelectItem>
                    <SelectItem value='both'>站内 + 邮件</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className='space-y-2'>
                <Label className='text-xs font-semibold text-slate-500 uppercase tracking-wider'>
                  节点名称
                </Label>
                <Input
                  value={notificationForm.label}
                  onChange={(e) =>
                    setNotificationForm({
                      ...notificationForm,
                      label: e.target.value,
                    })
                  }
                  className='rounded-xl bg-slate-50 border-slate-200'
                />
              </div>
            </div>

            <div className='space-y-2'>
              <Label className='text-xs font-semibold text-slate-500 uppercase tracking-wider'>
                通知标题
              </Label>
              <Input
                value={notificationForm.subject}
                onChange={(e) =>
                  setNotificationForm({
                    ...notificationForm,
                    subject: e.target.value,
                  })
                }
                className='rounded-xl bg-slate-50 border-slate-200'
                placeholder='请输入通知标题'
              />
            </div>

            <div className='space-y-2'>
              <Label className='text-xs font-semibold text-slate-500 uppercase tracking-wider'>
                通知内容
              </Label>
              <textarea
                className='flex min-h-[100px] w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm focus:ring-2 focus:ring-amber-500/20 transition-shadow'
                value={notificationForm.content}
                onChange={(e) =>
                  setNotificationForm({
                    ...notificationForm,
                    content: e.target.value,
                  })
                }
                placeholder='支持 {{nodeId}} 格式引用变量...'
              />
            </div>

            <Button
              onClick={() => {
                onCreateNode("notification", notificationForm);
                setActiveDialog(null);
              }}
              className='w-full h-12 rounded-xl bg-amber-600 hover:bg-amber-700 text-white shadow-lg shadow-amber-500/20 transition-all font-medium text-base active:scale-[0.98]'
            >
              确 定
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* 子员工节点 */}
      <Dialog
        open={activeDialog === "sub_employee"}
        onOpenChange={(open) => !open && setActiveDialog(null)}
      >
        <DialogContent className='sm:max-w-[440px] rounded-2xl p-0 overflow-hidden border-none shadow-2xl'>
          <div className='bg-gradient-to-r from-blue-600 to-cyan-600 p-6 text-white'>
            <DialogHeader>
              <DialogTitle className='flex items-center gap-2 text-white text-xl'>
                <div className='bg-white/20 p-2 rounded-lg'>
                  <Users className='w-5 h-5 text-white' />
                </div>
                委派给子员工
              </DialogTitle>
            </DialogHeader>
            <p className='text-blue-50/80 text-sm mt-2'>
              将任务分发给另一位 AI 员工处理，实现多代理协作
            </p>
          </div>

          <div className='p-6 space-y-5 bg-white dark:bg-slate-900'>
            <div className='space-y-2'>
              <Label className='text-xs font-semibold text-slate-500 uppercase tracking-wider'>
                选择目标员工
              </Label>
              <Select
                value={selectedSubEmpId}
                onValueChange={setSelectedSubEmpId}
              >
                <SelectTrigger className='rounded-xl bg-slate-50 border-slate-200'>
                  <SelectValue placeholder='请选择一位可用的 AI 员工' />
                </SelectTrigger>
                <SelectContent>
                  {availableSubEmployees.map((emp) => (
                    <SelectItem
                      key={emp.id}
                      value={emp.id}
                    >
                      <div className='flex items-center gap-2'>
                        <span className='w-2 h-2 rounded-full bg-emerald-500' />
                        {emp.name} ({emp.role})
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className='p-3 rounded-xl bg-blue-50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-900/20'>
              <p className='text-xs text-blue-700 dark:text-blue-400 leading-relaxed'>
                💡
                委派后，该员工将独立运行其预定义的工作流，并将最终结果返回给当前节点。
              </p>
            </div>

            <Button
              onClick={() => {
                if (!selectedSubEmpId) return;
                const emp = allEmployees.find((e) => e.id === selectedSubEmpId);
                if (!emp) return;
                onCreateNode("sub_employee", {
                  label: emp.name,
                  employeeName: emp.name,
                  employeeRole: emp.role,
                  linkedEmployeeId: emp.id,
                });
                setActiveDialog(null);
                setSelectedSubEmpId("");
              }}
              disabled={!selectedSubEmpId}
              className='w-full h-12 rounded-xl bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-500/20 transition-all font-medium text-base active:scale-[0.98]'
            >
              确 定
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* 条件判断节点 */}
      <Dialog
        open={activeDialog === "condition"}
        onOpenChange={(open) => !open && setActiveDialog(null)}
      >
        <DialogContent className='sm:max-w-[440px] rounded-2xl p-0 overflow-hidden border-none shadow-2xl'>
          <div className='bg-gradient-to-r from-yellow-500 to-amber-600 p-6 text-white'>
            <DialogHeader>
              <DialogTitle className='flex items-center gap-2 text-white text-xl'>
                <div className='bg-white/20 p-2 rounded-lg'>
                  <GitBranch className='w-5 h-5 text-white' />
                </div>
                条件判断
              </DialogTitle>
            </DialogHeader>
            <p className='text-yellow-50/80 text-sm mt-2'>
              基于逻辑规则将工作流引导至不同的执行路径
            </p>
          </div>

          <div className='p-6 space-y-5 bg-white dark:bg-slate-900'>
            <div className='space-y-2'>
              <Label className='text-xs font-semibold text-slate-500 uppercase tracking-wider'>
                节点名称
              </Label>
              <Input
                value={conditionForm.label}
                onChange={(e) =>
                  setConditionForm({
                    ...conditionForm,
                    label: e.target.value,
                  })
                }
                className='rounded-xl bg-slate-50 border-slate-200 focus:ring-yellow-500'
                placeholder='如：检查关键词'
              />
            </div>

            <div className='grid grid-cols-2 gap-4'>
              <div className='space-y-2'>
                <Label className='text-xs font-semibold text-slate-500 uppercase tracking-wider'>
                  判断类型
                </Label>
                <Select
                  value={conditionForm.conditionType}
                  onValueChange={(v) =>
                    setConditionForm({ ...conditionForm, conditionType: v })
                  }
                >
                  <SelectTrigger className='rounded-xl bg-slate-50 border-slate-200'>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value='contains'>包含</SelectItem>
                    <SelectItem value='equals'>等于</SelectItem>
                    <SelectItem value='not_empty'>非空</SelectItem>
                    <SelectItem value='regex'>正则匹配</SelectItem>
                    <SelectItem value='js_expression'>JS 表达式</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className='space-y-2'>
                <Label className='text-xs font-semibold text-slate-500 uppercase tracking-wider'>
                  判断目标内容
                </Label>
                <Input
                  value={conditionForm.conditionValue}
                  onChange={(e) =>
                    setConditionForm({
                      ...conditionForm,
                      conditionValue: e.target.value,
                    })
                  }
                  className='rounded-xl bg-slate-50 border-slate-200'
                  placeholder='目标值或正则表达式'
                />
              </div>
            </div>

            <div className='p-3 rounded-xl bg-amber-50 dark:bg-amber-900/10 border border-amber-100 dark:border-amber-900/20'>
              <p className='text-xs text-amber-700 dark:text-amber-400 leading-relaxed flex gap-2'>
                <span className='font-bold bg-amber-200 dark:bg-amber-800 px-1 rounded'>
                  TIP
                </span>{" "}
                条件节点有
                <strong>✓ True</strong> (左) 和 <strong>✗ False</strong> (右)
                两个输出端口，分别对应满足和不满足条件后的路径。
              </p>
            </div>

            <Button
              onClick={() => {
                onCreateNode("condition", conditionForm);
                setActiveDialog(null);
              }}
              className='w-full h-12 rounded-xl bg-yellow-600 hover:bg-yellow-700 text-white shadow-lg shadow-yellow-500/20 transition-all font-medium text-base active:scale-[0.98]'
            >
              确 定
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* HTTP 请求节点 */}
      <Dialog
        open={activeDialog === "http_request"}
        onOpenChange={(open) => !open && setActiveDialog(null)}
      >
        <DialogContent className='sm:max-w-[460px] rounded-2xl p-0 overflow-hidden border-none shadow-2xl'>
          <div className='bg-gradient-to-r from-cyan-600 to-blue-600 p-6 text-white'>
            <DialogHeader>
              <DialogTitle className='flex items-center gap-2 text-white text-xl'>
                <div className='bg-white/20 p-2 rounded-lg'>
                  <Globe className='w-5 h-5 text-white' />
                </div>
                HTTP 请求
              </DialogTitle>
            </DialogHeader>
            <p className='text-cyan-50/80 text-sm mt-2'>
              通过标准 HTTP 协议访问外部 API 或网络资源
            </p>
          </div>

          <div className='p-6 space-y-4 bg-white dark:bg-slate-900'>
            <div className='space-y-2'>
              <Label className='text-xs font-semibold text-slate-500 uppercase tracking-wider'>
                节点名称
              </Label>
              <Input
                value={httpForm.label}
                onChange={(e) =>
                  setHttpForm({ ...httpForm, label: e.target.value })
                }
                className='rounded-xl bg-slate-50 border-slate-200'
                placeholder='如：获取最新新闻'
              />
            </div>

            <div className='grid grid-cols-[100px_1fr] gap-3'>
              <div className='space-y-2'>
                <Label className='text-xs font-semibold text-slate-500 uppercase tracking-wider'>
                  方法
                </Label>
                <Select
                  value={httpForm.httpMethod}
                  onValueChange={(v) =>
                    setHttpForm({ ...httpForm, httpMethod: v })
                  }
                >
                  <SelectTrigger className='rounded-xl bg-slate-50 border-slate-200'>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value='GET'>GET</SelectItem>
                    <SelectItem value='POST'>POST</SelectItem>
                    <SelectItem value='PUT'>PUT</SelectItem>
                    <SelectItem value='DELETE'>DELETE</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className='space-y-2'>
                <Label className='text-xs font-semibold text-slate-500 uppercase tracking-wider'>
                  URL
                </Label>
                <Input
                  value={httpForm.httpUrl}
                  onChange={(e) =>
                    setHttpForm({ ...httpForm, httpUrl: e.target.value })
                  }
                  className='rounded-xl bg-slate-50 border-slate-200'
                  placeholder='https://api.example.com'
                />
              </div>
            </div>

            {httpForm.httpMethod !== "GET" && (
              <div className='space-y-2'>
                <Label className='text-xs font-semibold text-slate-500 uppercase tracking-wider'>
                  请求体 (JSON)
                </Label>
                <textarea
                  className='flex min-h-[80px] w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-[11px] font-mono text-emerald-400'
                  value={httpForm.httpBody}
                  onChange={(e) =>
                    setHttpForm({ ...httpForm, httpBody: e.target.value })
                  }
                  placeholder='{"key": "value"}'
                />
              </div>
            )}

            <Button
              onClick={() => {
                onCreateNode("http_request", httpForm);
                setActiveDialog(null);
              }}
              className='w-full h-12 rounded-xl bg-cyan-600 hover:bg-cyan-700 text-white shadow-lg shadow-cyan-500/20 transition-all font-medium text-base active:scale-[0.98]'
            >
              确 定
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* 代码执行节点 */}
      <Dialog
        open={activeDialog === "code"}
        onOpenChange={(open) => !open && setActiveDialog(null)}
      >
        <DialogContent className='sm:max-w-[480px] rounded-2xl p-0 overflow-hidden border-none shadow-2xl'>
          <div className='bg-gradient-to-r from-rose-600 to-pink-600 p-6 text-white'>
            <DialogHeader>
              <DialogTitle className='flex items-center gap-2 text-white text-xl'>
                <div className='bg-white/20 p-2 rounded-lg'>
                  <Code2 className='w-5 h-5 text-white' />
                </div>
                代码执行
              </DialogTitle>
            </DialogHeader>
            <p className='text-rose-50/80 text-sm mt-2'>
              编写 Python / JavaScript 脚本进行复杂的数据处理或逻辑转换
            </p>
          </div>

          <div className='p-6 space-y-5 bg-white dark:bg-slate-900'>
            <div className='space-y-2'>
              <Label className='text-xs font-semibold text-slate-500 uppercase tracking-wider'>
                节点名称
              </Label>
              <Input
                value={codeForm.label}
                onChange={(e) =>
                  setCodeForm({ ...codeForm, label: e.target.value })
                }
                className='rounded-xl bg-slate-50 border-slate-200'
                placeholder='如：计算平均值'
              />
            </div>

            <div className='flex flex-col gap-2 max-h-[160px] overflow-y-auto'>
              <Label className='text-xs font-semibold text-slate-500 uppercase tracking-wider flex justify-between items-center'>
                <span>输入变量 (Vars)</span>
                <Button
                  variant='ghost'
                  size='sm'
                  onClick={() => {
                    // Smart variable name: use common names, append _N for duplicates
                    const existingKeys = new Set(
                      codeForm.variables.map((v) => v.key),
                    );
                    const candidates = [
                      "arg",
                      "text",
                      "data",
                      "result",
                      "input",
                      "content",
                      "value",
                    ];
                    let newKey = "";
                    for (const name of candidates) {
                      if (!existingKeys.has(name)) {
                        newKey = name;
                        break;
                      }
                    }
                    if (!newKey) {
                      const baseName = "arg";
                      let suffix = 1;
                      while (existingKeys.has(`${baseName}_${suffix}`))
                        suffix++;
                      newKey = `${baseName}_${suffix}`;
                    }
                    setCodeForm({
                      ...codeForm,
                      variables: [
                        ...codeForm.variables,
                        { key: newKey, value: "" },
                      ],
                    });
                  }}
                  className='h-6 text-[10px] text-rose-500 hover:text-rose-600 hover:bg-rose-50'
                >
                  + 添加变量
                </Button>
              </Label>

              {codeForm.variables.length === 0 && (
                <div className='text-[10px] text-slate-400 text-center py-2 border border-dashed border-slate-200 rounded-lg'>
                  暂无变量，点击上方添加
                </div>
              )}

              {codeForm.variables.map((variable, index) => (
                <div
                  key={index}
                  className='grid grid-cols-[1fr_1.5fr_24px] gap-2 items-center'
                >
                  <Input
                    placeholder='变量名 (key)'
                    value={variable.key}
                    onChange={(e) => {
                      const newVars = [...codeForm.variables];
                      newVars[index].key = e.target.value;
                      setCodeForm({ ...codeForm, variables: newVars });
                    }}
                    className='h-8 text-xs rounded-lg'
                  />
                  <div className='relative'>
                    <Input
                      placeholder='值 (支持 {{node-id}})'
                      value={variable.value}
                      onChange={(e) => {
                        const newVars = [...codeForm.variables];
                        newVars[index].value = e.target.value;
                        setCodeForm({ ...codeForm, variables: newVars });
                      }}
                      className='h-8 text-xs rounded-lg pr-8'
                    />
                    <div className='absolute right-1 top-1/2 -translate-y-1/2 flex'>
                      <VariablePicker
                        onSelect={(v) => {
                          const newVars = [...codeForm.variables];
                          const newValue = `{{${v.value}}}`;
                          newVars[index].value = newValue;

                          // Auto-derive key if current key is empty or a default name
                          const currentKey = newVars[index].key;
                          const isDefaultKey =
                            !currentKey ||
                            /^(arg|text|data|result|input|content|value)(_\d+)?$/.test(
                              currentKey,
                            );
                          if (isDefaultKey) {
                            let derivedKey = v.value.includes(".")
                              ? v.value.split(".").pop() || currentKey
                              : v.label || "output";
                            // Ensure valid identifier
                            derivedKey =
                              derivedKey
                                .replace(/[^a-zA-Z0-9_$]/g, "_")
                                .replace(/^_+|_+$/g, "") || "output";
                            // Deduplicate
                            const otherKeys = new Set(
                              newVars
                                .filter((_, i) => i !== index)
                                .map((v) => v.key),
                            );
                            if (otherKeys.has(derivedKey)) {
                              let suffix = 1;
                              while (otherKeys.has(`${derivedKey}_${suffix}`))
                                suffix++;
                              derivedKey = `${derivedKey}_${suffix}`;
                            }
                            newVars[index].key = derivedKey;
                          }

                          setCodeForm({ ...codeForm, variables: newVars });
                        }}
                        upstreamVariables={[]} // Dialog might not have full context of upstream nodes easily without props drilling
                        // For now, we might need to pass upstreamVariables to NodeDialogs or just allow manual entry + basic system vars
                      />
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      const newVars = codeForm.variables.filter(
                        (_, i) => i !== index,
                      );
                      setCodeForm({ ...codeForm, variables: newVars });
                    }}
                    className='text-slate-400 hover:text-red-500 transition-colors'
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>

            <div className='space-y-2'>
              <Label className='text-xs font-semibold text-slate-500 uppercase tracking-wider'>
                JavaScript 代码
              </Label>
              <div className='min-h-[200px] rounded-xl border border-slate-800 bg-slate-950 overflow-hidden text-sm font-mono leading-relaxed relative group'>
                <SimpleCodeEditor
                  value={codeForm.codeContent}
                  onValueChange={(code: string) =>
                    setCodeForm({ ...codeForm, codeContent: code })
                  }
                  highlight={(code: string) =>
                    Prism.highlight(
                      code,
                      Prism.languages.javascript,
                      "javascript",
                    )
                  }
                  padding={16}
                  className='min-h-[200px] font-mono text-xs text-emerald-400'
                  textareaClassName='focus:outline-none'
                  style={{
                    fontFamily: '"Fira Code", "Fira Mono", monospace',
                    fontSize: 12,
                    backgroundColor: "#020617", // slate-950
                    color: "#34d399", // emerald-400
                  }}
                />
              </div>
            </div>

            <div className='p-3 rounded-xl bg-slate-900 border border-slate-800'>
              <p className='text-[10px] text-slate-400 font-mono leading-relaxed'>
                <span className='text-rose-400'>{"// 环境说明:"}</span>
                <br />
                <br />
                async function main({"{"} input, vars {"}"}) {"{"} ... {"}"}
                <br />
                <span className='text-blue-400'>return</span> 最终结果;
              </p>
            </div>

            <Button
              onClick={() => {
                // Convert array to record for storage
                const variablesRecord: Record<string, string> = {};
                codeForm.variables.forEach((v) => {
                  if (v.key) variablesRecord[v.key] = v.value;
                });

                onCreateNode("code", {
                  ...codeForm,
                  variables: variablesRecord,
                  codeLanguage: "javascript",
                });
                setActiveDialog(null);
              }}
              className='w-full h-12 rounded-xl bg-rose-600 hover:bg-rose-700 text-white shadow-lg shadow-rose-500/20 transition-all font-medium text-base active:scale-[0.98]'
            >
              确 定
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* 文本模板节点 (text_template / template_transform) */}
      <Dialog
        open={
          activeDialog === "text_template" ||
          activeDialog === "template_transform"
        }
        onOpenChange={(open) => !open && setActiveDialog(null)}
      >
        <DialogContent className='sm:max-w-[440px] rounded-2xl p-0 overflow-hidden border-none shadow-2xl'>
          <div className='bg-gradient-to-r from-indigo-600 to-violet-700 p-6 text-white'>
            <DialogHeader>
              <DialogTitle className='flex items-center gap-2 text-white text-xl'>
                <div className='bg-white/20 p-2 rounded-lg'>
                  <FileText className='w-5 h-5 text-white' />
                </div>
                文本模板
              </DialogTitle>
            </DialogHeader>
            <p className='text-indigo-50/80 text-sm mt-2'>
              使用插值语法引用前序节点结果，生成最终格式化文本
            </p>
          </div>

          <div className='p-6 space-y-5 bg-white dark:bg-slate-900'>
            <div className='space-y-2'>
              <Label className='text-xs font-semibold text-slate-500 uppercase tracking-wider'>
                节点名称
              </Label>
              <Input
                value={templateForm.label}
                onChange={(e) =>
                  setTemplateForm({
                    ...templateForm,
                    label: e.target.value,
                  })
                }
                className='rounded-xl bg-slate-50 border-slate-200'
                placeholder='如：日报内容模板'
              />
            </div>

            <div className='space-y-2'>
              <Label className='text-xs font-semibold text-slate-500 uppercase tracking-wider'>
                模板内容
              </Label>
              <textarea
                className='flex min-h-[120px] w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500/20 transition-shadow'
                value={templateForm.templateContent}
                onChange={(e) =>
                  setTemplateForm({
                    ...templateForm,
                    templateContent: e.target.value,
                  })
                }
                placeholder='在此输入模板内容...'
              />
            </div>

            <div className='p-3 rounded-xl bg-indigo-50 dark:bg-indigo-900/10 border border-indigo-100 dark:border-indigo-900/20'>
              <p className='text-[11px] text-indigo-700 dark:text-indigo-400 leading-relaxed font-medium'>
                💡 语法参考：
                <br />
                引用节点：
                <code className='bg-indigo-200/50 px-1 rounded'>{`{{node-id}}`}</code>
                <br />
                引用原始输入：
                <code className='bg-indigo-200/50 px-1 rounded'>{`{{input}}`}</code>
              </p>
            </div>

            <Button
              onClick={() => {
                const nodeType =
                  activeDialog === "template_transform"
                    ? "template_transform"
                    : "text_template";
                onCreateNode(nodeType, templateForm);
                setActiveDialog(null);
              }}
              className='w-full h-12 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-500/20 transition-all font-medium text-base active:scale-[0.98]'
            >
              确 定
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
