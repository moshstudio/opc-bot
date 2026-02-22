import {
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { useFormContext } from "react-hook-form";
import { ROLE_TEMPLATES } from "./templates";
import { FormSchemaType } from "./schema";
import { Search, Plus } from "lucide-react";
import { useState, useMemo } from "react";
import { Input } from "@/components/ui/input";

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
  models: any[];
}

export function RoleSelector({ models }: RoleSelectorProps) {
  const form = useFormContext<FormSchemaType>();
  const selectedRole = form.watch("role");
  const [searchQuery, setSearchQuery] = useState("");

  const handleRoleChange = (role: string) => {
    const t = ROLE_TEMPLATES[role];
    if (t) {
      form.setValue("role", role);
      form.setValue("name", t.defaultName);
      form.setValue("prompt", t.prompt);

      const matchingModel = models.find(
        (m) => m.id === t.model || m.name === t.model,
      );
      if (matchingModel) {
        form.setValue("model", matchingModel.id);
      }
    }
  };

  const filteredTemplates = useMemo(() => {
    if (!searchQuery) return ROLE_TEMPLATES;
    const filtered: any = {};
    Object.entries(ROLE_TEMPLATES).forEach(([id, tmpl]) => {
      if (
        tmpl.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
        id.toLowerCase().includes(searchQuery.toLowerCase())
      ) {
        filtered[id] = tmpl;
      }
    });
    return filtered;
  }, [searchQuery]);

  const mappedRoles = new Set(ROLE_CATEGORIES.flatMap((c) => c.roles));
  const unmappedRoles = Object.keys(filteredTemplates).filter(
    (r) => !mappedRoles.has(r),
  );

  const renderRoleButton = (key: string) => {
    const tmpl = filteredTemplates[key];
    if (!tmpl) return null;
    const isSelected = selectedRole === key;
    return (
      <button
        key={key}
        type='button'
        onClick={() => handleRoleChange(key)}
        className={`group relative w-full flex flex-col items-center gap-1.5 p-2.5 rounded-xl border-2 transition-all duration-300 cursor-pointer overflow-hidden ${
          isSelected
            ? "border-violet-500 bg-violet-500/5 shadow-md shadow-violet-500/5 ring-1 ring-violet-500/10"
            : "border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 hover:border-slate-200 dark:hover:border-slate-700 hover:bg-white dark:hover:bg-slate-800"
        }`}
      >
        {isSelected && (
          <div className='absolute top-1 right-1'>
            <div className='bg-violet-500 rounded-full p-0.5'>
              <Plus className='h-2.5 w-2.5 text-white rotate-45' />
            </div>
          </div>
        )}
        <span className='text-2xl leading-none select-none transition-transform group-hover:scale-110 duration-300'>
          {tmpl.icon}
        </span>
        <span
          className={`text-[11px] font-bold leading-tight text-center w-full truncate px-0.5 transition-colors ${
            isSelected
              ? "text-violet-600 dark:text-violet-400"
              : "text-slate-600 dark:text-slate-400"
          }`}
        >
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
        <FormItem className='space-y-3'>
          <div className='flex items-center justify-between gap-4'>
            <FormLabel className='text-xs font-bold text-slate-700 dark:text-slate-200'>
              挑选员工角色
            </FormLabel>
            <div className='relative w-36'>
              <Search className='absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-slate-400' />
              <Input
                placeholder='搜寻能力...'
                className='h-7 pl-7 pr-2 text-[11px] rounded-lg border-slate-200 dark:border-slate-800 focus:ring-violet-500/10 bg-white/50 dark:bg-slate-950/50'
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>

          <div className='flex flex-col gap-4 pr-1.5 -mr-1.5'>
            {ROLE_CATEGORIES.map((category) => {
              const availableRoles = category.roles.filter(
                (role) => filteredTemplates[role],
              );
              if (availableRoles.length === 0) return null;

              return (
                <div
                  key={category.title}
                  className='space-y-2'
                >
                  <div className='flex items-center gap-2'>
                    <div className='text-[10px] font-black uppercase tracking-widest text-slate-400/80 dark:text-slate-500/80'>
                      {category.title}
                    </div>
                    <div className='h-[1px] bg-gradient-to-r from-slate-100 via-slate-50 to-transparent dark:from-slate-800 dark:via-slate-900 flex-1 rounded-full'></div>
                  </div>
                  <div className='grid grid-cols-4 gap-2'>
                    {availableRoles.map(renderRoleButton)}
                  </div>
                </div>
              );
            })}

            {unmappedRoles.length > 0 && (
              <div className='space-y-3'>
                <div className='flex items-center gap-3'>
                  <div className='text-[12px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500'>
                    其他类别
                  </div>
                  <div className='h-[1px] bg-gradient-to-r from-slate-100 via-slate-100 to-transparent dark:from-slate-800 dark:via-slate-800 flex-1 rounded-full'></div>
                </div>
                <div className='grid grid-cols-3 gap-3'>
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
