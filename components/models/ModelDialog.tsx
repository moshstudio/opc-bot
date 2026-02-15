"use client";

import React, { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  Plus,
  Eye,
  EyeOff,
  KeyRound,
  Globe,
  Sparkles,
  Check,
  Bot,
} from "lucide-react";
import { useModelContext } from "@/components/ModelContext";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { v4 as uuidv4 } from "uuid";

// ─── Provider Metadata ─────────────────────────────────────
const PROVIDERS = [
  {
    value: "openai" as const,
    label: "OpenAI",
    color: "from-emerald-500 to-teal-600",
    bgLight: "bg-emerald-50 border-emerald-200 text-emerald-700",
    bgDark:
      "dark:bg-emerald-900/20 dark:border-emerald-700/50 dark:text-emerald-300",
    bgSelected:
      "bg-emerald-100 border-emerald-400 ring-2 ring-emerald-400/30 dark:bg-emerald-900/40 dark:border-emerald-500",
    defaultUrl: "https://api.openai.com/v1",
    icon: "✦",
    categories: ["chat", "embedding"] as const,
  },
  {
    value: "transformers" as const,
    label: "Transformers.js",
    color: "from-blue-500 to-indigo-600",
    bgLight: "bg-blue-50 border-blue-200 text-blue-700",
    bgDark: "dark:bg-blue-900/20 dark:border-blue-700/50 dark:text-blue-300",
    bgSelected:
      "bg-blue-100 border-blue-400 ring-2 ring-blue-400/30 dark:bg-blue-900/40 dark:border-blue-500",
    defaultUrl: "local",
    icon: "🏠",
    categories: ["embedding"] as const,
  },
  {
    value: "anthropic" as const,
    label: "Anthropic",
    color: "from-orange-500 to-amber-600",
    bgLight: "bg-orange-50 border-orange-200 text-orange-700",
    bgDark:
      "dark:bg-orange-900/20 dark:border-orange-700/50 dark:text-orange-300",
    bgSelected:
      "bg-orange-100 border-orange-400 ring-2 ring-orange-400/30 dark:bg-orange-900/40 dark:border-orange-500",
    defaultUrl: "https://api.anthropic.com",
    icon: "◈",
    categories: ["chat"] as const,
  },
  {
    value: "google" as const,
    label: "Google",
    color: "from-blue-500 to-sky-600",
    bgLight: "bg-blue-50 border-blue-200 text-blue-700",
    bgDark: "dark:bg-blue-900/20 dark:border-blue-700/50 dark:text-blue-300",
    bgSelected:
      "bg-blue-100 border-blue-400 ring-2 ring-blue-400/30 dark:bg-blue-900/40 dark:border-blue-500",
    defaultUrl: "https://generativelanguage.googleapis.com",
    icon: "◆",
    categories: ["chat"] as const,
  },
  {
    value: "custom" as const,
    label: "自定义",
    color: "from-violet-500 to-purple-600",
    bgLight: "bg-violet-50 border-violet-200 text-violet-700",
    bgDark:
      "dark:bg-violet-900/20 dark:border-violet-700/50 dark:text-violet-300",
    bgSelected:
      "bg-violet-100 border-violet-400 ring-2 ring-violet-400/30 dark:bg-violet-900/40 dark:border-violet-500",
    defaultUrl: "",
    icon: "⚙",
    categories: ["chat", "embedding"] as const,
  },
];

// ─── Form Schema ────────────────────────────────────────────
const formSchema = z.object({
  name: z.string().min(2, { message: "模型名称至少包含 2 个字符。" }),
  provider: z.enum(["openai", "google", "anthropic", "transformers", "custom"]),
  category: z.enum(["chat", "embedding"]),
  baseUrl: z.string().min(1, { message: "请输入 Base URL" }),
  apiKey: z.string().optional(),
  supportsImages: z.boolean(),
  isActive: z.boolean().optional(),
});

// ─── Props ──────────────────────────────────────────────────
interface ModelDialogProps {
  model?: {
    id: string;
    name: string;
    provider: "openai" | "google" | "anthropic" | "transformers" | "custom";
    category: "chat" | "embedding";
    baseUrl: string;
    apiKey?: string;
    supportsImages: boolean;
    isActive?: boolean;
  };
  trigger?: React.ReactNode;
}

export function ModelDialog({ model, trigger }: ModelDialogProps) {
  const { addModel, updateModel } = useModelContext();
  const [open, setOpen] = useState(false);
  const [showKey, setShowKey] = useState(false);

  const isEdit = !!model;

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: model?.name || "",
      provider: model?.provider || "openai",
      category: model?.category || "chat",
      baseUrl: model?.baseUrl || "https://api.openai.com/v1",
      apiKey: model?.apiKey || "",
      supportsImages: model?.supportsImages ?? true,
      isActive: model?.isActive ?? true,
    },
  });

  const selectedProvider = form.watch("provider");
  const supportsImages = form.watch("supportsImages");
  const selectedCategory = form.watch("category");

  // Reset form values when the model prop changes (e.g. opening edit on different model)
  useEffect(() => {
    if (open && model) {
      form.reset({
        name: model.name,
        provider: model.provider,
        category: model.category,
        baseUrl: model.baseUrl,
        apiKey: model.apiKey || "",
        supportsImages: model.supportsImages,
        isActive: model.isActive,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, model]);

  const handleProviderSelect = (
    providerValue:
      | "openai"
      | "google"
      | "anthropic"
      | "transformers"
      | "custom",
  ) => {
    form.setValue("provider", providerValue);
    const providerMeta = PROVIDERS.find((p) => p.value === providerValue);
    if (providerMeta?.defaultUrl) {
      form.setValue("baseUrl", providerMeta.defaultUrl);
    }
    // If provider doesn't support current category, switch to its first category
    if (
      providerMeta &&
      !(providerMeta.categories as readonly string[]).includes(selectedCategory)
    ) {
      form.setValue("category", providerMeta.categories[0] as any);
    }
  };

  const onSubmit = (values: z.infer<typeof formSchema>) => {
    if (isEdit && model) {
      updateModel(model.id, {
        name: values.name,
        provider: values.provider,
        category: values.category,
        baseUrl: values.baseUrl,
        apiKey: values.apiKey,
        supportsImages: values.supportsImages,
        isActive: values.isActive,
      });
    } else {
      addModel({
        id: uuidv4(),
        name: values.name,
        provider: values.provider,
        category: values.category,
        baseUrl: values.baseUrl,
        apiKey: values.apiKey,
        supportsImages: values.supportsImages,
        isActive: values.isActive,
      });
    }
    setOpen(false);
    setShowKey(false);
    if (!isEdit) {
      form.reset({
        name: "",
        provider: "openai",
        category: "chat",
        baseUrl: "https://api.openai.com/v1",
        apiKey: "",
        supportsImages: true,
        isActive: true,
      });
    }
  };

  const currentProviderMeta = PROVIDERS.find(
    (p) => p.value === selectedProvider,
  );

  const filteredProviders = PROVIDERS.filter((p) =>
    (p.categories as readonly string[]).includes(selectedCategory),
  );

  return (
    <Dialog
      open={open}
      onOpenChange={setOpen}
    >
      <DialogTrigger asChild>
        {trigger ? (
          trigger
        ) : (
          <Button className='gap-2 shadow-lg hover:scale-[1.02] active:scale-[0.98] transition-all bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl px-5 py-2.5'>
            <Plus className='h-4 w-4' />
            <span>添加模型</span>
          </Button>
        )}
      </DialogTrigger>

      <DialogContent
        className='sm:max-w-[540px] p-0 overflow-hidden border-0 shadow-2xl rounded-2xl bg-white dark:bg-slate-950'
        closeClassName='text-white hover:bg-white/20 transition-colors'
      >
        {/* ─── Header with gradient ─── */}
        <div
          className={`relative px-6 pt-6 pb-4 bg-gradient-to-br ${currentProviderMeta?.color || "from-blue-600 to-indigo-600"} transition-all duration-500`}
        >
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImEiIHBhdHRlcm5Vbml0cz0idXNlclNwYWNlT25Vc2UiIHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCI+PHBhdGggZD0iTTAgMGg2MHY2MEgweiIgZmlsbD0ibm9uZSIvPjxjaXJjbGUgY3g9IjMwIiBjeT0iMzAiIHI9IjEiIGZpbGw9InJnYmEoMjU1LDI1NSwyNTUscDAuMDgpIi8+PC9wYXR0ZXJuPjwvZGVmcz48cmVjdCBmaWxsPSJ1cmwoI2EpIiB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIi8+PC9zdmc+')] opacity-50" />
          <DialogHeader className='relative z-10'>
            <div className='flex items-center gap-3 mb-1'>
              <div className='p-2 bg-white/20 backdrop-blur-sm rounded-xl'>
                <Bot className='h-5 w-5 text-white' />
              </div>
              <DialogTitle className='text-xl font-bold text-white tracking-tight'>
                {isEdit ? "编辑模型" : "添加新模型"}
              </DialogTitle>
            </div>
            <DialogDescription className='text-white/70 text-sm pl-[3.25rem]'>
              {isEdit
                ? "修改现有的模型配置信息。"
                : "选择提供商并配置 API 连接信息。"}
            </DialogDescription>
          </DialogHeader>
        </div>

        {/* ─── Form Body ─── */}
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className='px-6 pb-6 pt-5 space-y-5'
          >
            {/* Category Toggle */}
            <FormField
              control={form.control}
              name='category'
              render={({ field }) => (
                <FormItem>
                  <FormLabel className='text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400'>
                    模型用途
                  </FormLabel>
                  <div className='flex gap-2 mt-1.5 p-1 bg-slate-100 dark:bg-slate-900 rounded-xl'>
                    <button
                      type='button'
                      onClick={() => field.onChange("chat")}
                      className={`flex-1 py-2 text-xs font-medium rounded-lg transition-all ${
                        field.value === "chat"
                          ? "bg-white dark:bg-slate-800 shadow-sm text-blue-600 dark:text-blue-400"
                          : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                      }`}
                    >
                      聊天补全 (Chat)
                    </button>
                    <button
                      type='button'
                      onClick={() => field.onChange("embedding")}
                      className={`flex-1 py-2 text-xs font-medium rounded-lg transition-all ${
                        field.value === "embedding"
                          ? "bg-white dark:bg-slate-800 shadow-sm text-blue-600 dark:text-blue-400"
                          : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                      }`}
                    >
                      向量嵌入 (Embedding)
                    </button>
                  </div>
                </FormItem>
              )}
            />

            {/* Provider Selector – Card Grid */}
            <FormField
              control={form.control}
              name='provider'
              render={() => (
                <FormItem>
                  <FormLabel className='text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400'>
                    选择提供商
                  </FormLabel>
                  <div className='grid grid-cols-4 gap-2 mt-1.5'>
                    {filteredProviders.map((p) => {
                      const isSelected = selectedProvider === p.value;
                      return (
                        <button
                          key={p.value}
                          type='button'
                          onClick={() => handleProviderSelect(p.value as any)}
                          className={`relative flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 transition-all duration-200 cursor-pointer hover:scale-[1.03] active:scale-[0.97] ${
                            isSelected
                              ? `${p.bgSelected} ${p.bgDark} shadow-md`
                              : `${p.bgLight} ${p.bgDark} border-transparent hover:shadow-sm`
                          }`}
                        >
                          {isSelected && (
                            <div className='absolute -top-1.5 -right-1.5 w-5 h-5 bg-green-500 rounded-full flex items-center justify-center shadow-md animate-in zoom-in-50 duration-200'>
                              <Check className='h-3 w-3 text-white' />
                            </div>
                          )}
                          <span className='text-xl leading-none'>{p.icon}</span>
                          <span className='text-[11px] font-semibold leading-tight'>
                            {p.label}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Model Name */}
            <FormField
              control={form.control}
              name='name'
              render={({ field }) => (
                <FormItem>
                  <FormLabel className='text-sm font-medium flex items-center gap-2'>
                    <Sparkles className='h-3.5 w-3.5 text-amber-500' />
                    模型名称
                  </FormLabel>
                  <FormControl>
                    <Input
                      placeholder={
                        selectedProvider === "transformers"
                          ? "例如：Xenova/bge-small-zh-v1.5"
                          : "例如：gpt-4o, text-embedding-3-small"
                      }
                      className='rounded-xl h-10 bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 focus:ring-2 focus:ring-blue-500/20 transition-shadow'
                      {...field}
                    />
                  </FormControl>
                  <p className='text-[11px] text-muted-foreground mt-1'>
                    {selectedProvider === "transformers"
                      ? "Hugging Face 模型 ID"
                      : "API 调用时使用的模型 ID"}
                  </p>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Base URL & API Key - Conditionally hide for transformers */}
            {selectedProvider !== "transformers" && (
              <>
                {/* Base URL */}
                <FormField
                  control={form.control}
                  name='baseUrl'
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className='text-sm font-medium flex items-center gap-2'>
                        <Globe className='h-3.5 w-3.5 text-blue-500' />
                        API Base URL
                      </FormLabel>
                      <FormControl>
                        <Input
                          placeholder='https://api.openai.com/v1'
                          className='rounded-xl h-10 font-mono text-sm bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 focus:ring-2 focus:ring-blue-500/20 transition-shadow'
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* API Key with visibility toggle */}
                <FormField
                  control={form.control}
                  name='apiKey'
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className='text-sm font-medium flex items-center gap-2'>
                        <KeyRound className='h-3.5 w-3.5 text-violet-500' />
                        API Key
                        <span className='text-[10px] text-muted-foreground font-normal px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 rounded-md'>
                          可选
                        </span>
                      </FormLabel>
                      <FormControl>
                        <div className='relative'>
                          <Input
                            type={showKey ? "text" : "password"}
                            placeholder='sk-...'
                            className='rounded-xl h-10 font-mono text-sm pr-10 bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 focus:ring-2 focus:ring-blue-500/20 transition-shadow'
                            {...field}
                          />
                          <button
                            type='button'
                            onClick={() => setShowKey(!showKey)}
                            className='absolute right-2.5 top-1/2 -translate-y-1/2 p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors'
                          >
                            {showKey ? (
                              <EyeOff className='h-4 w-4' />
                            ) : (
                              <Eye className='h-4 w-4' />
                            )}
                          </button>
                        </div>
                      </FormControl>
                      <p className='text-[11px] text-muted-foreground mt-1'>
                        如果不填，将使用环境变量中配置的 Key
                      </p>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </>
            )}

            {/* Vision Toggle (Only for Chat) */}
            {selectedCategory === "chat" && (
              <FormField
                control={form.control}
                name='supportsImages'
                render={() => (
                  <FormItem>
                    <button
                      type='button'
                      onClick={() =>
                        form.setValue("supportsImages", !supportsImages)
                      }
                      className={`w-full flex items-center justify-between p-3.5 rounded-xl border-2 transition-all duration-200 cursor-pointer ${
                        supportsImages
                          ? "bg-gradient-to-r from-green-50 to-emerald-50 border-green-300 dark:from-green-900/10 dark:to-emerald-900/10 dark:border-green-700/50"
                          : "bg-slate-50 border-slate-200 dark:bg-slate-900 dark:border-slate-800"
                      }`}
                    >
                      <div className='flex items-center gap-3'>
                        <div
                          className={`p-2 rounded-lg transition-colors ${
                            supportsImages
                              ? "bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400"
                              : "bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500"
                          }`}
                        >
                          <Eye className='h-4 w-4' />
                        </div>
                        <div className='text-left'>
                          <div className='text-sm font-medium'>视觉能力</div>
                          <div className='text-[11px] text-muted-foreground'>
                            {supportsImages
                              ? "支持图片输入（Vision）"
                              : "仅支持文本输入"}
                          </div>
                        </div>
                      </div>
                      {/* Custom toggle */}
                      <div
                        className={`relative w-11 h-6 rounded-full transition-colors duration-300 ${
                          supportsImages
                            ? "bg-green-500"
                            : "bg-slate-300 dark:bg-slate-600"
                        }`}
                      >
                        <div
                          className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow-md transition-transform duration-300 ${
                            supportsImages
                              ? "translate-x-[22px]"
                              : "translate-x-0.5"
                          }`}
                        />
                      </div>
                    </button>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {/* Active Toggle (Only for Embedding) */}
            {selectedCategory === "embedding" && (
              <FormField
                control={form.control}
                name='isActive'
                render={({ field }) => (
                  <FormItem>
                    <button
                      type='button'
                      onClick={() => field.onChange(!field.value)}
                      className={`w-full flex items-center justify-between p-3.5 rounded-xl border-2 transition-all duration-200 cursor-pointer ${
                        field.value
                          ? "bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-300 dark:from-blue-900/10 dark:to-indigo-900/10 dark:border-blue-700/50"
                          : "bg-slate-50 border-slate-200 dark:bg-slate-900 dark:border-slate-800"
                      }`}
                    >
                      <div className='flex items-center gap-3'>
                        <div
                          className={`p-2 rounded-lg transition-colors ${
                            field.value
                              ? "bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400"
                              : "bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500"
                          }`}
                        >
                          <Check className='h-4 w-4' />
                        </div>
                        <div className='text-left'>
                          <div className='text-sm font-medium'>
                            设置为默认 Embedding 模型
                          </div>
                          <div className='text-[11px] text-muted-foreground'>
                            {field.value
                              ? "系统将优先使用此模型进行向量化"
                              : "不作为默认模型"}
                          </div>
                        </div>
                      </div>
                      {/* Custom toggle */}
                      <div
                        className={`relative w-11 h-6 rounded-full transition-colors duration-300 ${
                          field.value
                            ? "bg-blue-500"
                            : "bg-slate-300 dark:bg-slate-600"
                        }`}
                      >
                        <div
                          className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow-md transition-transform duration-300 ${
                            field.value
                              ? "translate-x-[22px]"
                              : "translate-x-0.5"
                          }`}
                        />
                      </div>
                    </button>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {/* Submit */}
            <Button
              type='submit'
              className={`w-full h-11 rounded-xl font-semibold text-white shadow-lg transition-all duration-300 hover:shadow-xl hover:scale-[1.01] active:scale-[0.99] bg-gradient-to-r ${currentProviderMeta?.color || "from-blue-600 to-indigo-600"}`}
            >
              {isEdit ? "保存更改" : "保存模型配置"}
            </Button>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
