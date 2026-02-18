import React, { useState, useMemo, memo } from "react";
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
import { X, Trash2, Save, Zap, Bot, Plus, RefreshCw } from "lucide-react";
import { useModelContext } from "@/components/ModelContext";
import { toast } from "sonner";
import { generateCron } from "@/lib/workflow/cron-utils";
import { CronConfigurator } from "./CronConfigurator";
import { cn } from "@/lib/utils";
import { getColorClasses, NODE_THEMES } from "./nodeTypeConfig";
import { SchemaBuilder } from "./SchemaBuilder";
import SimpleCodeEditor from "react-simple-code-editor";
import Prism from "prismjs";
import "prismjs/components/prism-javascript";
import "prismjs/components/prism-python";
import "prismjs/themes/prism-dark.css"; // Or another theme
import { VariablePicker } from "./VariablePicker"; // We will create this component

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
                  onChange={(schema: any) =>
                    handleChange("outputSchema", schema)
                  }
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
            <div className='space-y-4'>
              <div className='space-y-2'>
                <Label>逻辑关系</Label>
                <div className='flex items-center gap-2 p-1 bg-slate-100 dark:bg-slate-800 rounded-lg w-fit'>
                  <Button
                    variant={
                      (formData.logicalOperator || "AND") === "AND"
                        ? "default"
                        : "ghost"
                    }
                    size='sm'
                    onClick={() => handleChange("logicalOperator", "AND")}
                    className='h-7 text-xs'
                  >
                    满足所有 (AND)
                  </Button>
                  <Button
                    variant={
                      formData.logicalOperator === "OR" ? "default" : "ghost"
                    }
                    size='sm'
                    onClick={() => handleChange("logicalOperator", "OR")}
                    className='h-7 text-xs'
                  >
                    满足任意 (OR)
                  </Button>
                </div>
              </div>

              <div className='space-y-3'>
                <Label>条件列表</Label>
                {(formData.conditions || []).map(
                  (condition: any, index: number) => (
                    <div
                      key={condition.id || index}
                      className='p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl space-y-2 group'
                    >
                      <div className='flex items-center justify-between gap-2'>
                        <div className='flex-1'>
                          <Label className='text-[10px] text-slate-500 uppercase'>
                            变量
                          </Label>
                          <Select
                            value={condition.variable || ""}
                            onValueChange={(v) => {
                              const newConditions = [
                                ...(formData.conditions || []),
                              ];
                              newConditions[index] = {
                                ...newConditions[index],
                                variable: v,
                              };
                              handleChange("conditions", newConditions);
                            }}
                          >
                            <SelectTrigger className='h-8 text-xs bg-white dark:bg-slate-950'>
                              <SelectValue placeholder='选择变量' />
                            </SelectTrigger>
                            <SelectContent>
                              {upstreamVariables.map((v) => (
                                <SelectItem
                                  key={v.value}
                                  value={v.value}
                                >
                                  <span className='text-slate-500 mr-2'>
                                    [{v.group}]
                                  </span>
                                  {v.label}
                                </SelectItem>
                              ))}
                              <SelectItem value='__input__'>
                                [系统] 用户原始输入
                              </SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <Button
                          variant='ghost'
                          size='icon'
                          onClick={() => {
                            const newConditions = (
                              formData.conditions || []
                            ).filter((_: any, i: number) => i !== index);
                            handleChange("conditions", newConditions);
                          }}
                          className='h-6 w-6 text-slate-400 hover:text-rose-500 mt-4'
                        >
                          <Trash2 className='w-3 h-3' />
                        </Button>
                      </div>

                      <div className='flex gap-2'>
                        <div className='w-[110px]'>
                          <Select
                            value={condition.operator || "contains"}
                            onValueChange={(v) => {
                              const newConditions = [
                                ...(formData.conditions || []),
                              ];
                              newConditions[index] = {
                                ...newConditions[index],
                                operator: v,
                              };
                              handleChange("conditions", newConditions);
                            }}
                          >
                            <SelectTrigger className='h-8 text-xs bg-white dark:bg-slate-950'>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value='contains'>包含</SelectItem>
                              <SelectItem value='not_contains'>
                                不包含
                              </SelectItem>
                              <SelectItem value='equals'>等于</SelectItem>
                              <SelectItem value='not_equals'>不等于</SelectItem>
                              <SelectItem value='start_with'>开始于</SelectItem>
                              <SelectItem value='end_with'>结束于</SelectItem>
                              <SelectItem value='is_empty'>为空</SelectItem>
                              <SelectItem value='not_empty'>不为空</SelectItem>
                              <SelectItem value='gt'>大于</SelectItem>
                              <SelectItem value='gte'>大于等于</SelectItem>
                              <SelectItem value='lt'>小于</SelectItem>
                              <SelectItem value='lte'>小于等于</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className='flex-1'>
                          {[
                            "is_empty",
                            "not_empty",
                            "is_null",
                            "not_null",
                          ].includes(condition.operator) ? (
                            <div className='h-8 flex items-center px-2 text-xs text-slate-400 bg-slate-100 dark:bg-slate-800 rounded border border-transparent'>
                              无需输入值
                            </div>
                          ) : (
                            <Input
                              value={condition.value || ""}
                              onChange={(e) => {
                                const newConditions = [
                                  ...(formData.conditions || []),
                                ];
                                newConditions[index] = {
                                  ...newConditions[index],
                                  value: e.target.value,
                                };
                                handleChange("conditions", newConditions);
                              }}
                              className='h-8 text-xs bg-white dark:bg-slate-950'
                              placeholder='对比值'
                            />
                          )}
                        </div>
                      </div>
                    </div>
                  ),
                )}
                <Button
                  variant='outline'
                  size='sm'
                  onClick={() => {
                    const newConditions = [
                      ...(formData.conditions || []),
                      {
                        id: Math.random().toString(36).substr(2, 9),
                        variable: "",
                        operator: "contains",
                        value: "",
                      },
                    ];
                    handleChange("conditions", newConditions);
                  }}
                  className='w-full border-dashed'
                >
                  <Plus className='w-3 h-3 mr-2' />
                  添加条件
                </Button>
              </div>

              {/* Backward Compatibility or Quick Mode */}
              {(!formData.conditions || formData.conditions.length === 0) &&
                formData.conditionType && (
                  <div className='p-3 bg-amber-50 dark:bg-amber-900/20 text-xs text-amber-700 dark:text-amber-400 rounded-lg'>
                    检测到旧版配置。添加新条件将自动升级数据结构。
                  </div>
                )}
            </div>
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
              {(formData.httpMethod || "GET") !== "GET" && (
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
        case "code": {
          const variables = formData.variables || {};
          const variableList = Object.entries(variables).map(([k, v]) => ({
            key: k,
            value: v as string,
          }));
          const codeLanguage = formData.codeLanguage || "javascript";
          const outputVariables = formData.outputVariables || [
            { name: "result", type: "string" },
          ];

          // Get correct code content key based on language
          const codeKey =
            codeLanguage === "python" ? "codeContentPython" : "codeContent";
          const currentCode =
            formData[codeKey] ||
            (codeLanguage === "python"
              ? `def main(input: str, vars: dict) -> dict:\n    result = input.upper()\n    return {\n        "result": result,\n    }`
              : `async function main({ input, vars }) {\n  const result = input.toUpperCase();\n  return {\n    result: result,\n  };\n}`);

          return (
            <div className='space-y-5'>
              {/* 0. Language Tabs */}
              <div className='flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-lg w-fit'>
                <button
                  onClick={() => handleChange("codeLanguage", "python")}
                  className={cn(
                    "px-3 py-1.5 rounded-md text-xs font-medium transition-all",
                    codeLanguage === "python"
                      ? "bg-white dark:bg-slate-900 text-rose-600 dark:text-rose-400 shadow-sm"
                      : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300",
                  )}
                >
                  🐍 Python
                </button>
                <button
                  onClick={() => handleChange("codeLanguage", "javascript")}
                  className={cn(
                    "px-3 py-1.5 rounded-md text-xs font-medium transition-all",
                    codeLanguage === "javascript"
                      ? "bg-white dark:bg-slate-900 text-rose-600 dark:text-rose-400 shadow-sm"
                      : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300",
                  )}
                >
                  ⚡ JavaScript
                </button>
              </div>

              {/* 1. Input Variables */}
              <div className='flex flex-col gap-2'>
                <div className='flex items-center justify-between'>
                  <Label className='text-xs font-semibold text-slate-500 uppercase tracking-wider'>
                    输入变量
                  </Label>
                  <Button
                    variant='ghost'
                    size='sm'
                    onClick={() => {
                      // Smart variable name generation:
                      // 1. Collect candidate names from upstream outputs
                      const existingKeys = new Set(Object.keys(variables));
                      const candidates: string[] = [];

                      // Gather upstream schema field names and node labels
                      for (const uv of upstreamVariables) {
                        if (uv.value.includes(".")) {
                          // Schema field like "node-id.text" → extract "text"
                          const field = uv.value.split(".").pop() || "";
                          if (
                            field &&
                            /^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(field)
                          ) {
                            candidates.push(field);
                          }
                        } else {
                          // Node output → derive name from label
                          const label = uv.label
                            .replace(/[^a-zA-Z0-9\u4e00-\u9fff_\s]/g, "")
                            .trim();
                          // Try common output names first
                          if (!candidates.includes("text"))
                            candidates.push("text");
                          if (!candidates.includes("result"))
                            candidates.push("result");
                          // Convert Chinese/mixed label to safe identifier
                          const safeName = label
                            .replace(/[\u4e00-\u9fff]+/g, (m: string) => {
                              const map: Record<string, string> = {
                                "\u8f93\u51fa": "output",
                                "\u7ed3\u679c": "result",
                                "\u6587\u672c": "text",
                                "\u5185\u5bb9": "content",
                                "\u6570\u636e": "data",
                                "\u6d88\u606f": "message",
                                "\u56de\u590d": "reply",
                                "\u6458\u8981": "summary",
                                "\u5206\u6790": "analysis",
                                "\u62a5\u544a": "report",
                                "\u4fe1\u606f": "info",
                                "\u5217\u8868": "list",
                              };
                              return map[m] || "var";
                            })
                            .replace(/\s+/g, "_")
                            .replace(/_{2,}/g, "_")
                            .replace(/^_|_$/g, "")
                            .toLowerCase();
                          if (
                            safeName &&
                            /^[a-zA-Z_$]/.test(safeName) &&
                            !candidates.includes(safeName)
                          ) {
                            candidates.push(safeName);
                          }
                        }
                      }

                      // Fallback candidates
                      if (candidates.length === 0) {
                        candidates.push(
                          "arg",
                          "text",
                          "input",
                          "data",
                          "result",
                        );
                      }

                      // 2. Pick the first candidate not already used, with _N suffix for dupes
                      let newKey = "";
                      for (const name of candidates) {
                        if (!existingKeys.has(name)) {
                          newKey = name;
                          break;
                        }
                      }
                      if (!newKey) {
                        // All candidates taken, append suffix
                        const baseName = candidates[0] || "arg";
                        let suffix = 1;
                        while (existingKeys.has(`${baseName}_${suffix}`)) {
                          suffix++;
                        }
                        newKey = `${baseName}_${suffix}`;
                      }

                      const newVars = { ...variables, [newKey]: "" };
                      handleChange("variables", newVars);
                    }}
                    className='h-6 text-[10px] text-rose-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/20'
                  >
                    <Plus className='w-3 h-3 mr-1' />
                    添加
                  </Button>
                </div>

                {variableList.length === 0 && (
                  <div className='text-[10px] text-slate-400 text-center py-3 border border-dashed border-slate-200 dark:border-slate-800 rounded-lg'>
                    暂无输入变量 — 在代码中通过{" "}
                    <code className='px-1 py-0.5 bg-slate-100 dark:bg-slate-800 rounded text-rose-500'>
                      vars.变量名
                    </code>{" "}
                    引用
                  </div>
                )}

                <div className='flex flex-col gap-2 max-h-[160px] overflow-y-auto pr-1'>
                  {variableList.map(({ key, value }, index) => (
                    <div
                      key={index}
                      className='grid grid-cols-[1fr_1.5fr_24px] gap-1.5 items-center'
                    >
                      <Input
                        placeholder='变量名'
                        value={key}
                        onChange={(e) => {
                          const newKey = e.target.value;
                          const newVars = { ...variables };
                          delete newVars[key];
                          newVars[newKey] = value;
                          handleChange("variables", newVars);
                        }}
                        className='h-7 text-xs rounded-lg bg-white dark:bg-slate-950 px-2 font-mono'
                      />
                      <div className='relative'>
                        <Input
                          placeholder='值 / {{node-id}}'
                          value={value}
                          onChange={(e) => {
                            const newVars = { ...variables };
                            newVars[key] = e.target.value;
                            handleChange("variables", newVars);
                          }}
                          className='h-7 text-xs rounded-lg bg-white dark:bg-slate-950 px-2 pr-7'
                        />
                        <div className='absolute right-1 top-1/2 -translate-y-1/2 flex'>
                          <VariablePicker
                            onSelect={(v: { value: string; label: string }) => {
                              const newVars = { ...variables };
                              // Set the value
                              const newValue = `{{${v.value}}}`;

                              // Auto-derive key name from the selected variable
                              let derivedKey = key; // keep current key as fallback
                              const isDefaultKey =
                                !key ||
                                /^(arg|text|data|result|input|content|value)(_\d+)?$/.test(
                                  key,
                                ) ||
                                /^var_/.test(key);

                              if (isDefaultKey) {
                                if (v.value.includes(".")) {
                                  // e.g. "node-6.hasNotableItems" → "hasNotableItems"
                                  derivedKey = v.value.split(".").pop() || key;
                                } else {
                                  // Pure node ID → use label to derive
                                  const safeName =
                                    v.label
                                      .replace(
                                        /[^a-zA-Z0-9\u4e00-\u9fff_\s]/g,
                                        "",
                                      )
                                      .replace(
                                        /[\u4e00-\u9fff]+/g,
                                        (m: string) => {
                                          const map: Record<string, string> = {
                                            "\u8282\u70b9\u8f93\u51fa":
                                              "output",
                                            "\u8f93\u51fa": "output",
                                            "\u7ed3\u679c": "result",
                                            "\u6587\u672c": "text",
                                            "\u5185\u5bb9": "content",
                                            "\u6570\u636e": "data",
                                          };
                                          return map[m] || "output";
                                        },
                                      )
                                      .replace(/\s+/g, "_")
                                      .replace(/_{2,}/g, "_")
                                      .replace(/^_|_$/g, "")
                                      .toLowerCase() || "output";
                                  derivedKey = safeName;
                                }

                                // Handle duplicate keys
                                const otherKeys = new Set(
                                  Object.keys(newVars).filter((k) => k !== key),
                                );
                                if (otherKeys.has(derivedKey)) {
                                  let suffix = 1;
                                  while (
                                    otherKeys.has(`${derivedKey}_${suffix}`)
                                  )
                                    suffix++;
                                  derivedKey = `${derivedKey}_${suffix}`;
                                }

                                // Rename the key
                                delete newVars[key];
                                newVars[derivedKey] = newValue;
                              } else {
                                newVars[key] = newValue;
                              }

                              handleChange("variables", newVars);
                            }}
                            upstreamVariables={upstreamVariables}
                          />
                        </div>
                      </div>
                      <button
                        onClick={() => {
                          const newVars = { ...variables };
                          delete newVars[key];
                          handleChange("variables", newVars);
                        }}
                        className='text-slate-400 hover:text-rose-500 transition-colors flex justify-center'
                      >
                        <X className='w-3.5 h-3.5' />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* 1.5 Sync variables to code signature */}
              {variableList.length > 0 && (
                <button
                  onClick={() => {
                    const varNames = variableList
                      .map((v) => v.key)
                      .filter((k) => k && /^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(k));
                    if (varNames.length === 0) {
                      toast.error("没有有效的变量名可同步");
                      return;
                    }

                    let newCode = currentCode;

                    if (codeLanguage === "javascript") {
                      // Match: async function main({ ... }) or function main({ ... })
                      const jsRegex =
                        /(async\s+)?function\s+main\s*\(\s*\{[^}]*\}\s*\)/;
                      const newSig = `async function main({ ${varNames.join(", ")} })`;
                      if (jsRegex.test(newCode)) {
                        newCode = newCode.replace(jsRegex, newSig);
                      } else {
                        // Try matching: async function main(...) or function main(...)
                        const jsFallback =
                          /(async\s+)?function\s+main\s*\([^)]*\)/;
                        if (jsFallback.test(newCode)) {
                          newCode = newCode.replace(jsFallback, newSig);
                        } else {
                          // Prepend signature comment
                          newCode = `// 输入变量: ${varNames.join(", ")}\n${newCode}`;
                        }
                      }
                    } else {
                      // Python: Match def main(...) -> ...:
                      const pyRegex =
                        /def\s+main\s*\([^)]*\)(\s*->\s*[^:]*)?\s*:/;
                      const pyParams = varNames
                        .map((n) => `${n}: str`)
                        .join(", ");
                      const newSig = `def main(${pyParams}) -> dict:`;
                      if (pyRegex.test(newCode)) {
                        newCode = newCode.replace(pyRegex, newSig);
                      } else {
                        newCode = `# 输入变量: ${varNames.join(", ")}\n${newCode}`;
                      }
                    }

                    handleChange(codeKey, newCode);
                    toast.success(
                      `已同步 ${varNames.length} 个变量到 ${codeLanguage === "python" ? "Python" : "JavaScript"} 函数签名`,
                    );
                  }}
                  className='flex items-center gap-1.5 w-full justify-center py-1.5 text-[10px] font-medium text-rose-500 hover:text-rose-600 bg-rose-50 dark:bg-rose-950/10 hover:bg-rose-100 dark:hover:bg-rose-950/20 border border-rose-200 dark:border-rose-900/30 rounded-lg transition-all active:scale-[0.98]'
                >
                  <RefreshCw className='w-3 h-3' />
                  同步变量到{" "}
                  {codeLanguage === "python" ? "Python" : "JavaScript"} 函数签名
                </button>
              )}

              {/* 2. Code Editor */}
              <div className='space-y-2'>
                <Label className='text-xs font-semibold text-slate-500 uppercase tracking-wider'>
                  {codeLanguage === "python" ? "Python" : "JavaScript"} 代码
                </Label>
                <div className='min-h-[240px] rounded-xl border border-slate-800 bg-slate-950 overflow-hidden text-xs font-mono leading-relaxed relative group'>
                  <div className='absolute right-2 top-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity'>
                    <Button
                      variant='ghost'
                      size='icon'
                      className='h-6 w-6 text-slate-400 hover:text-white hover:bg-slate-800'
                      onClick={() => {
                        navigator.clipboard.writeText(currentCode);
                        toast.success("代码已复制");
                      }}
                    >
                      <svg
                        xmlns='http://www.w3.org/2000/svg'
                        width='14'
                        height='14'
                        viewBox='0 0 24 24'
                        fill='none'
                        stroke='currentColor'
                        strokeWidth='2'
                        strokeLinecap='round'
                        strokeLinejoin='round'
                      >
                        <rect
                          width='14'
                          height='14'
                          x='8'
                          y='8'
                          rx='2'
                          ry='2'
                        />
                        <path d='M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2' />
                      </svg>
                    </Button>
                  </div>
                  <SimpleCodeEditor
                    value={currentCode}
                    onValueChange={(code: string) =>
                      handleChange(codeKey, code)
                    }
                    highlight={(code: string) =>
                      Prism.highlight(
                        code,
                        codeLanguage === "python"
                          ? Prism.languages.python
                          : Prism.languages.javascript,
                        codeLanguage,
                      )
                    }
                    padding={16}
                    className='min-h-[240px] font-mono text-xs'
                    textareaClassName='focus:outline-none'
                    style={{
                      fontFamily: '"Fira Code", "Fira Mono", monospace',
                      fontSize: 12,
                      backgroundColor: "#020617",
                      color: codeLanguage === "python" ? "#60a5fa" : "#34d399",
                    }}
                  />
                </div>
                <div className='text-[10px] text-slate-400 font-mono leading-relaxed bg-slate-50 dark:bg-slate-900 p-2 rounded-lg border border-slate-100 dark:border-slate-800'>
                  {(() => {
                    const validVars = variableList
                      .map((v) => v.key)
                      .filter((k) => k && /^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(k));
                    if (codeLanguage === "python") {
                      const pyParams =
                        validVars.length > 0
                          ? validVars.map((n) => `${n}: str`).join(", ")
                          : "input: str, vars: dict";
                      return (
                        <>
                          <span className='text-rose-500'>
                            {"# main 函数入口:"}
                          </span>
                          <br />
                          {`def main(${pyParams}) -> dict: ...`}
                        </>
                      );
                    } else {
                      const jsParams =
                        validVars.length > 0
                          ? `{ ${validVars.join(", ")} }`
                          : "{ input, vars }";
                      return (
                        <>
                          <span className='text-rose-500'>
                            {"// main 函数入口:"}
                          </span>
                          <br />
                          {`async function main(${jsParams}) { ... }`}
                        </>
                      );
                    }
                  })()}
                </div>
              </div>

              {/* 3. Output Variables */}
              <div className='flex flex-col gap-2 pt-3 border-t border-slate-100 dark:border-slate-800'>
                <div className='flex items-center justify-between'>
                  <Label className='text-xs font-semibold text-slate-500 uppercase tracking-wider'>
                    输出变量
                  </Label>
                  <Button
                    variant='ghost'
                    size='sm'
                    onClick={() => {
                      const newOutputVars = [
                        ...outputVariables,
                        { name: "", type: "string" },
                      ];
                      handleChange("outputVariables", newOutputVars);
                    }}
                    className='h-6 text-[10px] text-rose-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/20'
                  >
                    <Plus className='w-3 h-3 mr-1' />
                    添加
                  </Button>
                </div>

                <div className='flex flex-col gap-2 max-h-[140px] overflow-y-auto pr-1'>
                  {outputVariables.map(
                    (ov: { name: string; type: string }, index: number) => (
                      <div
                        key={index}
                        className='grid grid-cols-[1.2fr_1fr_24px] gap-1.5 items-center'
                      >
                        <Input
                          placeholder='变量名'
                          value={ov.name}
                          onChange={(e) => {
                            const newOVs = [...outputVariables];
                            newOVs[index] = {
                              ...newOVs[index],
                              name: e.target.value,
                            };
                            handleChange("outputVariables", newOVs);
                          }}
                          className='h-7 text-xs rounded-lg bg-white dark:bg-slate-950 px-2 font-mono'
                        />
                        <Select
                          value={ov.type}
                          onValueChange={(v) => {
                            const newOVs = [...outputVariables];
                            newOVs[index] = { ...newOVs[index], type: v };
                            handleChange("outputVariables", newOVs);
                          }}
                        >
                          <SelectTrigger className='h-7 text-xs rounded-lg bg-white dark:bg-slate-950'>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value='string'>String</SelectItem>
                            <SelectItem value='number'>Number</SelectItem>
                            <SelectItem value='object'>Object</SelectItem>
                            <SelectItem value='array'>Array[Object]</SelectItem>
                            <SelectItem value='boolean'>Boolean</SelectItem>
                          </SelectContent>
                        </Select>
                        <button
                          onClick={() => {
                            const newOVs = outputVariables.filter(
                              (_: any, i: number) => i !== index,
                            );
                            handleChange("outputVariables", newOVs);
                          }}
                          className='text-slate-400 hover:text-rose-500 transition-colors flex justify-center'
                        >
                          <X className='w-3.5 h-3.5' />
                        </button>
                      </div>
                    ),
                  )}
                </div>

                <div className='text-[10px] text-slate-400 leading-normal p-2 bg-rose-50 dark:bg-rose-950/10 border border-rose-100 dark:border-rose-900/20 rounded-lg'>
                  💡 <strong>main</strong>{" "}
                  函数必须返回一个字典/对象，包含上面声明的全部输出变量名。
                </div>
              </div>

              {/* 4. Retry & Error Handling */}
              <div className='pt-3 border-t border-slate-100 dark:border-slate-800 space-y-3'>
                <Label className='text-xs font-semibold text-slate-500 uppercase tracking-wider'>
                  错误处理与重试
                </Label>
                <div className='grid grid-cols-2 gap-3'>
                  <div className='space-y-1.5'>
                    <Label className='text-[10px] text-slate-400'>
                      最大重试
                    </Label>
                    <Input
                      type='number'
                      min={0}
                      max={10}
                      value={formData.retryCount || 0}
                      onChange={(e) =>
                        handleChange(
                          "retryCount",
                          Math.min(
                            10,
                            Math.max(0, parseInt(e.target.value) || 0),
                          ),
                        )
                      }
                      className='h-8 rounded-lg text-xs'
                    />
                  </div>
                  <div className='space-y-1.5'>
                    <Label className='text-[10px] text-slate-400'>
                      重试间隔 (ms)
                    </Label>
                    <Input
                      type='number'
                      min={100}
                      max={5000}
                      step={100}
                      value={formData.retryInterval || 1000}
                      onChange={(e) =>
                        handleChange(
                          "retryInterval",
                          Math.min(
                            5000,
                            Math.max(100, parseInt(e.target.value) || 1000),
                          ),
                        )
                      }
                      className='h-8 rounded-lg text-xs'
                    />
                  </div>
                </div>

                <div className='space-y-1.5'>
                  <Label className='text-[10px] text-slate-400'>失败策略</Label>
                  <Select
                    value={formData.errorHandling || "fail"}
                    onValueChange={(v) => handleChange("errorHandling", v)}
                  >
                    <SelectTrigger className='h-8 text-xs rounded-lg'>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value='fail'>
                        ❌ 直接失败 — 终止工作流
                      </SelectItem>
                      <SelectItem value='default_value'>
                        📦 使用默认值 — 继续执行
                      </SelectItem>
                      <SelectItem value='continue'>
                        ⏩ 忽略错误 — 输出为空继续
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {formData.errorHandling === "default_value" && (
                  <div className='space-y-1.5'>
                    <Label className='text-[10px] text-slate-400'>
                      默认输出值 (JSON)
                    </Label>
                    <Textarea
                      value={formData.errorDefaultValue || ""}
                      onChange={(e) =>
                        handleChange("errorDefaultValue", e.target.value)
                      }
                      placeholder='{"result": "fallback"}'
                      className='min-h-[60px] font-mono text-xs rounded-lg'
                    />
                  </div>
                )}

                <div className='space-y-1.5'>
                  <Label className='text-[10px] text-slate-400'>
                    超时 (ms)
                  </Label>
                  <Input
                    type='number'
                    min={1000}
                    max={300000}
                    step={1000}
                    value={formData.timeout || 30000}
                    onChange={(e) =>
                      handleChange("timeout", parseInt(e.target.value) || 30000)
                    }
                    className='h-8 rounded-lg text-xs'
                    placeholder='30000'
                  />
                </div>
              </div>

              {/* 5. Output Limits Info */}
              <div className='p-3 bg-rose-50 dark:bg-rose-950/10 border border-rose-100 dark:border-rose-900/20 rounded-xl text-[10px] text-rose-700 dark:text-rose-400 leading-relaxed space-y-1'>
                <div className='font-semibold flex items-center gap-1.5'>
                  <svg
                    width='12'
                    height='12'
                    viewBox='0 0 24 24'
                    fill='none'
                    stroke='currentColor'
                    strokeWidth='2'
                  >
                    <circle
                      cx='12'
                      cy='12'
                      r='10'
                    />
                    <line
                      x1='12'
                      y1='8'
                      x2='12'
                      y2='12'
                    />
                    <line
                      x1='12'
                      y1='16'
                      x2='12.01'
                      y2='16'
                    />
                  </svg>
                  输出限制
                </div>
                <ul className='list-disc list-inside space-y-0.5 text-rose-600/80 dark:text-rose-400/80'>
                  <li>字符串：最大 80,000 字符</li>
                  <li>数字：-999999999 ~ 999999999</li>
                  <li>对象/数组：最大嵌套 5 层</li>
                </ul>
              </div>
            </div>
          );
        }
        case "template_transform":
        case "text_template":
          return (
            <div className='space-y-2'>
              <Label>模板内容</Label>
              <Textarea
                value={formData.templateContent || ""}
                onChange={(e) =>
                  handleChange("templateContent", e.target.value)
                }
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
                    onValueChange={(v: any) =>
                      handleChange("queryTimeRange", v)
                    }
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

              {(formData.queryType || "logs") === "logs" && (
                <div className='flex items-center gap-2 p-2 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800'>
                  <input
                    type='checkbox'
                    id='includeProcessed'
                    checked={!!formData.queryIncludeProcessed}
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
                  onChange={(e) =>
                    handleChange("loopCondition", e.target.value)
                  }
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
                  onChange={(e) =>
                    handleChange("variableValue", e.target.value)
                  }
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
                            const currentVars =
                              formData.aggregateVariables || [];
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
                  onChange={(e) =>
                    handleChange("listExpression", e.target.value)
                  }
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
                  onChange={(e) =>
                    handleChange("documentSource", e.target.value)
                  }
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
  },
);

NodeDetailsPanel.displayName = "NodeDetailsPanel";
