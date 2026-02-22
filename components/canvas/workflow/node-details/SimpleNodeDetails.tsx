import React from "react";
import { Node } from "@xyflow/react";

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
import { Save } from "lucide-react";
import { cn } from "@/lib/utils";
import { NodeDetailContentProps } from "./types";

// --- Start Node ---
export const StartDetails: React.FC<NodeDetailContentProps> = () => {
  return (
    <div className='p-4 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/30 rounded-xl text-xs text-emerald-700 dark:text-emerald-400 leading-relaxed'>
      <div className='font-semibold mb-1 flex items-center gap-2'>
        <div className='w-1.5 h-1.5 rounded-full bg-emerald-500'></div>
        用户输入触发
      </div>
      这是工作流的起点。当你在对话框中向员工发送消息时，该消息将作为此节点的输出传递给后续节点。
    </div>
  );
};

// --- Webhook Node ---
interface WebhookDetailsProps extends NodeDetailContentProps {
  nodeId: string;
}

export const WebhookDetails: React.FC<WebhookDetailsProps> = ({ nodeId }) => {
  return (
    <div className='space-y-4 font-sans'>
      <div className='p-4 bg-indigo-50 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/30 rounded-xl'>
        <div className='text-xs font-semibold text-indigo-700 dark:text-indigo-400 mb-2'>
          Webhook URL
        </div>
        <div className='p-2 bg-white dark:bg-slate-900 border border-indigo-200 dark:border-indigo-800 rounded-lg text-[10px] font-mono break-all line-clamp-2'>
          {`https://api.opc-bot.com/v1/webhooks/workflow/${nodeId}`}
        </div>
      </div>
      <div className='text-[11px] text-slate-500 leading-normal'>
        💡 提示：向此 URL 发送 POST
        请求即可触发工作流。请求体中的数据将作为该节点的输出。
      </div>
    </div>
  );
};

export const IterationDetails: React.FC<NodeDetailContentProps> = ({
  formData,
  handleChange,
  upstreamVariables = [],
}) => {
  return (
    <>
      <div className='space-y-2'>
        <Label>数组输入 / 迭代变量</Label>
        <Select
          value={formData.iterationVariable || ""}
          onValueChange={(v) => handleChange("iterationVariable", v)}
        >
          <SelectTrigger className='h-8 text-xs bg-white dark:bg-slate-950'>
            <SelectValue placeholder='选择列表变量或引用' />
          </SelectTrigger>
          <SelectContent>
            {upstreamVariables.map((v: any) => (
              <SelectItem
                key={v.value}
                value={v.value}
              >
                <span className='text-slate-500 mr-2'>[{v.group}]</span>
                {v.label}
              </SelectItem>
            ))}
            <SelectItem value='__input__'>[系统] 用户原始输入</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className='space-y-4 pt-2'>
        <div className='space-y-2'>
          <Label className='text-xs font-semibold'>处理模式</Label>
          <Select
            value={formData.processingMode || "sequential"}
            onValueChange={(v) => handleChange("processingMode", v)}
          >
            <SelectTrigger className='rounded-xl'>
              <SelectValue />
            </SelectTrigger>
            <SelectContent className='rounded-xl'>
              <SelectItem value='sequential'>
                <div className='flex flex-col'>
                  <span>顺序模式</span>
                  <span className='text-[10px] text-slate-500'>
                    逐一处理，支持流式结果
                  </span>
                </div>
              </SelectItem>
              <SelectItem value='parallel'>
                <div className='flex flex-col'>
                  <span>并行模式</span>
                  <span className='text-[10px] text-slate-500'>
                    并发处理，更快的执行速度
                  </span>
                </div>
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className='space-y-2'>
          <Label className='text-xs font-semibold'>错误处理</Label>
          <Select
            value={formData.errorHandling || "terminate"}
            onValueChange={(v) => handleChange("errorHandling", v)}
          >
            <SelectTrigger className='rounded-xl'>
              <SelectValue />
            </SelectTrigger>
            <SelectContent className='rounded-xl'>
              <SelectItem value='terminate'>终止 (出错时停止)</SelectItem>
              <SelectItem value='continue'>错误时继续 (输出 null)</SelectItem>
              <SelectItem value='remove_failed'>移除失败结果 (跳过)</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className='p-3 bg-teal-50 dark:bg-teal-950/20 border border-teal-100 dark:border-teal-900/30 rounded-xl text-xs text-teal-700 dark:text-teal-400 mt-4'>
        <div className='font-semibold mb-1 flex items-center gap-2'>
          <div className='w-1.5 h-1.5 rounded-full bg-teal-500'></div>
          内置变量说明
        </div>
        <div className='space-y-1 mt-2 text-[11px] opacity-90 leading-relaxed font-mono'>
          <div>
            • items[object]:{" "}
            <span className='font-sans'>当前处理的数组元素</span>
          </div>
          <div>
            • index[number]:{" "}
            <span className='font-sans'>当前迭代索引 (从0开始)</span>
          </div>
        </div>
      </div>
    </>
  );
};

// --- Loop Node ---
export const LoopDetails: React.FC<NodeDetailContentProps> = ({
  formData,
  handleChange,
}) => {
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
};

// --- Variable Assignment Node ---
export const VariableAssignmentDetails: React.FC<NodeDetailContentProps> = ({
  formData,
  handleChange,
}) => {
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
};

// --- Variable Aggregator Node ---
export const VariableAggregatorDetails: React.FC<NodeDetailContentProps> = ({
  formData,
  handleChange,
  upstreamNodeIds,
  nodes,
}) => {
  const availableNodes = nodes.filter((n: Node) =>
    upstreamNodeIds.includes(n.id),
  );

  return (
    <>
      <div className='space-y-3'>
        <Label className='text-sm font-semibold'>选择要聚合的变量节点</Label>
        <div className='space-y-2 max-h-[240px] overflow-y-auto p-1 pr-2'>
          {availableNodes.length > 0 ? (
            availableNodes.map((n: Node) => {
              const isSelected = (formData.aggregateVariables || []).includes(
                n.id,
              );
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
            <SelectItem value='concat'>换行拼接 (推荐用于长文本)</SelectItem>
            <SelectItem value='merge'>紧凑合并 (直接拼接)</SelectItem>
            <SelectItem value='array'>JSON 数组 (用于脚本处理)</SelectItem>
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
};

// --- List Operation Node ---
export const ListOperationDetails: React.FC<NodeDetailContentProps> = ({
  formData,
  handleChange,
}) => {
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
};

// --- Parameter Extractor Node ---
export const ParameterExtractorDetails: React.FC<NodeDetailContentProps> = ({
  formData,
  handleChange,
}) => {
  return (
    <>
      <div className='space-y-2'>
        <Label>提取提示词</Label>
        <Textarea
          value={formData.extractionPrompt || ""}
          onChange={(e) => handleChange("extractionPrompt", e.target.value)}
          placeholder='从用户输入中提取以下参数...'
          className='min-h-[80px]'
        />
      </div>
      <div className='space-y-2'>
        <Label>参数 Schema (JSON)</Label>
        <Textarea
          value={formData.parameterSchema || ""}
          onChange={(e) => handleChange("parameterSchema", e.target.value)}
          placeholder={'{ "name": "string", "age": "number" }'}
          className='min-h-[80px] font-mono'
        />
      </div>
    </>
  );
};

// --- Document Extractor Node ---
export const DocumentExtractorDetails: React.FC<NodeDetailContentProps> = ({
  formData,
  handleChange,
}) => {
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
          onChange={(e) => handleChange("extractionSchema", e.target.value)}
          placeholder='定义需要提取的字段...'
          className='min-h-[80px] font-mono'
        />
      </div>
    </>
  );
};

// --- Sub Workflow Node ---
export const SubWorkflowDetails: React.FC<NodeDetailContentProps> = ({
  formData,
  handleChange,
}) => {
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
};

// --- MCP Tool Node ---
export const McpToolDetails: React.FC<NodeDetailContentProps> = ({
  formData,
  handleChange,
}) => {
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
};

// --- Custom Tool / Tool Node ---
export const CustomToolDetails: React.FC<NodeDetailContentProps> = ({
  formData,
  handleChange,
}) => {
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
};

// --- Plugin Node ---
export const PluginDetails: React.FC<NodeDetailContentProps> = ({
  formData,
  handleChange,
}) => {
  return (
    <div className='space-y-2'>
      <Label>插件 ID</Label>
      <Input
        value={formData.toolId || ""}
        onChange={(e) => handleChange("toolId", e.target.value)}
        placeholder='已安装的插件标识符'
      />
      <div className='text-xs text-slate-500'>从已安装的插件列表中选择。</div>
    </div>
  );
};
