import React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Trash2, Plus } from "lucide-react";
import { NodeDetailContentProps } from "./types";

export const ConditionDetails: React.FC<NodeDetailContentProps> = ({
  formData,
  handleChange,
  upstreamVariables,
}) => {
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
            variant={formData.logicalOperator === "OR" ? "default" : "ghost"}
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
        {(formData.conditions || []).map((condition: any, index: number) => (
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
                    const newConditions = [...(formData.conditions || [])];
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
                        <span className='text-slate-500 mr-2'>[{v.group}]</span>
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
                  const newConditions = (formData.conditions || []).filter(
                    (_: any, i: number) => i !== index,
                  );
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
                    const newConditions = [...(formData.conditions || [])];
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
                    <SelectItem value='not_contains'>不包含</SelectItem>
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
                {["is_empty", "not_empty", "is_null", "not_null"].includes(
                  condition.operator,
                ) ? (
                  <div className='h-8 flex items-center px-2 text-xs text-slate-400 bg-slate-100 dark:bg-slate-800 rounded border border-transparent'>
                    无需输入值
                  </div>
                ) : (
                  <Input
                    value={condition.value || ""}
                    onChange={(e) => {
                      const newConditions = [...(formData.conditions || [])];
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
        ))}
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
};
