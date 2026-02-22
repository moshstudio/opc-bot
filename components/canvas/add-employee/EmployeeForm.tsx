import { useFormContext } from "react-hook-form";
import { Sparkles, Bot, Cpu, UserCircle } from "lucide-react";
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
  const selectedRole = form.watch("role");
  const currentTemplate = ROLE_TEMPLATES[selectedRole];

  return (
    <div className='flex flex-col h-[600px] max-h-[85vh]'>
      {/* Scrollable Role Selection Section */}
      <div className='flex-1 overflow-y-auto px-6 py-4 scrollbar-thin scrollbar-thumb-slate-200 dark:scrollbar-thumb-slate-800 hover:scrollbar-thumb-slate-300'>
        <RoleSelector models={models} />
      </div>

      {/* Docked Basic Info & Action Section */}
      <div className='px-6 py-4 bg-slate-50/80 dark:bg-slate-900/60 border-t border-slate-100 dark:border-slate-800/80 space-y-4 shadow-[0_-4px_20px_rgb(0,0,0,0.03)] dark:shadow-[0_-4px_20px_rgb(0,0,0,0.15)]'>
        <div className='space-y-3'>
          <div className='flex items-center gap-2'>
            <div className='p-1 bg-violet-500/10 rounded-lg'>
              <UserCircle className='h-3 w-3 text-violet-500' />
            </div>
            <h3 className='text-[11px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400'>
              身份定义
            </h3>
          </div>

          <div className='grid grid-cols-1 md:grid-cols-2 gap-3'>
            {/* Name */}
            <FormField
              control={form.control}
              name='name'
              render={({ field }) => (
                <FormItem className='space-y-1'>
                  <FormLabel className='text-[10px] font-bold text-slate-400 dark:text-slate-500 ml-0.5'>
                    员工姓名
                  </FormLabel>
                  <FormControl>
                    <div className='relative group'>
                      <Bot className='absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 group-focus-within:text-violet-500 transition-colors' />
                      <Input
                        placeholder='例如：贾维斯'
                        className='pl-8.5 h-9 rounded-lg bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 focus:ring-4 focus:ring-violet-500/5 transition-all text-[13px] font-semibold'
                        {...field}
                      />
                    </div>
                  </FormControl>
                  <FormMessage className='text-[10px]' />
                </FormItem>
              )}
            />

            {/* Model */}
            <FormField
              control={form.control}
              name='model'
              render={({ field }) => (
                <FormItem className='space-y-1'>
                  <FormLabel className='text-[10px] font-bold text-slate-400 dark:text-slate-500 ml-0.5'>
                    驱动模型
                  </FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                    value={field.value}
                  >
                    <FormControl>
                      <SelectTrigger className='h-9 px-3 rounded-lg bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 focus:ring-4 focus:ring-violet-500/5 transition-all text-[13px] font-semibold'>
                        <div className='flex items-center gap-2'>
                          <Cpu className='h-3.5 w-3.5 text-slate-400' />
                          <SelectValue placeholder='选择模型' />
                        </div>
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent className='rounded-xl border-slate-200 dark:border-slate-800'>
                      {models.map((m) => (
                        <SelectItem
                          key={m.id}
                          value={m.id}
                          className='focus:bg-violet-50 dark:focus:bg-violet-900/20'
                        >
                          <div className='flex items-center gap-3 py-0.5'>
                            <div className='flex flex-col'>
                              <span className='font-bold text-xs'>
                                {m.name}
                              </span>
                              <span className='text-[9px] text-slate-400 uppercase tracking-tight font-black'>
                                {m.provider}
                              </span>
                            </div>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage className='text-[10px]' />
                </FormItem>
              )}
            />
          </div>
        </div>

        <Button
          type='submit'
          className={`group relative w-full h-10 rounded-xl font-bold text-white shadow-lg shadow-violet-500/5 transition-all duration-300 hover:shadow-xl hover:scale-[1.01] active:scale-[0.99] bg-gradient-to-r ${
            currentTemplate?.color || "from-violet-600 to-indigo-700"
          }`}
        >
          <span className='relative z-10 flex items-center justify-center gap-2 text-sm'>
            立即入职 {form.watch("name") || "员工"}
            <Sparkles className='h-3 w-3 animate-pulse group-hover:scale-110 transition-transform' />
          </span>
          <div className='absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity rounded-xl' />
        </Button>
      </div>
    </div>
  );
}
