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
};
