import {
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { useFormContext } from "react-hook-form";
import { ROLE_TEMPLATES } from "./templates";
import { FormSchemaType } from "./schema";

const ROLE_CATEGORIES = [
  {
    title: "通用助理",
    roles: ["assistant", "life_assistant", "general_assistant"],
  },
  {
    title: "产品研发",
    roles: [
      "product_manager",
      "frontend_architect",
      "backend_engineer",
      "ui_designer",
      "qa_engineer",
      "devops",
      "deployment",
    ],
  },
  {
    title: "内容运营",
    roles: [
      "content_creator",
      "copywriter",
      "video_director",
      "social_media_manager",
    ],
  },
  {
    title: "教育辅导",
    roles: ["instructional_designer", "assessment_manager", "tutor"],
  },
];

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

  const mappedRoles = new Set(ROLE_CATEGORIES.flatMap((c) => c.roles));
  const unmappedRoles = Object.keys(ROLE_TEMPLATES).filter(
    (r) => !mappedRoles.has(r),
  );

  const renderRoleButton = (key: string) => {
    const tmpl = ROLE_TEMPLATES[key];
    if (!tmpl) return null;
    const isSelected = selectedRole === key;
    return (
      <button
        key={key}
        type='button'
        onClick={() => handleRoleChange(key)}
        className={`relative w-full flex flex-col items-center gap-1.5 p-2.5 rounded-xl border-2 transition-all duration-200 cursor-pointer hover:scale-[1.03] active:scale-[0.97] ${
          isSelected
            ? "border-violet-400 bg-violet-50 dark:bg-violet-900/20 shadow-md ring-2 ring-violet-400/30"
            : "border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 hover:shadow-sm"
        }`}
      >
        <span className='text-[22px] leading-none select-none'>
          {tmpl.icon}
        </span>
        <span className='text-[11px] font-semibold leading-tight text-center text-slate-600 dark:text-slate-300 w-full truncate px-1'>
          {tmpl.label.split(" (")[0]}
        </span>
      </button>
    );
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
          <div
            className='flex flex-col gap-4 mt-2 max-h-[420px] overflow-y-auto pr-1 -mr-1 
            scrollbar-thin scrollbar-thumb-slate-200 dark:scrollbar-thumb-slate-700 hover:scrollbar-thumb-slate-300'
          >
            {ROLE_CATEGORIES.map((category) => {
              const availableRoles = category.roles.filter(
                (role) => ROLE_TEMPLATES[role],
              );
              if (availableRoles.length === 0) return null;

              return (
                <div
                  key={category.title}
                  className='space-y-2'
                >
                  <div className='flex items-center gap-2'>
                    <div className='text-[11px] font-bold text-slate-400 dark:text-slate-500'>
                      {category.title}
                    </div>
                    <div className='h-px bg-slate-100 dark:bg-slate-800 flex-1 rounded-full'></div>
                  </div>
                  <div className='grid grid-cols-3 gap-2'>
                    {availableRoles.map(renderRoleButton)}
                  </div>
                </div>
              );
            })}

            {unmappedRoles.length > 0 && (
              <div className='space-y-2'>
                <div className='flex items-center gap-2'>
                  <div className='text-[11px] font-bold text-slate-400 dark:text-slate-500'>
                    其他类别
                  </div>
                  <div className='h-px bg-slate-100 dark:bg-slate-800 flex-1 rounded-full'></div>
                </div>
                <div className='grid grid-cols-3 gap-2'>
                  {unmappedRoles.map(renderRoleButton)}
                </div>
              </div>
            )}
          </div>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}
