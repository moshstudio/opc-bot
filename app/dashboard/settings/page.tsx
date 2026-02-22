"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Building2,
  Globe,
  Bell,
  Shield,
  Palette,
  Save,
  CheckCircle,
  Mail,
  Server,
  User,
  Key,
  AtSign,
  Brain,
  Sparkles,
  Lock,
  Settings,
} from "lucide-react";
import {
  updateEmailSettings,
  fetchEmailSettings,
} from "@/app/actions/notification-actions";
import {
  getAiModels,
  getBrainModelId,
  setBrainModel,
  getLabelGenModelId,
  setLabelGenModel,
} from "@/app/actions/ai-models";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  getOrCreateCompany,
  deleteCompany,
  updateCompany,
  getBackgroundSchedulerStatus,
  setBackgroundSchedulerStatus,
} from "@/app/actions/company-actions";
import { toast } from "sonner";
import { useCallback } from "react";

export default function SettingsPage() {
  const [companyName, setCompanyName] = useState("一人公司");
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);
  const [brainModelId, setBrainModelId] = useState<string>("");
  const [labelGenModelId, setLabelGenModelId] = useState<string>("");
  const [chatModels, setChatModels] = useState<any[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [isBackgroundRunning, setIsBackgroundRunning] = useState(false);

  // Email Configuration State
  const [emailConfig, setEmailConfig] = useState({
    host: "",
    port: 587,
    secure: false,
    user: "",
    pass: "",
    to: "",
    from: "",
  });

  useEffect(() => {
    async function init() {
      const res = await fetchEmailSettings();
      if (res.success && res.config) {
        setEmailConfig(res.config);
      }
      const companyRes = await getOrCreateCompany();
      if (companyRes.success && companyRes.company) {
        setCompanyId(companyRes.company.id);
        setCompanyName(companyRes.company.name);
      }

      const models = await getAiModels();
      setChatModels(models.filter((m: any) => m.category === "chat"));

      const bId = await getBrainModelId();
      if (bId) setBrainModelId(bId);

      const lId = await getLabelGenModelId();
      if (lId) setLabelGenModelId(lId);

      const backgroundStatus = await getBackgroundSchedulerStatus();
      setIsBackgroundRunning(backgroundStatus);

      setLoading(false);
    }
    init();
  }, []);

  const handleSave = useCallback(
    async (showToast = true) => {
      setIsSaving(true);
      try {
        const results = await Promise.all([
          updateEmailSettings(emailConfig),
          brainModelId
            ? setBrainModel(brainModelId)
            : (Promise.resolve({ success: true }) as any),
          companyId
            ? updateCompany(companyId, { name: companyName })
            : (Promise.resolve({ success: true }) as any),
          setLabelGenModel(labelGenModelId),
          setBackgroundSchedulerStatus(isBackgroundRunning),
        ]);

        const allSuccess = results.every((r) => r.success);

        if (allSuccess) {
          setSaved(true);
          if (showToast) {
            toast.success("系统设置已更新");
          }
          setTimeout(() => setSaved(false), 2000);
        } else {
          const firstError = results.find((r) => !r.success);
          toast.error(`更新失败: ${firstError?.error || "部分设置保存失败"}`);
        }
      } catch (error) {
        console.error("Save error:", error);
      } finally {
        setIsSaving(false);
      }
    },
    [
      emailConfig,
      brainModelId,
      labelGenModelId,
      companyId,
      companyName,
      isBackgroundRunning,
    ],
  );

  // Auto-save logic
  useEffect(() => {
    // Skip auto-save on initial load
    if (loading) return;

    const timer = setTimeout(() => {
      handleSave(false);
    }, 1500); // 1.5 seconds debounce

    return () => clearTimeout(timer);
  }, [handleSave, loading]);

  const handleDeleteCompany = async () => {
    if (!companyId) return;

    setIsDeleting(true);
    const res = await deleteCompany(companyId);
    if (res.success) {
      toast.success("公司已删除，正在刷新...");
      window.location.href = "/dashboard";
    } else {
      toast.error(`删除失败: ${res.error}`);
      setIsDeleting(false);
    }
  };

  // Helper component for setting items
  const SettingItem = ({
    icon: Icon,
    label,
    desc,
    content,
    bgColor,
    alignTop = false,
  }: {
    icon: any;
    label: string;
    desc: string;
    content: React.ReactNode;
    bgColor: string;
    alignTop?: boolean;
  }) => (
    <div
      className={`flex flex-col md:flex-row ${alignTop ? "md:items-start" : "md:items-center"} justify-between p-5 hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-colors group`}
    >
      <div
        className={`flex items-start gap-4 mb-4 md:mb-0 ${alignTop ? "pt-1" : ""}`}
      >
        <div
          className={`p-2.5 rounded-xl bg-gradient-to-br ${bgColor} shadow-sm shrink-0`}
        >
          <Icon className='h-4 w-4 text-white' />
        </div>
        <div>
          <div className='text-sm font-medium text-slate-900 dark:text-slate-100'>
            {label}
          </div>
          <div className='text-[11px] text-slate-500 dark:text-slate-400 mt-1.5 max-w-[280px] leading-relaxed'>
            {desc}
          </div>
        </div>
      </div>
      <div className='w-full md:w-auto md:min-w-[280px] flex md:justify-end'>
        {content}
      </div>
    </div>
  );

  return (
    <div className='container mx-auto p-6 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-5xl pb-24'>
      {/* Header */}
      <div className='flex flex-col md:flex-row md:items-center justify-between gap-6'>
        <div>
          <div className='inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-800 mb-3 text-xs font-medium text-slate-600 dark:text-slate-300'>
            <Settings className='w-3.5 h-3.5' />
            偏好与配置
          </div>
          <h2 className='text-3xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-slate-800 to-slate-500 dark:from-slate-100 dark:to-slate-400'>
            系统设置
          </h2>
          <p className='text-slate-500 dark:text-slate-400 mt-2 text-sm'>
            管理公司基本资料、邮件服务参数、AI 核心大脑以及安全选项。
          </p>
        </div>
        <div className='flex items-center gap-4'>
          <Button
            onClick={() => handleSave(true)}
            disabled={loading || isSaving}
            className={`gap-2 shadow-sm hover:shadow-md hover:scale-[1.01] active:scale-[0.98] transition-all rounded-xl px-6 py-2 h-11 ${
              saved
                ? "bg-emerald-500 hover:bg-emerald-600 text-white"
                : "bg-gradient-to-r from-slate-800 to-slate-900 dark:from-slate-100 dark:to-slate-300 dark:text-slate-900 text-white"
            }`}
          >
            {isSaving ? (
              <>
                <div className='h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent' />
                <span>保存中...</span>
              </>
            ) : saved ? (
              <>
                <CheckCircle className='h-4 w-4' />
                <span>已保存</span>
              </>
            ) : (
              <>
                <Save className='h-4 w-4' />
                <span>立即保存</span>
              </>
            )}
          </Button>
        </div>
      </div>

      {loading ? (
        <div className='h-[400px] flex items-center justify-center'>
          <div className='flex flex-col items-center gap-4 text-slate-400'>
            <div className='h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-blue-500' />
            <span className='text-sm font-medium'>加载配置中...</span>
          </div>
        </div>
      ) : (
        <Tabs
          defaultValue='general'
          className='w-full'
        >
          <TabsList className='grid grid-cols-2 md:grid-cols-4 lg:w-[600px] h-auto p-1 bg-slate-100/50 dark:bg-slate-800/50 backdrop-blur-sm rounded-2xl mb-6'>
            <TabsTrigger
              value='general'
              className='rounded-xl py-2.5 data-[state=active]:shadow-sm transition-all duration-300 text-xs font-medium'
            >
              基础设置
            </TabsTrigger>
            <TabsTrigger
              value='ai'
              className='rounded-xl py-2.5 data-[state=active]:shadow-sm transition-all duration-300 text-xs font-medium'
            >
              AI 模型
            </TabsTrigger>
            <TabsTrigger
              value='notification'
              className='rounded-xl py-2.5 data-[state=active]:shadow-sm transition-all duration-300 text-xs font-medium'
            >
              邮件与通知
            </TabsTrigger>
            <TabsTrigger
              value='advanced'
              className='rounded-xl py-2.5 data-[state=active]:shadow-sm transition-all duration-300 text-xs font-medium'
            >
              高级设置
            </TabsTrigger>
          </TabsList>

          {/* ------------- General Tab ------------- */}
          <TabsContent
            value='general'
            className='space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300'
          >
            <Card className='border-0 shadow-sm bg-white dark:bg-slate-900 rounded-2xl overflow-hidden ring-1 ring-slate-100 dark:ring-slate-800'>
              <CardContent className='p-0 divide-y divide-slate-100 dark:divide-slate-800/50'>
                <SettingItem
                  icon={Building2}
                  label='公司名称'
                  desc='您的组织在系统中显示的全局标识名称'
                  bgColor='from-blue-500 to-indigo-500'
                  content={
                    <Input
                      value={companyName}
                      onChange={(e) => setCompanyName(e.target.value)}
                      className='rounded-xl h-10 w-full bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 focus-visible:ring-indigo-500/30'
                    />
                  }
                />
                <SettingItem
                  icon={Globe}
                  label='语言'
                  desc='目前系统界面的显示语言偏好'
                  bgColor='from-emerald-500 to-teal-500'
                  content={
                    <div className='flex w-full justify-end'>
                      <span className='text-xs font-medium text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50 px-3 py-1.5 rounded-lg border border-emerald-100 dark:border-emerald-900'>
                        简体中文
                      </span>
                    </div>
                  }
                />
                <SettingItem
                  icon={Palette}
                  label='主题'
                  desc='界面外观风格配置'
                  bgColor='from-violet-500 to-purple-500'
                  content={
                    <div className='flex w-full justify-end'>
                      <span className='text-xs font-medium text-violet-700 dark:text-violet-400 bg-violet-50 dark:bg-violet-950/50 px-3 py-1.5 rounded-lg border border-violet-100 dark:border-violet-900'>
                        跟随系统自动切换
                      </span>
                    </div>
                  }
                />
              </CardContent>
            </Card>
          </TabsContent>

          {/* ------------- AI Models Tab ------------- */}
          <TabsContent
            value='ai'
            className='space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300'
          >
            <Card className='border-0 shadow-sm bg-white dark:bg-slate-900 rounded-2xl overflow-hidden ring-1 ring-slate-100 dark:ring-slate-800'>
              <CardContent className='p-0 divide-y divide-slate-100 dark:divide-slate-800/50'>
                <SettingItem
                  icon={Brain}
                  label='大脑中枢 (Brain) 配置'
                  desc='指定用于系统底层复杂任务分析、规划拆解和工作流智能决策的核心模型。'
                  bgColor='from-blue-600 to-indigo-600'
                  content={
                    <div className='w-full'>
                      <Select
                        value={brainModelId}
                        onValueChange={setBrainModelId}
                      >
                        <SelectTrigger className='rounded-xl h-10 bg-slate-50 dark:bg-slate-950 focus:ring-blue-500/30'>
                          <SelectValue placeholder='请选择大脑模型' />
                        </SelectTrigger>
                        <SelectContent>
                          {chatModels.length > 0 ? (
                            chatModels.map((m) => (
                              <SelectItem
                                key={m.id}
                                value={m.id}
                              >
                                {m.name}{" "}
                                <span className='text-slate-400 ml-1 text-[10px]'>
                                  ({m.provider})
                                </span>
                              </SelectItem>
                            ))
                          ) : (
                            <SelectItem
                              value='none'
                              disabled
                            >
                              未发现可用聊天模型
                            </SelectItem>
                          )}
                        </SelectContent>
                      </Select>
                      <p className='text-[10px] text-slate-400 mt-2 flex items-center gap-1.5'>
                        <Shield className='w-3 h-3' />
                        建议选择推理能力最强的旗舰模型（如 GPT-4o, Claude 3.5
                        Sonnet）
                      </p>
                    </div>
                  }
                />
                <SettingItem
                  icon={Sparkles}
                  label='AI 标签生成器配置'
                  desc='专用于自动为画布中的工作流节点生成精准简短的标题概括。留空代表禁用此功能。'
                  bgColor='from-violet-600 to-fuchsia-600'
                  content={
                    <div className='w-full'>
                      <Select
                        value={labelGenModelId}
                        onValueChange={setLabelGenModelId}
                      >
                        <SelectTrigger className='rounded-xl h-10 bg-slate-50 dark:bg-slate-950 focus:ring-violet-500/30'>
                          <SelectValue placeholder='选择生成模型 (留空禁用)' />
                        </SelectTrigger>
                        <SelectContent className='max-h-60'>
                          <SelectItem
                            value='none'
                            className='text-slate-500'
                          >
                            🚫 禁用自动生成
                          </SelectItem>
                          {chatModels.map((m) => (
                            <SelectItem
                              key={m.id}
                              value={m.id}
                            >
                              {m.name}{" "}
                              <span className='text-slate-400 ml-1 text-[10px]'>
                                ({m.provider})
                              </span>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <p className='text-[10px] text-slate-400 mt-2 flex items-center gap-1.5'>
                        <div className='w-1.5 h-1.5 border-t border-r border-slate-400 rotate-45 shrink-0' />
                        建议选择生成速度快、性价高的模型（如
                        gpt-4o-mini）以提升画布体验
                      </p>
                    </div>
                  }
                />
              </CardContent>
            </Card>
          </TabsContent>

          {/* ------------- Notifications Tab ------------- */}
          <TabsContent
            value='notification'
            className='space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300'
          >
            <Card className='border-0 shadow-sm bg-white dark:bg-slate-900 rounded-2xl overflow-hidden ring-1 ring-slate-100 dark:ring-slate-800'>
              <CardHeader className='bg-slate-50/50 dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800'>
                <div className='flex items-center gap-3'>
                  <div className='p-2.5 rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 shadow-sm'>
                    <Mail className='w-4 h-4 text-white' />
                  </div>
                  <div>
                    <CardTitle className='text-base text-slate-800 dark:text-slate-200'>
                      邮箱 SMTP 服务器配置
                    </CardTitle>
                    <CardDescription className='text-xs mt-1'>
                      配置邮件发送服务器，用于接收系统中 Ivy
                      等数字员工的总结汇报邮件。
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className='p-6'>
                <div className='grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6 w-full'>
                  <div className='space-y-2.5'>
                    <Label className='text-xs text-slate-600 dark:text-slate-400 flex items-center gap-2'>
                      <Server className='w-3.5 h-3.5' /> 邮箱发送服务器 (Host)
                    </Label>
                    <Input
                      placeholder='例如: smtp.example.com'
                      value={emailConfig.host}
                      onChange={(e) =>
                        setEmailConfig({ ...emailConfig, host: e.target.value })
                      }
                      className='rounded-xl h-10 bg-slate-50 dark:bg-slate-950 focus-visible:ring-amber-500/30'
                    />
                  </div>
                  <div className='space-y-2.5'>
                    <Label className='text-xs text-slate-600 dark:text-slate-400 flex items-center gap-2'>
                      <Settings className='w-3.5 h-3.5' /> 连接端口 (Port)
                    </Label>
                    <Input
                      type='number'
                      placeholder='例如: 465 或 587'
                      value={emailConfig.port}
                      onChange={(e) =>
                        setEmailConfig({
                          ...emailConfig,
                          port: Number(e.target.value),
                        })
                      }
                      className='rounded-xl h-10 bg-slate-50 dark:bg-slate-950 focus-visible:ring-amber-500/30'
                    />
                  </div>
                  <div className='space-y-2.5'>
                    <Label className='text-xs text-slate-600 dark:text-slate-400 flex items-center gap-2'>
                      <User className='w-3.5 h-3.5' /> 登录用户名
                    </Label>
                    <Input
                      placeholder='发送者邮箱, 例: robot@domain.com'
                      value={emailConfig.user}
                      onChange={(e) =>
                        setEmailConfig({ ...emailConfig, user: e.target.value })
                      }
                      className='rounded-xl h-10 bg-slate-50 dark:bg-slate-950 focus-visible:ring-amber-500/30'
                    />
                  </div>
                  <div className='space-y-2.5'>
                    <Label className='text-xs text-slate-600 dark:text-slate-400 flex items-center gap-2'>
                      <Key className='w-3.5 h-3.5' /> 密码 / 应用专用授权码
                    </Label>
                    <Input
                      type='password'
                      placeholder='••••••••••••••••'
                      value={emailConfig.pass}
                      onChange={(e) =>
                        setEmailConfig({ ...emailConfig, pass: e.target.value })
                      }
                      className='rounded-xl h-10 bg-slate-50 dark:bg-slate-950 focus-visible:ring-amber-500/30'
                    />
                  </div>
                  <div className='space-y-2.5 md:col-span-2 mt-2 pt-6 border-t border-slate-100 dark:border-slate-800/60'>
                    <Label className='text-xs text-slate-600 dark:text-slate-400 flex items-center gap-2'>
                      <AtSign className='w-3.5 h-3.5 text-blue-500' />{" "}
                      最终接收通知的邮箱目标
                    </Label>
                    <Input
                      placeholder='您的个人或工作邮箱, 例如: boss@domain.com'
                      value={emailConfig.to}
                      onChange={(e) =>
                        setEmailConfig({ ...emailConfig, to: e.target.value })
                      }
                      className='rounded-xl h-11 bg-slate-50 dark:bg-slate-950 border-blue-200 dark:border-blue-900/50 focus-visible:ring-blue-500/30'
                    />
                    <p className='text-[11px] text-slate-400 mt-1'>
                      系统所有的提醒与汇总均会发送至此邮箱地址。
                    </p>
                  </div>

                  <div className='md:col-span-2 flex items-center space-x-3 pt-2'>
                    <Switch
                      id='secure'
                      checked={emailConfig.secure}
                      onCheckedChange={(checked) =>
                        setEmailConfig({ ...emailConfig, secure: checked })
                      }
                      className='data-[state=checked]:bg-amber-500'
                    />
                    <div className='grid gap-1'>
                      <Label
                        htmlFor='secure'
                        className='text-sm font-medium cursor-pointer'
                      >
                        启用安全连接 (SSL/TLS)
                      </Label>
                      <p className='text-[10px] text-slate-400'>
                        通常使用 465 端口时需要开启此选项，而 587 端口可能使用
                        STARTTLS 而无需勾选完全 SSL。
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className='border-0 shadow-sm bg-white dark:bg-slate-900 rounded-2xl overflow-hidden ring-1 ring-slate-100 dark:ring-slate-800'>
              <CardContent className='p-0'>
                <SettingItem
                  icon={Bell}
                  label='系统扫描与通知频率限制'
                  desc='开发模式下的全局通知触发安全限制'
                  bgColor='from-indigo-500 to-violet-500'
                  content={
                    <div className='flex w-full justify-end'>
                      <span className='text-xs font-medium text-indigo-700 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/50 px-3 py-1.5 rounded-lg border border-indigo-100 dark:border-indigo-900'>
                        上限: 每 30 分钟 / 次
                      </span>
                    </div>
                  }
                />
              </CardContent>
            </Card>
          </TabsContent>

          {/* ------------- Advanced Tab ------------- */}
          <TabsContent
            value='advanced'
            className='space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300'
          >
            <Card className='border-0 shadow-sm bg-white dark:bg-slate-900 rounded-2xl overflow-hidden ring-1 ring-slate-100 dark:ring-slate-800'>
              <CardContent className='p-0 divide-y divide-slate-100 dark:divide-slate-800/50'>
                <SettingItem
                  icon={Lock}
                  label='账户安全与身份认证'
                  desc='配置多设备登录、密码策略及审计日志'
                  bgColor='from-slate-600 to-slate-800'
                  content={
                    <div className='flex w-full justify-end'>
                      <span className='text-xs font-medium text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700'>
                        开发建设中
                      </span>
                    </div>
                  }
                />
                <SettingItem
                  icon={Server}
                  label='后台异步任务与定时器运行'
                  desc='开启后，即使无活跃公司或用户离线，底层引擎的任务中心及 Cron 触发器也会在后台持续监听和运行。关闭时则暂停全局异步挂起任务。'
                  bgColor='from-blue-500 to-cyan-500'
                  content={
                    <div className='flex items-center space-x-3 w-full justify-end bg-slate-50 dark:bg-slate-900/50 p-3 rounded-xl border border-slate-100 dark:border-slate-800'>
                      <div className='flex flex-col items-end'>
                        <Label
                          htmlFor='background-scheduler'
                          className={`text-sm font-medium ${isBackgroundRunning ? "text-blue-600 dark:text-blue-400" : "text-slate-500"}`}
                        >
                          {isBackgroundRunning
                            ? "持续运行中"
                            : "已暂停后台任务"}
                        </Label>
                      </div>
                      <Switch
                        id='background-scheduler'
                        checked={isBackgroundRunning}
                        onCheckedChange={setIsBackgroundRunning}
                        className='data-[state=checked]:bg-blue-500'
                      />
                    </div>
                  }
                />
              </CardContent>
            </Card>

            {/* Danger Zone */}
            <Card className='border border-red-200 dark:border-red-900/50 bg-red-50/30 dark:bg-red-950/20 rounded-2xl overflow-hidden'>
              <CardContent className='p-6'>
                <div className='flex flex-col md:flex-row md:items-center justify-between gap-6'>
                  <div className='flex gap-4'>
                    <div className='p-2.5 rounded-xl bg-red-100 dark:bg-red-900/50 text-red-600 dark:text-red-400 shrink-0 h-fit'>
                      <Shield className='w-5 h-5' />
                    </div>
                    <div>
                      <div className='text-sm font-bold text-red-700 dark:text-red-400'>
                        危险操作区
                      </div>
                      <p className='text-xs text-red-600/70 dark:text-red-400/70 mt-1 max-w-md leading-relaxed'>
                        此操作将永久抹除当前【{companyName}】实体档案。
                        <br />
                        删除后，该组织下属的所有数字员工、自动任务编排、流转记录与各类配置均将
                        <strong>不可恢复地清除</strong>。
                      </p>
                    </div>
                  </div>

                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant='destructive'
                        disabled={isDeleting || !companyId}
                        className='rounded-xl shadow-sm hover:shadow-md transition-all shrink-0 md:min-w-[140px]'
                      >
                        {isDeleting ? "正在粉碎数据..." : "彻底删除本公司"}
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent className='rounded-2xl'>
                      <AlertDialogHeader>
                        <AlertDialogTitle className='text-red-600 flex items-center gap-2'>
                          <Shield className='w-5 h-5' /> 获取最终确认
                        </AlertDialogTitle>
                        <AlertDialogDescription className='pt-2 text-slate-600 dark:text-slate-300'>
                          您即将彻底删除 <strong>{companyName}</strong>。
                          <br />
                          <br />
                          此操作一旦执行将不可逆转。所有绑定的任务记录、员工配置信息都将被系统清理回收，确定要继续吗？
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter className='mt-4 gap-2 sm:gap-0'>
                        <AlertDialogCancel className='rounded-xl'>
                          取消留存
                        </AlertDialogCancel>
                        <AlertDialogAction
                          onClick={handleDeleteCompany}
                          className='bg-red-600 hover:bg-red-700 text-white rounded-xl'
                        >
                          我明白后果，确认删除
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
