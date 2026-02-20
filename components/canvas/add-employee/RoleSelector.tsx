import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { useFormContext } from "react-hook-form";
import { ROLE_TEMPLATES } from "./templates";
import { FormSchemaType } from "./schema";

interface RoleSelectorProps {
  models: any[]; // Replace with proper model type if available
}

export function RoleSelector({ models }: RoleSelectorProps) {
  const form = useFormContext<FormSchemaType>();
  const selectedRole = form.watch("role");

  const handleRoleChange = (role: string) => {
    const t = ROLE_TEMPLATES[role];
    if (t) {
      form.setValue("role", role);
      form.setValue("name", t.defaultName);
      form.setValue("prompt", t.prompt);

      // 尝试匹配模板建议的模型，如果找到则切换
      const matchingModel = models.find(
        (m) => m.id === t.model || m.name === t.model,
      );
      if (matchingModel) {
        form.setValue("model", matchingModel.id);
      }
    }
  };

  return (
    <FormField
      control={form.control}
      name='role'
      render={() => (
        <FormItem>
          <FormLabel className='text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400'>
            选择角色
          </FormLabel>
          <div className='grid grid-cols-3 gap-2 mt-1.5'>
            {Object.entries(ROLE_TEMPLATES).map(([key, tmpl]) => {
              const isSelected = selectedRole === key;
              return (
                <button
                  key={key}
                  type='button'
                  onClick={() => handleRoleChange(key)}
                  className={`relative flex flex-col items-center gap-1 p-2.5 rounded-xl border-2 transition-all duration-200 cursor-pointer hover:scale-[1.03] active:scale-[0.97] ${
                    isSelected
                      ? "border-violet-400 bg-violet-50 dark:bg-violet-900/20 shadow-md ring-2 ring-violet-400/30"
                      : "border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 hover:shadow-sm"
                  }`}
                >
                  <span className='text-lg leading-none'>{tmpl.icon}</span>
                  <span className='text-[10px] font-semibold leading-tight text-center text-slate-600 dark:text-slate-300'>
                    {tmpl.label.split(" (")[0]}
                  </span>
                </button>
              );
            })}
          </div>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}
