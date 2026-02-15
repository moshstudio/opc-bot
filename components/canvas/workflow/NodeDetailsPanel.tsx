import React, { useState } from "react";
import { Node } from "@xyflow/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { X, Trash2, Save, Zap, Bot } from "lucide-react";
import { useModelContext } from "@/components/ModelContext";
import { toast } from "sonner";
import { generateCron } from "@/lib/workflow/cron-utils";
import { CronConfigurator } from "./CronConfigurator";
import { cn } from "@/lib/utils";
import { getColorClasses, NODE_THEMES } from "./nodeTypeConfig";
import { SchemaBuilder } from "./SchemaBuilder";

interface NodeDetailsPanelProps {
  node: Node;
  nodes: Node[];
  edges: any[];
  onUpdate: (id: string, data: any) => void;
  onDelete: (id: string) => void;
  onClose: () => void;
  allEmployees: { id: string; name: string; role: string }[];
  lastTestInput?: string;
}

export function NodeDetailsPanel({
  node,
  nodes,
  edges,
  onUpdate,
  onDelete,
  onClose,
  allEmployees,
  lastTestInput,
}: NodeDetailsPanelProps) {
  const { models } = useModelContext();

  // 获取所有上游节点的 ID
  const getUpstreamNodeIds = (
    targetId: string,
    allEdges: any[],
    visited = new Set<string>(),
  ): string[] => {
    const upstreamIds = new Set<string>();
    const queue = [targetId];

    while (queue.length > 0) {
      const currentId = queue.shift()!;
      allEdges.forEach((edge) => {
        if (edge.target === currentId && !visited.has(edge.source)) {
          upstreamIds.add(edge.source);
          visited.add(edge.source);
          queue.push(edge.source);
        }
      });
    }
    return Array.from(upstreamIds);
  };

  const upstreamNodeIds = getUpstreamNodeIds(node.id, edges);

  const [formData, setFormData] = useState<any>(() => {
    const data = { ...node.data };
    if (
      node.type === "cron_trigger" &&
      !data.cron &&
      data.scheduleType !== "cron"
    ) {
      const generated = generateCron({
        frequency: (data.frequency as any) || "daily",
        time: (data.time as any) || "09:00",
        daysOfWeek: (data.daysOfWeek as any) || "1",
        daysOfMonth: (data.daysOfMonth as any) || "1",
        interval: (data.interval as any) || 1,
        minute: (data.minute as any) || 0,
      });
      data.cron = generated;
      data.cronExpression = generated;
    }
    return data;
  });
  const [prevData, setPrevData] = useState<any>(node.data);

  if (node.data !== prevData) {
    setPrevData(node.data);
    const newData = { ...node.data };
    if (
      node.type === "cron_trigger" &&
      !newData.cron &&
      newData.scheduleType !== "cron"
    ) {
      const generated = generateCron({
        frequency: (newData.frequency as any) || "daily",
        time: (newData.time as any) || "09:00",
        daysOfWeek: (newData.daysOfWeek as any) || "1",
        daysOfMonth: (newData.daysOfMonth as any) || "1",
        interval: (newData.interval as any) || 1,
        minute: (newData.minute as any) || 0,
      });
      newData.cron = generated;
      newData.cronExpression = generated;
    }
    setFormData(newData);
  }

  const handleChange = (key: string, value: any) => {
    setFormData((prev: any) => ({ ...prev, [key]: value }));
  };

  const handleSave = () => {
    onUpdate(node.id, formData);
    toast.success("节点设置已保存");
  };

  const renderContent = () => {
    switch (node.type) {
      case "cron_trigger":
        return (
          <div className='space-y-6'>
            <CronConfigurator
              data={formData}
              onChange={(updates) => setFormData({ ...formData, ...updates })}
            />

            <div className='p-4 bg-amber-50 dark:bg-amber-950/20 border border-amber-100 dark:border-amber-900/30 rounded-xl text-[11px] text-amber-700 dark:text-amber-400 leading-relaxed italic'>
              💡 定时触发器不产生输出变量，但会更新系统周期性变量{" "}
              <code className='bg-amber-100 dark:bg-amber-900/50 px-1 rounded font-mono'>
                sys.timestamp
              </code>
              。
            </div>
          </div>
        );
      case "llm":
      case "process":
        return (
          <>
            <div className='space-y-2'>
              <Label>模型</Label>
              <Select
                value={formData.model || ""}
                onValueChange={(v) => handleChange("model", v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder='选择模型' />
                </SelectTrigger>
                <SelectContent>
                  {models
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
              <Label>处理指令 (Prompt)</Label>
              <Textarea
                value={formData.prompt || ""}
                onChange={(e) => handleChange("prompt", e.target.value)}
                placeholder='描述处理逻辑...'
                className='min-h-[120px]'
              />
            </div>
            <div className='pt-2 border-t border-slate-100 dark:border-slate-800 mt-4'>
              <SchemaBuilder
                initialSchema={formData.outputSchema || ""}
                onChange={(schema: any) => handleChange("outputSchema", schema)}
              />
            </div>
            <div className='grid grid-cols-2 gap-4 pt-2 border-t border-slate-100 dark:border-slate-800 mt-4'>
              <div className='space-y-2'>
                <Label>最大重试次数</Label>
                <Input
                  type='number'
                  min={0}
                  max={5}
                  value={formData.retryCount || 0}
                  onChange={(e) =>
                    handleChange("retryCount", parseInt(e.target.value) || 0)
                  }
                  className='rounded-xl'
                />
              </div>
              <div className='space-y-2'>
                <Label>超时 (ms)</Label>
                <Input
                  type='number'
                  min={1000}
                  step={1000}
                  value={formData.timeout || 30000}
                  onChange={(e) =>
                    handleChange("timeout", parseInt(e.target.value) || 0)
                  }
                  className='rounded-xl'
                  placeholder='30000'
                />
              </div>
            </div>
          </>
        );
      case "sub_employee":
        return (
          <div className='space-y-2'>
            <Label>选择员工</Label>
            <Select
              value={formData.linkedEmployeeId || ""}
              onValueChange={(v) => {
                const emp = allEmployees.find((e) => e.id === v);
                if (emp) {
                  setFormData((prev: any) => ({
                    ...prev,
                    linkedEmployeeId: v,
                    employeeName: emp.name,
                    employeeRole: emp.role,
                    label: emp.name, // 更新 label
                  }));
                }
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder='选择员工' />
              </SelectTrigger>
              <SelectContent>
                {allEmployees.map((emp) => (
                  <SelectItem
                    key={emp.id}
                    value={emp.id}
                  >
                    {emp.name} ({emp.role})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        );
      case "condition":
        return (
          <>
            <div className='space-y-2'>
              <Label>判断类型</Label>
              <Select
                value={formData.conditionType || "contains"}
                onValueChange={(v) => handleChange("conditionType", v)}
              >
                <SelectTrigger>
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
              <Label>判断值</Label>
              <Input
                value={formData.conditionValue || ""}
                onChange={(e) => handleChange("conditionValue", e.target.value)}
                placeholder='输入目标值...'
              />
            </div>
          </>
        );
      case "http_request":
        return (
          <>
            <div className='grid grid-cols-[100px_1fr] gap-2'>
              <div className='space-y-2'>
                <Label>方法</Label>
                <Select
                  value={formData.httpMethod || "GET"}
                  onValueChange={(v) => handleChange("httpMethod", v)}
                >
                  <SelectTrigger>
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
                <Label>URL</Label>
                <Input
                  value={formData.httpUrl || ""}
                  onChange={(e) => handleChange("httpUrl", e.target.value)}
                  placeholder='https://api....'
                />
              </div>
            </div>
            {formData.httpMethod !== "GET" && (
              <div className='space-y-2'>
                <Label>请求体 (JSON)</Label>
                <Textarea
                  value={formData.httpBody || ""}
                  onChange={(e) => handleChange("httpBody", e.target.value)}
                  placeholder='{"key": "value"}'
                  className='min-h-[100px] font-mono'
                />
              </div>
            )}
          </>
        );
      case "code":
        return (
          <div className='space-y-2'>
            <Label>代码 (JavaScript)</Label>
            <Textarea
              value={formData.codeContent || ""}
              onChange={(e) => handleChange("codeContent", e.target.value)}
              className='min-h-[200px] font-mono bg-slate-950 text-emerald-400'
            />
          </div>
        );
      case "template_transform":
      case "text_template":
        return (
          <div className='space-y-2'>
            <Label>模板内容</Label>
            <Textarea
              value={formData.templateContent || ""}
              onChange={(e) => handleChange("templateContent", e.target.value)}
              className='min-h-[150px]'
              placeholder='{{input}}'
            />
          </div>
        );
      case "notification":
        return (
          <>
            <div className='space-y-2'>
              <Label>通知通道</Label>
              <Select
                value={formData.notificationType || "site"}
                onValueChange={(v) => handleChange("notificationType", v)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value='site'>系统内通知</SelectItem>
                  <SelectItem value='email'>邮件通知</SelectItem>
                  <SelectItem value='both'>全部发送</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className='space-y-2'>
              <Label>通知标题</Label>
              <Input
                value={formData.subject || ""}
                onChange={(e) => handleChange("subject", e.target.value)}
                placeholder='任务执行通知'
              />
            </div>
            <div className='space-y-2'>
              <Label>通知内容</Label>
              <Textarea
                value={formData.content || ""}
                onChange={(e) => handleChange("content", e.target.value)}
                placeholder='输入通知详情...'
                className='min-h-[100px]'
              />
            </div>
          </>
        );
      case "knowledge_retrieval":
        return (
          <div className='space-y-4'>
            <div className='space-y-2'>
              <Label className='text-xs font-semibold text-slate-500 uppercase'>
                数据源
              </Label>
              <Select
                value={formData.queryType || "logs"}
                onValueChange={(v: any) => handleChange("queryType", v)}
              >
                <SelectTrigger className='rounded-xl'>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value='logs'>员工日志 (Logs)</SelectItem>
                  <SelectItem value='notifications'>
                    站内通知 (Notifications)
                  </SelectItem>
                  <SelectItem value='execution_results'>
                    执行结果 (Results)
                  </SelectItem>
                  <SelectItem value='knowledge_base'>知识库 (RAG)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className='grid grid-cols-2 gap-3'>
              <div className='space-y-2'>
                <Label className='text-xs font-semibold text-slate-500 uppercase'>
                  时间范围
                </Label>
                <Select
                  value={formData.queryTimeRange || "24h"}
                  onValueChange={(v: any) => handleChange("queryTimeRange", v)}
                >
                  <SelectTrigger className='rounded-xl'>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value='1h'>最近 1 小时</SelectItem>
                    <SelectItem value='24h'>最近 24 小时</SelectItem>
                    <SelectItem value='7d'>最近 7 天</SelectItem>
                    <SelectItem value='30d'>最近 30 天</SelectItem>
                    <SelectItem value='all'>全部时间</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className='space-y-2'>
                <Label className='text-xs font-semibold text-slate-500 uppercase'>
                  检索限制
                </Label>
                <Input
                  type='number'
                  value={formData.queryLimit || formData.limit || 50}
                  onChange={(e) =>
                    handleChange("queryLimit", parseInt(e.target.value))
                  }
                  className='rounded-xl'
                />
              </div>
            </div>

            {formData.queryType !== "knowledge_base" && (
              <div className='space-y-2'>
                <Label className='text-xs font-semibold text-slate-500 uppercase'>
                  关联员工 (可选)
                </Label>
                <Select
                  value={formData.queryEmployeeId || "all"}
                  onValueChange={(v) => handleChange("queryEmployeeId", v)}
                >
                  <SelectTrigger className='rounded-xl'>
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
            )}

            {formData.queryType === "knowledge_base" && (
              <div className='space-y-2'>
                <Label className='text-xs font-semibold text-slate-500 uppercase tracking-wider'>
                  Embedding 模型
                </Label>
                <Select
                  value={formData.embeddingModel || ""}
                  onValueChange={(v) => handleChange("embeddingModel", v)}
                >
                  <SelectTrigger className='rounded-xl'>
                    <SelectValue placeholder='使用默认 Embedding 模型' />
                  </SelectTrigger>
                  <SelectContent>
                    {models
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

            <div className='space-y-2'>
              <Label className='text-xs font-semibold text-slate-500 uppercase'>
                关键词搜索 (可选)
              </Label>
              <Input
                value={formData.queryKeyword || ""}
                onChange={(e) => handleChange("queryKeyword", e.target.value)}
                placeholder='在此输入搜索关键词...'
                className='rounded-xl'
              />
            </div>

            {formData.queryType === "logs" && (
              <div className='flex items-center gap-2 p-2 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800'>
                <input
                  type='checkbox'
                  id='includeProcessed'
                  checked={formData.queryIncludeProcessed}
                  onChange={(e) =>
                    handleChange("queryIncludeProcessed", e.target.checked)
                  }
                  className='rounded border-slate-300 text-emerald-600 focus:ring-emerald-500'
                />
                <Label
                  htmlFor='includeProcessed'
                  className='text-xs text-slate-600 cursor-pointer'
                >
                  包含已处理的日志记录
                </Label>
              </div>
            )}
          </div>
        );
      case "start":
        return (
          <div className='p-4 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/30 rounded-xl text-xs text-emerald-700 dark:text-emerald-400 leading-relaxed'>
            <div className='font-semibold mb-1 flex items-center gap-2'>
              <div className='w-1.5 h-1.5 rounded-full bg-emerald-500'></div>
              用户输入触发
            </div>
            这是工作流的起点。当你在对话框中向员工发送消息时，该消息将作为此节点的输出传递给后续节点。
          </div>
        );
      case "webhook":
        return (
          <div className='space-y-4 font-sans'>
            <div className='p-4 bg-indigo-50 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/30 rounded-xl'>
              <div className='text-xs font-semibold text-indigo-700 dark:text-indigo-400 mb-2'>
                Webhook URL
              </div>
              <div className='p-2 bg-white dark:bg-slate-900 border border-indigo-200 dark:border-indigo-800 rounded-lg text-[10px] font-mono break-all line-clamp-2'>
                {`https://api.opc-bot.com/v1/webhooks/workflow/${node.id}`}
              </div>
            </div>
            <div className='text-[11px] text-slate-500 leading-normal'>
              💡 提示：向此 URL 发送 POST
              请求即可触发工作流。请求体中的数据将作为该节点的输出。
            </div>
          </div>
        );

      case "agent":
        return (
          <>
            <div className='space-y-2'>
              <Label>Agent 类型</Label>
              <Select
                value={formData.agentType || "react"}
                onValueChange={(v) => handleChange("agentType", v)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value='react'>ReAct Agent</SelectItem>
                  <SelectItem value='plan_execute'>Plan & Execute</SelectItem>
                  <SelectItem value='custom'>自定义</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className='space-y-2'>
              <Label>模型</Label>
              <Select
                value={formData.model || ""}
                onValueChange={(v) => handleChange("model", v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder='选择模型' />
                </SelectTrigger>
                <SelectContent>
                  {models
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
              <Label>系统提示词</Label>
              <Textarea
                value={formData.prompt || ""}
                onChange={(e) => handleChange("prompt", e.target.value)}
                placeholder='定义 Agent 的行为和目标...'
                className='min-h-[100px]'
              />
            </div>
          </>
        );
      case "question_classifier":
        return (
          <>
            <div className='space-y-2'>
              <Label>分类提示词</Label>
              <Textarea
                value={formData.classificationPrompt || ""}
                onChange={(e) =>
                  handleChange("classificationPrompt", e.target.value)
                }
                placeholder='描述分类规则...'
                className='min-h-[80px]'
              />
            </div>
            <div className='space-y-2'>
              <Label>类别列表 (每行一个)</Label>
              <Textarea
                value={(formData.categories || []).join("\n")}
                onChange={(e) =>
                  handleChange(
                    "categories",
                    e.target.value.split("\n").filter(Boolean),
                  )
                }
                placeholder={"咨询\n投诉\n建议"}
                className='min-h-[80px]'
              />
            </div>
          </>
        );
      case "iteration":
        return (
          <>
            <div className='space-y-2'>
              <Label>迭代变量</Label>
              <Input
                value={formData.iterationVariable || ""}
                onChange={(e) =>
                  handleChange("iterationVariable", e.target.value)
                }
                placeholder='输入列表变量名...'
              />
            </div>
            <div className='p-3 bg-teal-50 dark:bg-teal-950/20 border border-teal-100 dark:border-teal-900/30 rounded-lg text-xs text-teal-700 dark:text-teal-400'>
              迭代节点会对输入列表的每个元素执行后续子流程。
            </div>
          </>
        );
      case "loop":
        return (
          <>
            <div className='space-y-2'>
              <Label>最大循环次数</Label>
              <Input
                type='number'
                value={formData.maxIterations || 10}
                onChange={(e) =>
                  handleChange("maxIterations", parseInt(e.target.value))
                }
              />
            </div>
            <div className='space-y-2'>
              <Label>终止条件 (JS 表达式)</Label>
              <Input
                value={formData.loopCondition || ""}
                onChange={(e) => handleChange("loopCondition", e.target.value)}
                placeholder='e.g. input.length > 0'
              />
            </div>
          </>
        );
      case "variable_assignment":
        return (
          <>
            <div className='space-y-2'>
              <Label>变量名</Label>
              <Input
                value={formData.variableName || ""}
                onChange={(e) => handleChange("variableName", e.target.value)}
                placeholder='myVariable'
              />
            </div>
            <div className='space-y-2'>
              <Label>值 (支持 {"{{变量}}"} 插值)</Label>
              <Input
                value={formData.variableValue || ""}
                onChange={(e) => handleChange("variableValue", e.target.value)}
                placeholder='{{input}}'
              />
            </div>
          </>
        );
      case "variable_aggregator": {
        // Only show upstream nodes as they are reachable
        const availableNodes = nodes.filter((n: Node) =>
          upstreamNodeIds.includes(n.id),
        );

        return (
          <>
            <div className='space-y-3'>
              <Label className='text-sm font-semibold'>
                选择要聚合的变量节点
              </Label>
              <div className='space-y-2 max-h-[240px] overflow-y-auto p-1 pr-2'>
                {availableNodes.length > 0 ? (
                  availableNodes.map((n: Node) => {
                    const isSelected = (
                      formData.aggregateVariables || []
                    ).includes(n.id);
                    return (
                      <div
                        key={n.id}
                        onClick={() => {
                          const currentVars = formData.aggregateVariables || [];
                          const newVars = isSelected
                            ? currentVars.filter((v: string) => v !== n.id)
                            : [...currentVars, n.id];
                          handleChange("aggregateVariables", newVars);
                        }}
                        className={cn(
                          "group flex items-center justify-between p-3 rounded-xl border transition-all cursor-pointer",
                          isSelected
                            ? "bg-violet-50 dark:bg-violet-900/20 border-violet-200 dark:border-violet-800"
                            : "bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800 hover:border-violet-200 dark:hover:border-violet-800 hover:bg-slate-50 dark:hover:bg-slate-800/50",
                        )}
                      >
                        <div className='flex items-center gap-3'>
                          <div
                            className={cn(
                              "w-8 h-8 rounded-lg flex items-center justify-center transition-colors",
                              isSelected
                                ? "bg-violet-500 text-white"
                                : "bg-slate-100 dark:bg-slate-800 text-slate-400 group-hover:text-violet-500",
                            )}
                          >
                            <span className='text-[10px] font-bold uppercase'>
                              {(n.type || "N").charAt(0)}
                            </span>
                          </div>
                          <div className='flex flex-col'>
                            <span
                              className={cn(
                                "text-sm font-medium",
                                isSelected
                                  ? "text-violet-700 dark:text-violet-300"
                                  : "text-slate-700 dark:text-slate-300",
                              )}
                            >
                              {String(n.data.label || n.type)}
                            </span>
                            <span className='text-[10px] text-slate-400 font-mono'>
                              ID: {n.id.split("-")[0]}...
                            </span>
                          </div>
                        </div>
                        <div
                          className={cn(
                            "w-5 h-5 rounded-full border flex items-center justify-center transition-all",
                            isSelected
                              ? "bg-violet-500 border-violet-500 text-white shadow-sm"
                              : "border-slate-200 dark:border-slate-700",
                          )}
                        >
                          {isSelected && <Save className='w-3 h-3' />}
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className='text-center py-8 text-slate-400 text-sm italic'>
                    没有可用的上游节点
                  </div>
                )}
              </div>
            </div>

            <div className='space-y-2 mt-4'>
              <Label className='text-sm font-semibold'>聚合策略</Label>
              <Select
                value={formData.aggregateStrategy || "concat"}
                onValueChange={(v) => handleChange("aggregateStrategy", v)}
              >
                <SelectTrigger className='rounded-xl'>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className='rounded-xl'>
                  <SelectItem value='concat'>
                    换行拼接 (推荐用于长文本)
                  </SelectItem>
                  <SelectItem value='merge'>紧凑合并 (直接拼接)</SelectItem>
                  <SelectItem value='array'>
                    JSON 数组 (用于脚本处理)
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className='p-4 bg-violet-50 dark:bg-violet-900/10 border border-violet-100 dark:border-violet-900/20 rounded-xl mt-4'>
              <p className='text-[11px] text-violet-700 dark:text-violet-400 leading-relaxed italic'>
                💡 <strong>提示：</strong>
                变量聚合器会将所选节点的运行结果按照指定策略合并。当前已选择{" "}
                <span className='font-bold underline'>
                  {Number(formData.aggregateVariables?.length || 0)}
                </span>{" "}
                个节点。
              </p>
            </div>
          </>
        );
      }
      case "list_operation":
        return (
          <>
            <div className='space-y-2'>
              <Label>操作类型</Label>
              <Select
                value={formData.listOperationType || "filter"}
                onValueChange={(v) => handleChange("listOperationType", v)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value='filter'>筛选 (filter)</SelectItem>
                  <SelectItem value='map'>映射 (map)</SelectItem>
                  <SelectItem value='sort'>排序 (sort)</SelectItem>
                  <SelectItem value='slice'>切片 (slice)</SelectItem>
                  <SelectItem value='reduce'>归约 (reduce)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className='space-y-2'>
              <Label>表达式</Label>
              <Input
                value={formData.listExpression || ""}
                onChange={(e) => handleChange("listExpression", e.target.value)}
                placeholder='e.g. item.score > 0.5'
                className='font-mono'
              />
            </div>
          </>
        );
      case "parameter_extractor":
        return (
          <>
            <div className='space-y-2'>
              <Label>提取提示词</Label>
              <Textarea
                value={formData.extractionPrompt || ""}
                onChange={(e) =>
                  handleChange("extractionPrompt", e.target.value)
                }
                placeholder='从用户输入中提取以下参数...'
                className='min-h-[80px]'
              />
            </div>
            <div className='space-y-2'>
              <Label>参数 Schema (JSON)</Label>
              <Textarea
                value={formData.parameterSchema || ""}
                onChange={(e) =>
                  handleChange("parameterSchema", e.target.value)
                }
                placeholder={'{ "name": "string", "age": "number" }'}
                className='min-h-[80px] font-mono'
              />
            </div>
          </>
        );
      case "document_extractor":
        return (
          <>
            <div className='space-y-2'>
              <Label>文档来源</Label>
              <Input
                value={formData.documentSource || ""}
                onChange={(e) => handleChange("documentSource", e.target.value)}
                placeholder='URL 或变量引用'
              />
            </div>
            <div className='space-y-2'>
              <Label>提取 Schema (JSON)</Label>
              <Textarea
                value={formData.extractionSchema || ""}
                onChange={(e) =>
                  handleChange("extractionSchema", e.target.value)
                }
                placeholder='定义需要提取的字段...'
                className='min-h-[80px] font-mono'
              />
            </div>
          </>
        );
      case "transform":
        return (
          <>
            <div className='space-y-2'>
              <Label>转换类型</Label>
              <Select
                value={formData.transformType || "json"}
                onValueChange={(v) => handleChange("transformType", v)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value='json'>JSON 转换</SelectItem>
                  <SelectItem value='text'>文本转换</SelectItem>
                  <SelectItem value='number'>数值转换</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className='space-y-2'>
              <Label>转换表达式</Label>
              <Input
                value={formData.transformExpression || ""}
                onChange={(e) =>
                  handleChange("transformExpression", e.target.value)
                }
                placeholder='e.g. JSON.parse(input).data'
                className='font-mono'
              />
            </div>
          </>
        );
      case "logic":
        return (
          <>
            <div className='space-y-2'>
              <Label>逻辑类型</Label>
              <Select
                value={formData.logicType || "and"}
                onValueChange={(v) => handleChange("logicType", v)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value='and'>AND (与)</SelectItem>
                  <SelectItem value='or'>OR (或)</SelectItem>
                  <SelectItem value='not'>NOT (非)</SelectItem>
                  <SelectItem value='custom'>自定义表达式</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {formData.logicType === "custom" && (
              <div className='space-y-2'>
                <Label>表达式</Label>
                <Input
                  value={formData.logicExpression || ""}
                  onChange={(e) =>
                    handleChange("logicExpression", e.target.value)
                  }
                  placeholder='JavaScript 布尔表达式'
                  className='font-mono'
                />
              </div>
            )}
          </>
        );
      case "question_understanding":
        return (
          <>
            <div className='space-y-2'>
              <Label>改写策略</Label>
              <Select
                value={formData.rewriteStrategy || "clarify"}
                onValueChange={(v) => handleChange("rewriteStrategy", v)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value='clarify'>澄清意图</SelectItem>
                  <SelectItem value='expand'>扩展补全</SelectItem>
                  <SelectItem value='simplify'>简化精炼</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className='p-3 bg-blue-50 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/30 rounded-lg text-xs text-blue-700 dark:text-blue-400'>
              问题理解节点会对用户输入进行语义分析和改写，使后续节点更容易处理。
            </div>
          </>
        );
      case "sub_workflow":
        return (
          <div className='space-y-2'>
            <Label>工作流 ID</Label>
            <Input
              value={formData.workflowId || ""}
              onChange={(e) => handleChange("workflowId", e.target.value)}
              placeholder='输入要调用的工作流 ID'
            />
            <div className='text-xs text-slate-500'>
              将当前节点的输入传递给目标工作流执行。
            </div>
          </div>
        );
      case "mcp_tool":
        return (
          <>
            <div className='space-y-2'>
              <Label>MCP 服务器</Label>
              <Input
                value={formData.mcpServer || ""}
                onChange={(e) => handleChange("mcpServer", e.target.value)}
                placeholder='e.g. localhost:3001'
              />
            </div>
            <div className='space-y-2'>
              <Label>工具名称</Label>
              <Input
                value={formData.mcpTool || ""}
                onChange={(e) => handleChange("mcpTool", e.target.value)}
                placeholder='选择 MCP 工具'
              />
            </div>
          </>
        );
      case "custom_tool":
      case "tool_node":
        return (
          <>
            <div className='space-y-2'>
              <Label>工具 ID</Label>
              <Input
                value={formData.toolId || ""}
                onChange={(e) => handleChange("toolId", e.target.value)}
                placeholder='注册的工具标识符'
              />
            </div>
            <div className='space-y-2'>
              <Label>配置 (JSON)</Label>
              <Textarea
                value={formData.toolConfig || ""}
                onChange={(e) => handleChange("toolConfig", e.target.value)}
                placeholder='{"param": "value"}'
                className='min-h-[80px] font-mono'
              />
            </div>
          </>
        );
      case "plugin":
        return (
          <div className='space-y-2'>
            <Label>插件 ID</Label>
            <Input
              value={formData.toolId || ""}
              onChange={(e) => handleChange("toolId", e.target.value)}
              placeholder='已安装的插件标识符'
            />
            <div className='text-xs text-slate-500'>
              从已安装的插件列表中选择。
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className='absolute right-0 top-0 bottom-0 w-80 bg-white dark:bg-slate-950 border-l border-slate-200 dark:border-slate-800 shadow-2xl z-50 flex flex-col animate-in slide-in-from-right duration-200'>
      {/* Header */}
      <div className='p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/50'>
        <div className='flex items-center gap-3'>
          <div
            className={cn(
              "w-8 h-8 rounded-lg flex items-center justify-center text-white shadow-sm",
              getColorClasses(
                NODE_THEMES[node.type || "process"]?.color || "violet",
              ).topBar,
            )}
          >
            {React.createElement(
              NODE_THEMES[node.type || "process"]?.icon || Bot,
              { size: 16 },
            )}
          </div>
          <div className='overflow-hidden'>
            <h3 className='font-bold text-slate-900 dark:text-slate-100 text-sm truncate'>
              {String(node.data.label || "节点设置")}
            </h3>
            <p className='text-[10px] text-slate-400 font-mono truncate'>
              {node.id}
            </p>
          </div>
        </div>
        <Button
          variant='ghost'
          size='icon'
          onClick={onClose}
          className='w-8 h-8 rounded-full hover:bg-slate-200 dark:hover:bg-slate-800 shrink-0'
        >
          <X size={16} />
        </Button>
      </div>

      {/* Content */}
      <div className='flex-1 overflow-y-auto p-5 scrollbar-thin scrollbar-thumb-slate-200 dark:scrollbar-thumb-slate-800 space-y-6'>
        {/* Node Status & Results */}
        {(node.data as any).status && (node.data as any).status !== "idle" && (
          <div className='p-4 rounded-xl border space-y-3 bg-slate-50 dark:bg-slate-900/50 border-slate-100 dark:border-slate-800'>
            <div className='flex items-center justify-between'>
              <Label className='text-[10px] font-bold text-slate-500 uppercase tracking-wider'>
                最近执行结果
              </Label>
              <div
                className={cn(
                  "text-[10px] px-2 py-0.5 rounded-full font-bold uppercase",
                  (node.data as any).status === "success"
                    ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400"
                    : (node.data as any).status === "error"
                      ? "bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-400"
                      : "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400",
                )}
              >
                {(node.data as any).status === "success"
                  ? "成功"
                  : (node.data as any).status === "error"
                    ? "失败"
                    : "运行中"}
              </div>
            </div>
            {(node.data as any).output && (
              <div className='p-3 bg-white dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-lg text-[11px] font-mono break-all max-h-[150px] overflow-y-auto shadow-inner text-slate-700 dark:text-slate-300'>
                {typeof (node.data as any).output === "string"
                  ? (node.data as any).output
                  : JSON.stringify((node.data as any).output, null, 2)}
              </div>
            )}
            {(node.data as any).error && (
              <div className='text-[10px] text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/20 p-2 rounded-lg border border-rose-100 dark:border-rose-900/30'>
                错误: {String((node.data as any).error)}
              </div>
            )}
          </div>
        )}

        {/* Node Input (Inferred) */}
        {((node.data as any).status && (node.data as any).status !== "idle") ||
        (["start", "cron_trigger", "webhook"].includes(node.type || "") &&
          lastTestInput) ? (
          <div className='p-4 rounded-xl border space-y-3 bg-slate-50 dark:bg-slate-900/50 border-slate-100 dark:border-slate-800'>
            <Label className='text-[10px] font-bold text-slate-500 uppercase tracking-wider'>
              输入数据 (Input)
            </Label>
            <div className='p-3 bg-white dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-lg text-[11px] font-mono break-all max-h-[150px] overflow-y-auto shadow-inner text-slate-700 dark:text-slate-300'>
              {["start", "cron_trigger", "webhook"].includes(node.type || "")
                ? lastTestInput || "(无输入 - 手动触发)"
                : upstreamNodeIds.length > 0
                  ? nodes
                      .filter((n) => upstreamNodeIds.includes(n.id))
                      .map((n) => (
                        <div
                          key={n.id}
                          className='mb-2 last:mb-0 border-b last:border-0 border-slate-100 dark:border-slate-800 pb-2 last:pb-0'
                        >
                          <div className='text-[10px] text-slate-400 mb-1'>
                            来自: {String(n.data.label || n.type)}
                          </div>
                          <div>
                            {typeof (n.data as any).output === "object"
                              ? JSON.stringify((n.data as any).output, null, 2)
                              : String(
                                  (n.data as any).output !== undefined
                                    ? (n.data as any).output
                                    : "(等待执行)",
                                )}
                          </div>
                        </div>
                      ))
                  : "(无上游输入)"}
            </div>
          </div>
        ) : null}

        {/* Dynamic Config Form */}
        <div className='space-y-4'>{renderContent()}</div>

        {/* Variable Helper */}
        {(node.type === "llm" ||
          node.type === "process" ||
          node.type === "text_template" ||
          node.type === "template_transform" ||
          node.type === "notification" ||
          node.type === "variable_assignment") && (
          <div className='mt-8 pt-6 border-t border-slate-200 dark:border-slate-800 space-y-3'>
            <div className='flex items-center justify-between'>
              <Label className='text-xs font-bold text-slate-500 uppercase tracking-widest'>
                可用变量引用
              </Label>
              <span className='text-[10px] text-slate-400'>点击 ID 可复制</span>
            </div>
            <div className='grid gap-2'>
              <div
                className='flex items-center justify-between p-2 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 text-xs'
                title='用户最开始输入的文字'
              >
                <div className='flex items-center gap-2'>
                  <div className='w-4 h-4 rounded bg-emerald-500/10 flex items-center justify-center'>
                    <Zap className='w-3 h-3 text-emerald-600' />
                  </div>
                  <span className='font-medium text-slate-600 dark:text-slate-400'>
                    原始输入
                  </span>
                </div>
                <code
                  className='px-1.5 py-0.5 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded text-emerald-600 font-mono cursor-pointer hover:bg-emerald-50 transition-colors'
                  onClick={() => {
                    navigator.clipboard.writeText("{{input}}");
                    toast.success("已复制 {{input}}");
                  }}
                >
                  {"{{input}}"}
                </code>
              </div>

              {nodes
                .filter((n: Node) => upstreamNodeIds.includes(n.id))
                .map((n: Node) => (
                  <div
                    key={n.id}
                    className='flex items-center justify-between p-2 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 text-xs'
                  >
                    <div className='flex items-center gap-2 overflow-hidden'>
                      <div className='w-4 h-4 rounded bg-violet-500/10 flex items-center justify-center shrink-0'>
                        <span className='text-[8px] font-bold text-violet-600 uppercase'>
                          {(n.type || "N").charAt(0)}
                        </span>
                      </div>
                      <span className='font-medium text-slate-600 dark:text-slate-400 truncate'>
                        {String(n.data.label || n.type)}
                      </span>
                    </div>
                    <code
                      className='px-1.5 py-0.5 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded text-violet-600 font-mono cursor-pointer hover:bg-violet-50 transition-colors shrink-0'
                      onClick={() => {
                        navigator.clipboard.writeText(`{{${n.id}}}`);
                        toast.success(`已复制 {{${n.id}}}`);
                      }}
                    >
                      {`{{${n.id.split("-")[0]}...}}`}
                    </code>
                  </div>
                ))}
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className='p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex gap-2'>
        <Button
          variant='ghost'
          size='sm'
          className='flex-1 gap-2 rounded-xl h-9 text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/20'
          onClick={() => {
            if (confirm("确定要删除此节点吗？")) {
              onDelete(node.id);
            }
          }}
        >
          <Trash2 size={14} />
          删除
        </Button>
        <Button
          size='sm'
          className='flex-[2] gap-2 rounded-xl h-9 text-xs bg-violet-600 hover:bg-violet-700 text-white shadow-lg shadow-violet-500/20 font-bold'
          onClick={handleSave}
        >
          <Save size={14} />
          保存更改
        </Button>
      </div>
    </div>
  );
}
