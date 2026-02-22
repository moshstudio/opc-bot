import React from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SchemaBuilder } from "../SchemaBuilder";
import { NodeDetailContentProps } from "./types";

export const LlmDetails: React.FC<NodeDetailContentProps> = ({
  formData,
  handleChange,
  models,
  upstreamVariables,
}) => {
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
        <div className='flex items-center justify-between'>
          <Label>处理指令 (Prompt)</Label>
          <Select
            onValueChange={(v) => {
              const currentPrompt = formData.prompt || "";
              handleChange("prompt", currentPrompt + ` {{${v}}}`);
            }}
          >
            <SelectTrigger className='h-7 w-[120px] text-[10px] bg-slate-50 dark:bg-slate-900 border-dashed'>
              <SelectValue placeholder='插入变量' />
            </SelectTrigger>
            <SelectContent>
              {upstreamVariables.map((v) => (
                <SelectItem
                  key={v.value}
                  value={v.value}
                >
                  <span className='text-slate-400 mr-2 text-[9px] lowercase'>
                    [{v.group}]
                  </span>
                  {v.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Textarea
          value={formData.prompt || ""}
          onChange={(e) => handleChange("prompt", e.target.value)}
          placeholder='描述处理逻辑...'
          className='min-h-[120px]'
        />
        <p className='text-[10px] text-slate-500 bg-amber-50 dark:bg-amber-950/20 p-2 rounded-lg border border-amber-100 dark:border-amber-900/30 leading-relaxed'>
          💡 <strong>提示：</strong>{" "}
          您可以使用右上角的下拉框插入变量，或手动输入 {"{{变量名}}"}。
        </p>
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
};
