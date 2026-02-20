import React, { useState } from "react";
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
import {
  Trash2,
  Plus,
  ChevronDown,
  ChevronRight,
  Settings2,
  Variable,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { NodeDetailContentProps } from "./types";

export const QuestionClassifierDetails: React.FC<NodeDetailContentProps> = ({
  formData,
  handleChange,
  upstreamVariables,
  models,
}) => {
  const [showAdvanced, setShowAdvanced] = useState(false);

  const categories = formData.categories || [];

  const handleCategoryChange = (
    index: number,
    field: string,
    value: string,
  ) => {
    const newCategories = [...categories];
    newCategories[index] = { ...newCategories[index], [field]: value };
    handleChange("categories", newCategories);
  };

  const addCategory = () => {
    let index = categories.length + 1;
    let newKey = `category_${index}`;

    while (categories.some((cat: any) => cat?.key === newKey)) {
      index++;
      newKey = `category_${index}`;
    }

    const newCategories = [
      ...categories,
      { key: newKey, label: "", description: "" },
    ];
    handleChange("categories", newCategories);
  };

  const removeCategory = (index: number) => {
    const newCategories = categories.filter((_: any, i: number) => i !== index);
    handleChange("categories", newCategories);
  };

  return (
    <div className='space-y-5'>
      {/* ===== 输入源 ===== */}
      <div className='space-y-2'>
        <Label className='text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1.5'>
          <Variable className='w-3.5 h-3.5' />
          输入变量
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
          选择要分类的文本输入源，默认使用用户原始输入
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
      </div>

      {/* ===== 分类列表 ===== */}
      <div className='space-y-3'>
        <div className='flex items-center justify-between'>
          <Label className='text-xs font-semibold text-slate-500 uppercase tracking-wider'>
            分类类别
          </Label>
          <span className='text-[10px] text-slate-400'>
            {categories.length} 个分类
          </span>
        </div>

        <div className='space-y-2'>
          {categories.map((cat: any, index: number) => {
            const categoryColors = [
              "border-l-blue-400",
              "border-l-violet-400",
              "border-l-emerald-400",
              "border-l-amber-400",
              "border-l-rose-400",
              "border-l-cyan-400",
              "border-l-indigo-400",
              "border-l-teal-400",
            ];
            return (
              <div
                key={cat.key || index}
                className={cn(
                  "p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl space-y-2 group border-l-[3px]",
                  categoryColors[index % categoryColors.length],
                )}
              >
                <div className='flex items-start justify-between gap-2'>
                  <div className='flex-1 grid grid-cols-2 gap-2'>
                    <div className='space-y-1'>
                      <Label className='text-[10px] text-slate-400 uppercase'>
                        Key
                      </Label>
                      <Input
                        value={cat.key || ""}
                        onChange={(e) =>
                          handleCategoryChange(index, "key", e.target.value)
                        }
                        className='h-8 text-xs bg-white dark:bg-slate-950 rounded-lg font-mono'
                        placeholder='category_key'
                      />
                    </div>
                    <div className='space-y-1'>
                      <Label className='text-[10px] text-slate-400 uppercase'>
                        标签
                      </Label>
                      <Input
                        value={cat.label || ""}
                        onChange={(e) =>
                          handleCategoryChange(index, "label", e.target.value)
                        }
                        className='h-8 text-xs bg-white dark:bg-slate-950 rounded-lg'
                        placeholder='显示名称'
                      />
                    </div>
                  </div>
                  <Button
                    variant='ghost'
                    size='icon'
                    onClick={() => removeCategory(index)}
                    className='h-6 w-6 text-slate-400 hover:text-rose-500 mt-4 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity'
                    disabled={categories.length <= 1}
                  >
                    <Trash2 className='w-3 h-3' />
                  </Button>
                </div>
                <div className='space-y-1'>
                  <Label className='text-[10px] text-slate-400 uppercase'>
                    描述 (可选)
                  </Label>
                  <Input
                    value={cat.description || ""}
                    onChange={(e) =>
                      handleCategoryChange(index, "description", e.target.value)
                    }
                    className='h-8 text-xs bg-white dark:bg-slate-950 rounded-lg'
                    placeholder='帮助 AI 判断该分类的描述...'
                  />
                </div>
              </div>
            );
          })}
        </div>

        <Button
          variant='outline'
          size='sm'
          onClick={addCategory}
          className='w-full border-dashed rounded-xl h-9 text-xs hover:bg-blue-50 dark:hover:bg-blue-950/20 hover:border-blue-300 hover:text-blue-600 transition-colors'
        >
          <Plus className='w-3 h-3 mr-2' />
          添加分类
        </Button>
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
            {/* 附加指令 */}
            <div className='space-y-2'>
              <Label className='text-xs text-slate-600 dark:text-slate-400'>
                附加指令
              </Label>
              <Textarea
                value={formData.instructions || ""}
                onChange={(e) => handleChange("instructions", e.target.value)}
                placeholder='为分类器提供额外的上下文和指导，例如：&#10;- 当用户询问价格相关的问题时，归类为"销售"&#10;- 如果无法明确分类，优先归为"通用"类别'
                className='min-h-[100px] text-xs rounded-xl bg-white dark:bg-slate-950'
              />
              <p className='text-[10px] text-slate-400'>
                附加的上下文或规则将帮助 AI 更准确地进行分类
              </p>
            </div>

            {/* 记忆功能 */}
            <div className='space-y-3'>
              <div className='flex items-center gap-2 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800'>
                <input
                  type='checkbox'
                  id='classifierMemory'
                  checked={formData.memory?.enabled || false}
                  onChange={(e) =>
                    handleChange("memory", {
                      ...formData.memory,
                      enabled: e.target.checked,
                    })
                  }
                  className='rounded border-slate-300 text-blue-600 focus:ring-blue-500'
                />
                <Label
                  htmlFor='classifierMemory'
                  className='text-xs text-slate-600 dark:text-slate-400 cursor-pointer flex-1'
                >
                  启用上下文记忆
                </Label>
              </div>
              {formData.memory?.enabled && (
                <div className='space-y-2 pl-4 border-l-2 border-blue-200 dark:border-blue-800'>
                  <Label className='text-xs text-slate-600 dark:text-slate-400'>
                    记忆窗口大小
                  </Label>
                  <Input
                    type='number'
                    min={1}
                    max={20}
                    value={formData.memory?.window || 5}
                    onChange={(e) =>
                      handleChange("memory", {
                        ...formData.memory,
                        window: parseInt(e.target.value) || 5,
                      })
                    }
                    className='h-8 text-xs rounded-lg w-24 bg-white dark:bg-slate-950'
                  />
                  <p className='text-[10px] text-slate-400'>
                    保留最近的对话轮数用于辅助分类判断
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
                  value={formData.timeout || 30000}
                  onChange={(e) =>
                    handleChange("timeout", parseInt(e.target.value) || 30000)
                  }
                  className='rounded-xl h-8 text-xs bg-white dark:bg-slate-950'
                  placeholder='30000'
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
