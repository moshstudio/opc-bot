import React, { useState, useMemo, memo } from "react";
import { Node } from "@xyflow/react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { X, Trash2, Save, Bot, Sparkles, Loader2 } from "lucide-react";
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
import { Input } from "@/components/ui/input";

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
  parentNode?: Node;
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
    parentNode: propsParentNode,
  }: NodeDetailsPanelProps) => {
    const { models } = useModelContext();
    const [isGeneratingLabel, setIsGeneratingLabel] = useState(false);
    const [labelGenerationError, setLabelGenerationError] = useState<
      string | null
    >(null);
    const [isEditingLabel, setIsEditingLabel] = useState(false);

    const handleGenerateLabel = async (arg?: boolean | React.MouseEvent) => {
      // Prevent focus-out if this is called via button click
      if (arg && typeof arg !== "boolean") {
        arg.stopPropagation();
      }
      const silent = typeof arg === "boolean" ? arg : false;
      if (isGeneratingLabel) return null;
      if (!silent) {
        setIsGeneratingLabel(true);
        setLabelGenerationError(null);
      }

      try {
        const response = await fetch("/api/workflow/generate-label", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            nodeType: node.type,
            nodeData: formData,
          }),
        });

        const data = await response.json();
        if (data.label) {
          handleChange("label", data.label);
          if (!silent) {
            toast.success(`自动生成标签: ${data.label}`, {
              icon: <Sparkles className='w-4 h-4 text-violet-500' />,
            });
            setLabelGenerationError(null);
          }
          return data.label;
        } else if (data.error) {
          if (!silent) {
            const errorMsg = data.error.includes("未配置")
              ? "未配置模型"
              : "生成失败";
            setLabelGenerationError(errorMsg);
            toast.error(data.error);
          }
        }
      } catch (error) {
        console.error("Failed to generate label:", error);
        if (!silent) {
          setLabelGenerationError("生成失败");
          toast.error("生成标签时出错");
        }
      } finally {
        if (!silent) setIsGeneratingLabel(false);
      }
      return null;
    };

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
      const vars: {
        label: string;
        value: string;
        group: string;
        type?: string;
      }[] = [
        {
          label: "原始输入 (input)",
          value: "input",
          group: "全局变量",
        },
      ];

      // 1. Add current node's parent variables (Iteration/Loop context)
      const actualParentNode =
        propsParentNode || nodes.find((n) => n.id === node.parentId);

      if (actualParentNode) {
        if (actualParentNode.type === "iteration") {
          vars.push({
            label: "当前项 (item)",
            value: "input",
            group: "循环容器",
          });
        } else if (actualParentNode.type === "loop") {
          vars.push({
            label: "循环索引 (iterationIndex)",
            value: "iterationIndex",
            group: "循环容器",
          });
          // Add defined loop variables from parent
          const loopVars = (actualParentNode.data.loopVariables as any[]) || [];
          loopVars.forEach((v: any) => {
            vars.push({
              label: `变量: ${v.name}`,
              value: `state.${v.name}`,
              group: "循环局部变量",
              type: v.type,
            });
          });
        }
      }

      // 2. Add standard upstream nodes' variables
      const nodeVars = nodes
        .filter((n) => upstreamNodeIds.includes(n.id))
        .flatMap((n) => {
          const itemVars: {
            label: string;
            value: string;
            group: string;
            type?: string;
          }[] = [];

          // 1. Add the node output itself
          let nodeType: string | undefined = undefined;
          if (n.data.outputSchema) {
            try {
              const schema =
                typeof n.data.outputSchema === "string"
                  ? JSON.parse(n.data.outputSchema)
                  : n.data.outputSchema;
              if (schema.type) nodeType = schema.type;
            } catch {}
          }

          itemVars.push({
            label: `节点输出 (Output)`,
            value: n.id,
            group: `${n.data.label || n.type || "Unknown Node"}`,
            type: nodeType,
          });

          // 2. Parse Output Schema properties
          if (n.data.outputSchema) {
            try {
              const schema =
                typeof n.data.outputSchema === "string"
                  ? JSON.parse(n.data.outputSchema)
                  : n.data.outputSchema;
              if (schema.properties) {
                Object.keys(schema.properties).forEach((key) => {
                  itemVars.push({
                    label: key,
                    value: `${n.id}.${key}`,
                    group: `${n.data.label || n.type || "Unknown Node"}`,
                    type: schema.properties[key]?.type,
                  });
                });
              }
            } catch {}
          }
          return itemVars;
        });

      return [...vars, ...nodeVars];
    }, [nodes, upstreamNodeIds, node.parentId, propsParentNode]);

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

    const handleSave = async () => {
      const finalFormData = { ...formData };

      // 如果未填写 Label，尝试自动生成一个
      if (!formData.label) {
        const generated = await handleGenerateLabel(true);
        if (generated) {
          finalFormData.label = generated;
        }
      }

      onUpdate(node.id, finalFormData);
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

        case "sub_workflow":
          return <SubWorkflowDetails {...detailProps} />;
        case "mcp_tool":
          return <McpToolDetails {...detailProps} />;
        case "custom_tool":
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

    const nodeOutput = (node.data as any)?.output;
    const formattedNodeOutput = useMemo(
      () => renderOutput(nodeOutput),
      [nodeOutput],
    );

    const formattedNodeError = (node.data as any)?.error;

    return (
      <div className='absolute right-0 top-0 bottom-0 w-[480px] bg-white dark:bg-slate-950 border-l border-slate-200 dark:border-slate-800 shadow-2xl z-50 flex flex-col animate-in slide-in-from-right duration-200'>
        {/* Header */}
        <div className='p-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 space-y-4'>
          <div className='flex items-center justify-between'>
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
                <h3 className='font-bold text-slate-900 dark:text-slate-100 text-[10px] uppercase tracking-wider opacity-60'>
                  {NODE_THEMES[node.type || "process"]?.typeLabel || "节点"}{" "}
                  设置
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

          {/* Editable Label integrated with AI button - Click to Edit */}
          <div className='min-h-[32px]'>
            {isEditingLabel || isGeneratingLabel ? (
              <div className='relative animate-in fade-in zoom-in-95 duration-200'>
                <Input
                  autoFocus
                  value={formData.label || ""}
                  onChange={(e) => {
                    handleChange("label", e.target.value);
                    if (labelGenerationError) setLabelGenerationError(null);
                  }}
                  onBlur={() => !isGeneratingLabel && setIsEditingLabel(false)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") setIsEditingLabel(false);
                  }}
                  placeholder='输入节点标题...'
                  className='h-8 pl-3 pr-9 text-xs bg-white dark:bg-slate-950 rounded-lg border-violet-200 dark:border-violet-800 focus-visible:ring-violet-500 font-medium shadow-sm'
                />
                <Button
                  variant='ghost'
                  size='icon'
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={handleGenerateLabel}
                  disabled={isGeneratingLabel}
                  className='absolute right-0 top-0 w-8 h-8 rounded-lg text-violet-600 hover:text-violet-700 hover:bg-violet-50 dark:hover:bg-violet-900/30 transition-all'
                  title='AI 智能生成标题'
                >
                  {isGeneratingLabel ? (
                    <Loader2 className='w-3 h-3 animate-spin' />
                  ) : (
                    <Sparkles className='w-3 h-3' />
                  )}
                </Button>
              </div>
            ) : (
              <div
                onClick={() => setIsEditingLabel(true)}
                className='group flex items-center justify-between h-8 px-3 py-1.5 rounded-lg border border-transparent hover:border-slate-200 dark:hover:border-slate-800 hover:bg-white dark:hover:bg-slate-950 cursor-text transition-all'
              >
                <div className='flex items-center gap-2 overflow-hidden flex-1'>
                  {isGeneratingLabel ? (
                    <div className='flex items-center gap-1.5 animate-pulse'>
                      <Loader2 className='w-3 h-3 animate-spin text-violet-500' />
                      <span className='text-[11px] text-violet-500 font-medium'>
                        正在生成...
                      </span>
                    </div>
                  ) : labelGenerationError ? (
                    <span
                      className={cn(
                        "text-[11px] font-medium",
                        labelGenerationError === "未配置模型"
                          ? "text-amber-500"
                          : "text-rose-500",
                      )}
                    >
                      {labelGenerationError}
                    </span>
                  ) : formData.label ? (
                    <span className='text-xs font-semibold text-slate-700 dark:text-slate-200 truncate'>
                      {formData.label}
                    </span>
                  ) : (
                    <span className='text-[11px] text-slate-400 italic font-normal'>
                      未命名节点...
                    </span>
                  )}
                </div>
                <div className='opacity-0 group-hover:opacity-100 transition-opacity flex items-center shrink-0 ml-2'>
                  <Sparkles className='w-3 h-3 text-violet-400' />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Content */}
        <div className='flex-1 overflow-y-auto p-5 scrollbar-thin scrollbar-thumb-slate-200 dark:scrollbar-thumb-slate-800 space-y-6'>
          {/* Node Status & Results */}
          {(node?.data as any)?.status &&
            (node?.data as any)?.status !== "idle" && (
              <div className='p-4 rounded-xl border space-y-3 bg-slate-50 dark:bg-slate-900/50 border-slate-100 dark:border-slate-800'>
                <div className='flex items-center justify-between'>
                  <Label className='text-[10px] font-bold text-slate-500 uppercase tracking-wider'>
                    最近执行结果
                  </Label>
                  <div
                    className={cn(
                      "text-[10px] px-2 py-0.5 rounded-full font-bold uppercase",
                      (node?.data as any)?.status === "success"
                        ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400"
                        : (node?.data as any)?.status === "error"
                          ? "bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-400"
                          : "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400",
                    )}
                  >
                    {(node?.data as any)?.status === "success"
                      ? "成功"
                      : (node?.data as any)?.status === "error"
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
          {((node?.data as any)?.status &&
            (node?.data as any)?.status !== "idle") ||
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
                              来自: {String(n?.data?.label || n.type)}
                            </div>
                            <div>{renderOutput((n?.data as any)?.output)}</div>
                          </div>
                        ))
                    : "(无上游输入)"}
              </div>
            </div>
          ) : null}

          <div className='h-px bg-slate-100 dark:bg-slate-800' />

          {/* Dynamic Config Form */}
          <div className='space-y-4'>{renderContent()}</div>
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
