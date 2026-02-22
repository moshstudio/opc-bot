import React, { useState } from "react";
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
import {
  ChevronDown,
  ChevronRight,
  Settings2,
  Variable,
  Wrench,
  Brain,
  Zap,
  Info,
  Check,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { SchemaBuilder } from "../SchemaBuilder";
import { NodeDetailContentProps } from "./types";

/** 可供 Agent 使用的内置工具列表 */
const AVAILABLE_TOOLS = [
  {
    id: "get_employee_logs",
    name: "获取员工日志",
    description: "获取特定公司下未处理的员工工作日志",
    category: "数据",
  },
  {
    id: "send_site_notification",
    name: "发送站内通知",
    description: "向公司管理层发送站内通知消息",
    category: "通知",
  },
  {
    id: "send_email_notification",
    name: "发送邮件通知",
    description: "向公司的主要联系人发送电子邮件",
    category: "通知",
  },
  {
    id: "search_knowledge",
    name: "知识库搜索",
    description: "从知识库中搜索相关内容",
    category: "数据",
  },
];

export const AgentDetails: React.FC<NodeDetailContentProps> = ({
  formData,
  handleChange,
  upstreamVariables,
  models,
}) => {
  const [showAdvanced, setShowAdvanced] = useState(false);

  const selectedTools: string[] = formData.tools || [];

  const toggleTool = (toolId: string) => {
    const next = selectedTools.includes(toolId)
      ? selectedTools.filter((t: string) => t !== toolId)
      : [...selectedTools, toolId];
    handleChange("tools", next);
  };

  return (
    <div className='space-y-5'>
      {/* ===== Agent 策略 ===== */}
      <div className='space-y-2'>
        <Label className='text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1.5'>
          <Brain className='w-3.5 h-3.5' />
          Agent 策略
        </Label>
        <div className='grid grid-cols-2 gap-2'>
          {[
            {
              value: "function_calling",
              label: "函数调用",
              icon: Zap,
              desc: "使用模型原生函数调用能力",
            },
            {
              value: "react",
              label: "ReAct",
              icon: Brain,
              desc: "思维→行动→观察 循环",
            },
          ].map(({ value, label, icon: Icon, desc }) => {
            const isSelected =
              (formData.agentType || "function_calling") === value;
            return (
              <button
                key={value}
                type='button'
                onClick={() => handleChange("agentType", value)}
                className={cn(
                  "relative flex flex-col items-start gap-1.5 p-3 rounded-xl border-2 text-left transition-all duration-200",
                  isSelected
                    ? "border-violet-400 bg-violet-50 dark:bg-violet-950/30 shadow-sm"
                    : "border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 hover:border-slate-300 dark:hover:border-slate-700",
                )}
              >
                {isSelected && (
                  <div className='absolute top-2 right-2'>
                    <Check className='w-3.5 h-3.5 text-violet-500' />
                  </div>
                )}
                <div className='flex items-center gap-1.5'>
                  <Icon
                    className={cn(
                      "w-4 h-4",
                      isSelected ? "text-violet-500" : "text-slate-400",
                    )}
                  />
                  <span
                    className={cn(
                      "text-xs font-semibold",
                      isSelected
                        ? "text-violet-700 dark:text-violet-300"
                        : "text-slate-600 dark:text-slate-400",
                    )}
                  >
                    {label}
                  </span>
                </div>
                <span className='text-[10px] text-slate-400 leading-tight'>
                  {desc}
                </span>
              </button>
            );
          })}
        </div>
        <p className='text-[10px] text-slate-400'>
          函数调用适合 GPT-4、Claude 3.5 等支持 Function Calling 的模型。ReAct
          适合不支持原生函数调用的模型。
        </p>
      </div>

      {/* ===== 模型选择 ===== */}
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
        {formData.agentType === "function_calling" && (
          <p className='text-[10px] text-amber-500 flex items-center gap-1'>
            <Info className='w-3 h-3 shrink-0' />
            请确保所选模型支持 Function Calling 功能
          </p>
        )}
      </div>

      {/* ===== 指令 (Prompt) ===== */}
      <div className='space-y-2'>
        <Label>指令 (Prompt)</Label>
        <Textarea
          value={formData.prompt || ""}
          onChange={(e) => handleChange("prompt", e.target.value)}
          placeholder='定义 Agent 的角色、目标和上下文...'
          className='min-h-[120px] text-xs rounded-xl bg-white dark:bg-slate-950'
        />
        <p className='text-[10px] text-slate-500 bg-amber-50 dark:bg-amber-950/20 p-2 rounded-lg border border-amber-100 dark:border-amber-900/30 leading-relaxed mt-2'>
          💡 <strong>提示：</strong>{" "}
          系统会自动将上游节点的输出作为上下文串联。即使指令中未提及，模型也会参考上一步的结果。
        </p>
      </div>

      {/* ===== 输入变量 (Query) ===== */}
      <div className='space-y-2'>
        <Label className='text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1.5'>
          <Variable className='w-3.5 h-3.5' />
          查询输入 (Query)
        </Label>
        <Select
          value={formData.inputVariable || "__input__"}
          onValueChange={(v) => handleChange("inputVariable", v)}
        >
          <SelectTrigger className='rounded-xl bg-white dark:bg-slate-950'>
            <SelectValue placeholder='选择输入源' />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value='__input__'>
              <span className='text-slate-500 mr-1.5'>[系统]</span>
              用户原始输入
            </SelectItem>
            {upstreamVariables.map((v) => (
              <SelectItem
                key={v.value}
                value={v.value}
              >
                <span className='text-slate-500 mr-1.5'>[{v.group}]</span>
                {v.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className='text-[10px] text-slate-400'>
          指定 Agent 应该处理的输入内容，可以是用户原始消息或上游节点输出
        </p>
      </div>

      {/* ===== 工具配置 ===== */}
      <div className='space-y-3'>
        <Label className='text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1.5'>
          <Wrench className='w-3.5 h-3.5' />
          工具配置
        </Label>
        <p className='text-[10px] text-slate-400 -mt-1'>
          选择 Agent 可以使用的工具。清晰的工具描述可帮助 Agent 更好地决策。
        </p>
        <div className='space-y-2'>
          {AVAILABLE_TOOLS.map((tool) => {
            const isActive = selectedTools.includes(tool.id);
            return (
              <button
                key={tool.id}
                type='button'
                onClick={() => toggleTool(tool.id)}
                className={cn(
                  "w-full flex items-start gap-3 p-3 rounded-xl border text-left transition-all duration-200 group",
                  isActive
                    ? "border-violet-300 dark:border-violet-700 bg-violet-50/50 dark:bg-violet-950/20"
                    : "border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 hover:border-slate-300 dark:hover:border-slate-700",
                )}
              >
                <div
                  className={cn(
                    "mt-0.5 w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 transition-colors",
                    isActive
                      ? "border-violet-500 bg-violet-500"
                      : "border-slate-300 dark:border-slate-600 group-hover:border-slate-400",
                  )}
                >
                  {isActive && <Check className='w-2.5 h-2.5 text-white' />}
                </div>
                <div className='flex-1 min-w-0'>
                  <div className='flex items-center gap-2'>
                    <span
                      className={cn(
                        "text-xs font-medium",
                        isActive
                          ? "text-violet-700 dark:text-violet-300"
                          : "text-slate-700 dark:text-slate-300",
                      )}
                    >
                      {tool.name}
                    </span>
                    <span className='text-[9px] px-1.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400'>
                      {tool.category}
                    </span>
                  </div>
                  <p className='text-[10px] text-slate-400 mt-0.5 leading-tight'>
                    {tool.description}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
        <p className='text-[10px] text-slate-400'>
          已选择 {selectedTools.length} / {AVAILABLE_TOOLS.length} 个工具
        </p>
      </div>

      {/* ===== 最大迭代次数 ===== */}
      <div className='space-y-2'>
        <Label className='flex items-center gap-1.5'>
          最大迭代次数
          <span className='text-[10px] text-slate-400 font-normal'>
            (防止无限循环)
          </span>
        </Label>
        <Input
          type='number'
          min={1}
          max={25}
          value={formData.maxIterations || 5}
          onChange={(e) =>
            handleChange("maxIterations", parseInt(e.target.value) || 5)
          }
          className='rounded-xl h-9 text-xs bg-white dark:bg-slate-950 w-32'
        />
        <p className='text-[10px] text-slate-400'>
          简单任务建议 3-5 次，复杂研究任务建议 10-15 次
        </p>
      </div>

      {/* ===== 输出结构 ===== */}
      <div className='pt-2 border-t border-slate-100 dark:border-slate-800 mt-4'>
        <SchemaBuilder
          initialSchema={formData.outputSchema || ""}
          onChange={(schema: any) => handleChange("outputSchema", schema)}
        />
      </div>

      {/* ===== 高级设置 ===== */}
      <div className='border-t border-slate-100 dark:border-slate-800 pt-4'>
        <button
          onClick={() => setShowAdvanced(!showAdvanced)}
          className='flex items-center gap-2 text-xs font-semibold text-slate-500 uppercase tracking-wider hover:text-slate-700 dark:hover:text-slate-300 transition-colors w-full'
        >
          <Settings2 className='w-3.5 h-3.5' />
          高级设置
          {showAdvanced ? (
            <ChevronDown className='w-3.5 h-3.5 ml-auto' />
          ) : (
            <ChevronRight className='w-3.5 h-3.5 ml-auto' />
          )}
        </button>

        {showAdvanced && (
          <div className='mt-4 space-y-4 animate-in slide-in-from-top-2 duration-200'>
            {/* 记忆功能 */}
            <div className='space-y-3'>
              <Label className='text-xs text-slate-600 dark:text-slate-400'>
                对话记忆
              </Label>
              <div className='flex items-center gap-2 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800'>
                <input
                  type='checkbox'
                  id='agentMemory'
                  checked={formData.memory?.enabled || false}
                  onChange={(e) =>
                    handleChange("memory", {
                      ...formData.memory,
                      enabled: e.target.checked,
                    })
                  }
                  className='rounded border-slate-300 text-violet-600 focus:ring-violet-500'
                />
                <Label
                  htmlFor='agentMemory'
                  className='text-xs text-slate-600 dark:text-slate-400 cursor-pointer flex-1'
                >
                  启用上下文记忆 (TokenBufferMemory)
                </Label>
              </div>
              {formData.memory?.enabled && (
                <div className='space-y-2 pl-4 border-l-2 border-violet-200 dark:border-violet-800'>
                  <Label className='text-xs text-slate-600 dark:text-slate-400'>
                    记忆窗口大小
                  </Label>
                  <Input
                    type='number'
                    min={1}
                    max={50}
                    value={formData.memory?.window || 10}
                    onChange={(e) =>
                      handleChange("memory", {
                        ...formData.memory,
                        window: parseInt(e.target.value) || 10,
                      })
                    }
                    className='h-8 text-xs rounded-lg w-24 bg-white dark:bg-slate-950'
                  />
                  <p className='text-[10px] text-slate-400'>
                    保留最近的对话轮数，提供更多上下文但会增加 Token 消耗
                  </p>
                </div>
              )}
            </div>

            {/* 重试与超时 */}
            <div className='grid grid-cols-2 gap-3'>
              <div className='space-y-2'>
                <Label className='text-xs text-slate-600 dark:text-slate-400'>
                  最大重试次数
                </Label>
                <Input
                  type='number'
                  min={0}
                  max={5}
                  value={formData.retryCount || 0}
                  onChange={(e) =>
                    handleChange("retryCount", parseInt(e.target.value) || 0)
                  }
                  className='rounded-xl h-8 text-xs bg-white dark:bg-slate-950'
                />
              </div>
              <div className='space-y-2'>
                <Label className='text-xs text-slate-600 dark:text-slate-400'>
                  超时 (ms)
                </Label>
                <Input
                  type='number'
                  min={1000}
                  step={1000}
                  value={formData.timeout || 60000}
                  onChange={(e) =>
                    handleChange("timeout", parseInt(e.target.value) || 60000)
                  }
                  className='rounded-xl h-8 text-xs bg-white dark:bg-slate-950'
                  placeholder='60000'
                />
              </div>
            </div>
            <p className='text-[10px] text-slate-400'>
              Agent 由于多轮迭代，建议超时设置大于普通 LLM 节点（默认 60 秒）
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
