import React, { useState, useMemo, memo } from "react";
import { Node } from "@xyflow/react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { X, Trash2, Save, Zap, Bot } from "lucide-react";
import { useModelContext } from "@/components/ModelContext";
import { toast } from "sonner";
import { generateCron } from "@/lib/workflow/cron-utils";
import { cn } from "@/lib/utils";
import { getColorClasses, NODE_THEMES } from "./nodeTypeConfig";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

// Import decomposed node detail components
import {
  CronTriggerDetails,
  LlmDetails,
  SubEmployeeDetails,
  ConditionDetails,
  HttpRequestDetails,
  CodeDetails,
  TextTemplateDetails,
  NotificationDetails,
  KnowledgeRetrievalDetails,
  AgentDetails,
  QuestionClassifierDetails,
  StartDetails,
  WebhookDetails,
  IterationDetails,
  LoopDetails,
  VariableAssignmentDetails,
  VariableAggregatorDetails,
  ListOperationDetails,
  ParameterExtractorDetails,
  DocumentExtractorDetails,
  TransformDetails,
  LogicDetails,
  QuestionUnderstandingDetails,
  SubWorkflowDetails,
  McpToolDetails,
  CustomToolDetails,
  PluginDetails,
} from "./node-details";

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

export const NodeDetailsPanel = memo(
  ({
    node,
    nodes,
    edges,
    onUpdate,
    onDelete,
    onClose,
    allEmployees,
    lastTestInput,
  }: NodeDetailsPanelProps) => {
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

    const upstreamNodeIds = useMemo(
      () => getUpstreamNodeIds(node.id, edges),
      [node.id, edges],
    );

    const upstreamVariables = useMemo(() => {
      return nodes
        .filter((n) => upstreamNodeIds.includes(n.id))
        .flatMap((n) => {
          const vars: { label: string; value: string; group: string }[] = [];
          // 1. Add the node output itself
          vars.push({
            label: `节点输出 (Text/JSON)`,
            value: n.id,
            group: `${n.data.label || n.type || "Unknown Node"}`,
          });

          // 2. Parse Output Schema
          if (n.data.outputSchema) {
            try {
              const schema = JSON.parse(n.data.outputSchema as string);
              if (schema.properties) {
                Object.keys(schema.properties).forEach((key) => {
                  vars.push({
                    label: key,
                    value: `${n.id}.${key}`,
                    group: `${n.data.label || n.type || "Unknown Node"}`,
                  });
                });
              }
            } catch {}
          }
          return vars;
        });
    }, [nodes, upstreamNodeIds]);

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

      // Ensure code node has variables initialized if missing
      if (node.type === "code" && !newData.variables) {
        newData.variables = {}; // Default to empty object if undefined
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

    // Shared props for all node detail components
    const detailProps = {
      formData,
      setFormData,
      handleChange,
      upstreamVariables,
      upstreamNodeIds,
      nodes,
      allEmployees,
      models,
    };

    const renderContent = () => {
      switch (node.type) {
        case "cron_trigger":
          return <CronTriggerDetails {...detailProps} />;
        case "llm":
        case "process":
          return <LlmDetails {...detailProps} />;
        case "sub_employee":
          return <SubEmployeeDetails {...detailProps} />;
        case "condition":
          return <ConditionDetails {...detailProps} />;
        case "http_request":
          return <HttpRequestDetails {...detailProps} />;
        case "code":
          return <CodeDetails {...detailProps} />;
        case "template_transform":
        case "text_template":
          return <TextTemplateDetails {...detailProps} />;
        case "notification":
          return <NotificationDetails {...detailProps} />;
        case "knowledge_retrieval":
          return <KnowledgeRetrievalDetails {...detailProps} />;
        case "start":
          return <StartDetails {...detailProps} />;
        case "webhook":
          return (
            <WebhookDetails
              {...detailProps}
              nodeId={node.id}
            />
          );
        case "agent":
          return <AgentDetails {...detailProps} />;
        case "question_classifier":
          return <QuestionClassifierDetails {...detailProps} />;
        case "iteration":
          return <IterationDetails {...detailProps} />;
        case "loop":
          return <LoopDetails {...detailProps} />;
        case "variable_assignment":
          return <VariableAssignmentDetails {...detailProps} />;
        case "variable_aggregator":
          return <VariableAggregatorDetails {...detailProps} />;
        case "list_operation":
          return <ListOperationDetails {...detailProps} />;
        case "parameter_extractor":
          return <ParameterExtractorDetails {...detailProps} />;
        case "document_extractor":
          return <DocumentExtractorDetails {...detailProps} />;
        case "transform":
          return <TransformDetails {...detailProps} />;
        case "logic":
          return <LogicDetails {...detailProps} />;
        case "question_understanding":
          return <QuestionUnderstandingDetails {...detailProps} />;
        case "sub_workflow":
          return <SubWorkflowDetails {...detailProps} />;
        case "mcp_tool":
          return <McpToolDetails {...detailProps} />;
        case "custom_tool":
        case "tool_node":
          return <CustomToolDetails {...detailProps} />;
        case "plugin":
          return <PluginDetails {...detailProps} />;
        default:
          return null;
      }
    };

    /**
     * 格式化输出内容，支持 JSON 解析和美化，并进行截断
     */
    const renderOutput = (output: any) => {
      if (output === undefined || output === null) return "(无输出)";

      let data = output;
      if (typeof output === "string") {
        const trimmed = output.trim();
        if (
          (trimmed.startsWith("{") && trimmed.endsWith("}")) ||
          (trimmed.startsWith("[") && trimmed.endsWith("]"))
        ) {
          try {
            data = JSON.parse(output);
          } catch {
            // ignore
          }
        }
      }

      if (typeof data === "object") {
        try {
          const json = JSON.stringify(data, null, 2);
          if (json.length > 50000) {
            // 详情面板截断稍微严一点，毕竟空间小
            return json.substring(0, 50000) + "\n\n... (内容过多，已截断)";
          }
          return json;
        } catch {
          return "[无法序列化的对象]";
        }
      }

      const str = String(data);
      if (str.length > 50000) {
        return str.substring(0, 50000) + "\n\n... (内容过多，已截断)";
      }
      return str;
    };

    const nodeOutput = (node.data as any).output;
    const formattedNodeOutput = useMemo(
      () => renderOutput(nodeOutput),
      [nodeOutput],
    );

    const formattedNodeError = (node.data as any).error;

    return (
      <div className='absolute right-0 top-0 bottom-0 w-[480px] bg-white dark:bg-slate-950 border-l border-slate-200 dark:border-slate-800 shadow-2xl z-50 flex flex-col animate-in slide-in-from-right duration-200'>
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
          {(node.data as any).status &&
            (node.data as any).status !== "idle" && (
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
                {formattedNodeOutput && (
                  <div className='p-3 bg-white dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-lg text-[11px] font-mono break-all max-h-[150px] overflow-y-auto shadow-inner text-slate-700 dark:text-slate-300 whitespace-pre-wrap'>
                    {formattedNodeOutput}
                  </div>
                )}
                {formattedNodeError && (
                  <div className='text-[10px] text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/20 p-2 rounded-lg border border-rose-100 dark:border-rose-900/30'>
                    错误: {String(formattedNodeError)}
                  </div>
                )}
              </div>
            )}

          {/* Node Input (Inferred) */}
          {((node.data as any).status &&
            (node.data as any).status !== "idle") ||
          (["start", "cron_trigger", "webhook"].includes(node.type || "") &&
            lastTestInput) ? (
            <div className='p-4 rounded-xl border space-y-3 bg-slate-50 dark:bg-slate-900/50 border-slate-100 dark:border-slate-800'>
              <Label className='text-[10px] font-bold text-slate-500 uppercase tracking-wider'>
                输入数据 (Input)
              </Label>
              <div className='p-3 bg-white dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-lg text-[11px] font-mono break-all max-h-[150px] overflow-y-auto shadow-inner text-slate-700 dark:text-slate-300 whitespace-pre-wrap'>
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
                            <div>{renderOutput((n.data as any).output)}</div>
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
                <span className='text-[10px] text-slate-400'>
                  点击 ID 可复制
                </span>
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
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant='ghost'
                size='sm'
                className='flex-1 gap-2 rounded-xl h-9 text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/20'
              >
                <Trash2 size={14} />
                删除
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>确认删除？</AlertDialogTitle>
                <AlertDialogDescription>
                  确定要删除此节点吗？此操作不可逆。
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>取消</AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => onDelete(node.id)}
                  className='bg-red-600 hover:bg-red-700 text-white'
                >
                  确定删除
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
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
  },
);

NodeDetailsPanel.displayName = "NodeDetailsPanel";
