import React from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar, Settings2, Check } from "lucide-react";
import {
  generateCron,
  getReadableDescription,
  parseCron,
} from "@/lib/workflow/cron-utils";

export interface CronConfigData {
  scheduleType: "visual" | "cron";
  frequency: "minutely" | "hourly" | "daily" | "weekly" | "monthly";
  time: string;
  daysOfWeek: string;
  daysOfMonth: string;
  interval: number;
  minute?: number;
  cron: string;
  cronExpression: string;
}

interface CronConfiguratorProps {
  data: Partial<CronConfigData>;
  onChange: (updates: Partial<CronConfigData>) => void;
}

export function CronConfigurator({ data, onChange }: CronConfiguratorProps) {
  const config: CronConfigData = {
    scheduleType: data.scheduleType || "visual",
    frequency: data.frequency || "daily",
    time: data.time || "09:00",
    daysOfWeek: data.daysOfWeek || "1",
    daysOfMonth: data.daysOfMonth || "1",
    interval: data.interval || 1,
    minute: data.minute !== undefined ? data.minute : 0,
    cron: data.cron || "0 0 9 * * *",
    cronExpression: data.cronExpression || "0 0 9 * * *",
  };

  const updateConfig = (updates: Partial<CronConfigData>) => {
    let nextConfig = { ...config, ...updates };

    // When switching from cron to visual, try to parse the current cron string
    if (updates.scheduleType === "visual" && config.scheduleType === "cron") {
      const parsed = parseCron(config.cron || config.cronExpression);
      nextConfig = { ...nextConfig, ...parsed };
    }

    if (nextConfig.scheduleType === "visual") {
      const newCron = generateCron(nextConfig as any);
      nextConfig.cron = newCron;
      nextConfig.cronExpression = newCron;
    }
    onChange(nextConfig);
  };

  const toggleDayOfWeek = (day: number) => {
    const days = config.daysOfWeek.split(",").filter(Boolean);
    const dayStr = day.toString();
    let nextDays: string[];
    if (days.includes(dayStr)) {
      nextDays = days.filter((d) => d !== dayStr);
      if (nextDays.length === 0) nextDays = [dayStr]; // Keep at least one
    } else {
      nextDays = [...days, dayStr].sort();
    }
    updateConfig({ daysOfWeek: nextDays.join(",") });
  };

  const toggleDayOfMonth = (day: number) => {
    const days = config.daysOfMonth.split(",").filter(Boolean);
    const dayStr = day.toString();
    let nextDays: string[];
    if (days.includes(dayStr)) {
      nextDays = days.filter((d) => d !== dayStr);
      if (nextDays.length === 0) nextDays = [dayStr]; // Keep at least one
    } else {
      nextDays = [...days, dayStr].sort((a, b) => parseInt(a) - parseInt(b));
    }
    updateConfig({ daysOfMonth: nextDays.join(",") });
  };

  const weekDays = [
    { label: "日", value: 0 },
    { label: "一", value: 1 },
    { label: "二", value: 2 },
    { label: "三", value: 3 },
    { label: "四", value: 4 },
    { label: "五", value: 5 },
    { label: "六", value: 6 },
  ];

  return (
    <div className='space-y-6'>
      <div className='space-y-2'>
        <Label className='text-xs font-semibold text-slate-500 uppercase tracking-wider'>
          配置方式
        </Label>
        <div className='grid grid-cols-2 gap-2 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl'>
          <button
            type='button'
            onClick={() => updateConfig({ scheduleType: "visual" })}
            className={`flex items-center justify-center gap-2 py-2 rounded-lg text-sm transition-all ${
              config.scheduleType === "visual"
                ? "bg-white dark:bg-slate-700 shadow-sm text-teal-600 font-medium"
                : "text-slate-500 hover:text-slate-700 font-normal"
            }`}
          >
            <Calendar className='w-4 h-4' />
            可视化配置
          </button>
          <button
            type='button'
            onClick={() => updateConfig({ scheduleType: "cron" })}
            className={`flex items-center justify-center gap-2 py-2 rounded-lg text-sm transition-all ${
              config.scheduleType === "cron"
                ? "bg-white dark:bg-slate-700 shadow-sm text-teal-600 font-medium"
                : "text-slate-500 hover:text-slate-700 font-normal"
            }`}
          >
            <Settings2 className='w-4 h-4' />
            Cron 表达式
          </button>
        </div>
      </div>

      {config.scheduleType === "cron" ? (
        <div className='space-y-4 animate-in fade-in slide-in-from-top-2 duration-300'>
          <div className='space-y-2'>
            <Label className='text-xs font-semibold text-slate-500'>
              Cron 表达式
            </Label>
            <Input
              value={config.cron || config.cronExpression || "* * * * *"}
              onChange={(e) => {
                const val = e.target.value;
                updateConfig({
                  cron: val,
                  cronExpression: val,
                });
              }}
              placeholder='* * * * *'
              className='font-mono rounded-xl'
            />
            <div className='text-[10px] text-slate-400 font-mono mt-1 p-3 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-100 dark:border-slate-800 shadow-inner'>
              * * * * * *<br />
              | | | | | |<br />
              | | | | | +-- 星期 (0-6)
              <br />
              | | | | +---- 月份 (1-12)
              <br />
              | | | +------ 日 (1-31)
              <br />
              | | +-------- 小时 (0-23)
              <br />
              | +---------- 分钟 (0-59)
              <br />
              +------------ 秒 (0-59)
            </div>
          </div>
        </div>
      ) : (
        <div className='space-y-4 animate-in fade-in slide-in-from-top-2 duration-300'>
          <div className='grid grid-cols-2 gap-4'>
            <div className='space-y-2'>
              <Label className='text-xs font-semibold text-slate-500'>
                执行频率
              </Label>
              <Select
                value={config.frequency}
                onValueChange={(v: any) => updateConfig({ frequency: v })}
              >
                <SelectTrigger className='rounded-xl'>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value='minutely'>每分钟</SelectItem>
                  <SelectItem value='hourly'>每小时</SelectItem>
                  <SelectItem value='daily'>每天</SelectItem>
                  <SelectItem value='weekly'>每周</SelectItem>
                  <SelectItem value='monthly'>每月</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {config.frequency !== "hourly" &&
              config.frequency !== "minutely" && (
                <div className='space-y-2'>
                  <Label className='text-xs font-semibold text-slate-500'>
                    执行时间
                  </Label>
                  <Input
                    type='time'
                    value={config.time}
                    onChange={(e) => updateConfig({ time: e.target.value })}
                    className='rounded-xl'
                  />
                </div>
              )}

            {config.frequency === "hourly" && (
              <>
                <div className='space-y-2'>
                  <Label className='text-xs font-semibold text-slate-500'>
                    间隔小时
                  </Label>
                  <Input
                    type='number'
                    min={1}
                    max={23}
                    value={config.interval}
                    onChange={(e) =>
                      updateConfig({
                        interval: parseInt(e.target.value) || 1,
                      })
                    }
                    className='rounded-xl'
                  />
                </div>
                <div className='space-y-2'>
                  <Label className='text-xs font-semibold text-slate-500'>
                    具体分钟
                  </Label>
                  <Input
                    type='number'
                    min={0}
                    max={59}
                    value={config.minute}
                    onChange={(e) =>
                      updateConfig({
                        minute: parseInt(e.target.value) || 0,
                      })
                    }
                    className='rounded-xl'
                  />
                </div>
              </>
            )}

            {config.frequency === "minutely" && (
              <div className='space-y-2'>
                <Label className='text-xs font-semibold text-slate-500'>
                  间隔分钟
                </Label>
                <Input
                  type='number'
                  min={1}
                  max={59}
                  value={config.interval}
                  onChange={(e) =>
                    updateConfig({
                      interval: parseInt(e.target.value) || 1,
                    })
                  }
                  className='rounded-xl'
                />
              </div>
            )}
          </div>

          {config.frequency === "weekly" && (
            <div className='space-y-2'>
              <Label className='text-xs font-semibold text-slate-500'>
                重复时间 (每周)
              </Label>
              <div className='flex flex-wrap gap-2'>
                {weekDays.map((day) => {
                  const isSelected = config.daysOfWeek
                    .split(",")
                    .includes(day.value.toString());
                  return (
                    <button
                      key={day.value}
                      type='button'
                      onClick={() => toggleDayOfWeek(day.value)}
                      className={`w-9 h-9 rounded-lg text-sm font-medium transition-all ${
                        isSelected
                          ? "bg-teal-600 text-white shadow-sm"
                          : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700"
                      }`}
                    >
                      {day.label}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {config.frequency === "monthly" && (
            <div className='space-y-2'>
              <Label className='text-xs font-semibold text-slate-500'>
                重复日期 (每月)
              </Label>
              <div className='grid grid-cols-7 gap-1.5'>
                {Array.from({ length: 31 }, (_, i) => i + 1).map((day) => {
                  const isSelected = config.daysOfMonth
                    .split(",")
                    .includes(day.toString());
                  return (
                    <button
                      key={day}
                      type='button'
                      onClick={() => toggleDayOfMonth(day)}
                      className={`h-8 rounded-md text-xs font-medium transition-all ${
                        isSelected
                          ? "bg-teal-600 text-white shadow-sm"
                          : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700"
                      }`}
                    >
                      {day}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <div className='p-3 bg-teal-50 dark:bg-teal-900/20 border border-teal-100 dark:border-teal-800 rounded-xl flex items-start gap-3'>
            <Check className='w-4 h-4 text-teal-600 mt-0.5 shrink-0' />
            <div className='text-xs text-teal-700 dark:text-teal-300 leading-relaxed'>
              预期效果：
              <span className='font-bold'>
                {getReadableDescription(config as any)}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
