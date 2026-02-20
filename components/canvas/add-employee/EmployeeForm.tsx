import { useState } from "react";
import { useFormContext } from "react-hook-form";
import { Sparkles, ChevronDown, ChevronUp } from "lucide-react";
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { RoleSelector } from "./RoleSelector";
import { ROLE_TEMPLATES } from "./templates";
import { FormSchemaType } from "./schema";

interface EmployeeFormProps {
  models: any[];
}

export function EmployeeForm({ models }: EmployeeFormProps) {
  const form = useFormContext<FormSchemaType>();
  const [showAdvanced, setShowAdvanced] = useState(false);
  const selectedRole = form.watch("role");
  const currentTemplate = ROLE_TEMPLATES[selectedRole];

  return (
    <div className='px-6 pb-6 pt-5 space-y-5'>
      <RoleSelector models={models} />

      {/* Name */}
      <FormField
        control={form.control}
        name='name'
        render={({ field }) => (
          <FormItem>
            <FormLabel className='text-sm font-medium flex items-center gap-2'>
              <Sparkles className='h-3.5 w-3.5 text-amber-500' />
              员工姓名
            </FormLabel>
            <FormControl>
              <Input
                placeholder='例如：贾维斯'
                className='rounded-xl h-10 bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 focus:ring-2 focus:ring-violet-500/20 transition-shadow'
                {...field}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      {/* Model */}
      <FormField
        control={form.control}
        name='model'
        render={({ field }) => (
          <FormItem>
            <FormLabel className='text-sm font-medium'>模型</FormLabel>
            <Select
              onValueChange={field.onChange}
              defaultValue={field.value}
              value={field.value}
            >
              <FormControl>
                <SelectTrigger className='rounded-xl h-10 bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800'>
                  <SelectValue placeholder='选择模型' />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                {models.map((m) => (
                  <SelectItem
                    key={m.id}
                    value={m.id}
                  >
                    <div className='flex items-center gap-2'>
                      <span>{m.name}</span>
                      <span className='text-xs text-muted-foreground capitalize'>
                        {m.provider}
                      </span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FormMessage />
          </FormItem>
        )}
      />

      {/* Advanced Toggle */}
      <button
        type='button'
        onClick={() => setShowAdvanced(!showAdvanced)}
        className='flex items-center gap-2 text-sm text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 transition-colors w-full'
      >
        {showAdvanced ? (
          <ChevronUp className='h-4 w-4' />
        ) : (
          <ChevronDown className='h-4 w-4' />
        )}
        <span>{showAdvanced ? "隐藏高级设置" : "显示高级设置 (Prompt)"}</span>
      </button>

      {showAdvanced && (
        <div className='space-y-4 pt-2 border-t border-slate-100 dark:border-slate-800 animate-in slide-in-from-top-1 duration-200'>
          <FormField
            control={form.control}
            name='prompt'
            render={({ field }) => (
              <FormItem>
                <FormLabel className='text-sm font-medium'>
                  系统提示词 (System Prompt)
                </FormLabel>
                <FormControl>
                  <textarea
                    className='flex min-h-[100px] w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 px-4 py-3 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500/20 disabled:cursor-not-allowed disabled:opacity-50 transition-shadow'
                    placeholder='输入系统提示词...'
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
      )}

      <Button
        type='submit'
        className={`w-full h-11 rounded-xl font-semibold text-white shadow-lg transition-all duration-300 hover:shadow-xl hover:scale-[1.01] active:scale-[0.99] bg-gradient-to-r ${
          currentTemplate?.color || "from-violet-500 to-purple-600"
        }`}
      >
        创建员工
      </Button>
    </div>
  );
}
