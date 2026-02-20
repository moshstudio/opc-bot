import React from "react";
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
import { X, Plus, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import SimpleCodeEditor from "react-simple-code-editor";
import Prism from "prismjs";
import "prismjs/components/prism-javascript";
import "prismjs/components/prism-python";
import { VariablePicker } from "../VariablePicker";
import { NodeDetailContentProps } from "./types";

export const CodeDetails: React.FC<NodeDetailContentProps> = ({
  formData,
  handleChange,
  upstreamVariables,
}) => {
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
                  if (field && /^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(field)) {
                    candidates.push(field);
                  }
                } else {
                  // Node output → derive name from label
                  const label = uv.label
                    .replace(/[^a-zA-Z0-9\u4e00-\u9fff_\s]/g, "")
                    .trim();
                  // Try common output names first
                  if (!candidates.includes("text")) candidates.push("text");
                  if (!candidates.includes("result")) candidates.push("result");
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
                candidates.push("arg", "text", "input", "data", "result");
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
                              .replace(/[^a-zA-Z0-9\u4e00-\u9fff_\s]/g, "")
                              .replace(/[\u4e00-\u9fff]+/g, (m: string) => {
                                const map: Record<string, string> = {
                                  "\u8282\u70b9\u8f93\u51fa": "output",
                                  "\u8f93\u51fa": "output",
                                  "\u7ed3\u679c": "result",
                                  "\u6587\u672c": "text",
                                  "\u5185\u5bb9": "content",
                                  "\u6570\u636e": "data",
                                };
                                return map[m] || "output";
                              })
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
                          while (otherKeys.has(`${derivedKey}_${suffix}`))
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
                const jsFallback = /(async\s+)?function\s+main\s*\([^)]*\)/;
                if (jsFallback.test(newCode)) {
                  newCode = newCode.replace(jsFallback, newSig);
                } else {
                  // Prepend signature comment
                  newCode = `// 输入变量: ${varNames.join(", ")}\n${newCode}`;
                }
              }
            } else {
              // Python: Match def main(...) -> ...:
              const pyRegex = /def\s+main\s*\([^)]*\)(\s*->\s*[^:]*)?\\s*:/;
              const pyParams = varNames.map((n) => `${n}: str`).join(", ");
              const newSig = `def main(${pyParams}) -> dict:`;
              if (pyRegex.test(newCode)) {
                newCode = newCode.replace(pyRegex, newSig);
              } else {
                // Try a more relaxed python regex
                const pyFallback = /def\s+main\s*\([^)]*\)(\s*->\s*[^:]*)?:/;
                if (pyFallback.test(newCode)) {
                  newCode = newCode.replace(pyFallback, newSig);
                } else {
                  newCode = `# 输入变量: ${varNames.join(", ")}\n${newCode}`;
                }
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
          同步变量到 {codeLanguage === "python" ? "Python" : "JavaScript"}{" "}
          函数签名
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
            onValueChange={(code: string) => handleChange(codeKey, code)}
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
                  <span className='text-rose-500'>{"# main 函数入口:"}</span>
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
                  <span className='text-rose-500'>{"// main 函数入口:"}</span>
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
            <Label className='text-[10px] text-slate-400'>最大重试</Label>
            <Input
              type='number'
              min={0}
              max={10}
              value={formData.retryCount || 0}
              onChange={(e) =>
                handleChange(
                  "retryCount",
                  Math.min(10, Math.max(0, parseInt(e.target.value) || 0)),
                )
              }
              className='h-8 rounded-lg text-xs'
            />
          </div>
          <div className='space-y-1.5'>
            <Label className='text-[10px] text-slate-400'>重试间隔 (ms)</Label>
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
              <SelectItem value='fail'>❌ 直接失败 — 终止工作流</SelectItem>
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
          <Label className='text-[10px] text-slate-400'>超时 (ms)</Label>
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
};
