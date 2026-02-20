import React from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { NodeDetailContentProps } from "./types";

export const KnowledgeRetrievalDetails: React.FC<NodeDetailContentProps> = ({
  formData,
  handleChange,
  allEmployees,
  models,
}) => {
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
            onValueChange={(v: any) => handleChange("queryTimeRange", v)}
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
};
