"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
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
} from "lucide-react";
import {
  updateEmailSettings,
  fetchEmailSettings,
} from "@/app/actions/notification-actions";
import {
  getAiModels,
  getBrainModelId,
  setBrainModel,
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
    [emailConfig, brainModelId, companyId, companyName, isBackgroundRunning],
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

  const sections = [
    {
      icon: Building2,
      label: "公司名称",
      desc: "您的组织显示名称",
      color: "text-blue-500",
      bgColor: "from-blue-500 to-indigo-500",
      content: (
        <Input
          value={companyName}
          onChange={(e) => setCompanyName(e.target.value)}
          className='rounded-xl h-10 bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 max-w-sm'
        />
      ),
    },
    {
      icon: Mail,
      label: "邮箱通知配置",
      desc: "配置 SMTP 服务器以接收艾薇 (Ivy) 的邮件总结",
      color: "text-amber-500",
      bgColor: "from-amber-500 to-orange-500",
      content: (
        <div className='grid grid-cols-1 md:grid-cols-2 gap-4 w-full max-w-2xl mt-4'>
          <div className='space-y-2'>
            <Label className='text-[11px] uppercase tracking-wider text-slate-500 font-bold flex items-center gap-2'>
              <Server className='w-3 h-3' /> SMTP 服务器
            </Label>
            <Input
              placeholder='smtp.example.com'
              value={emailConfig.host}
              onChange={(e) =>
                setEmailConfig({ ...emailConfig, host: e.target.value })
              }
              className='rounded-xl h-9 bg-slate-50 dark:bg-slate-900'
            />
          </div>
          <div className='space-y-2'>
            <Label className='text-[11px] uppercase tracking-wider text-slate-500 font-bold flex items-center gap-2'>
              <div className='w-3 h-3' /> 端口
            </Label>
            <Input
              type='number'
              placeholder='587'
              value={emailConfig.port}
              onChange={(e) =>
                setEmailConfig({ ...emailConfig, port: Number(e.target.value) })
              }
              className='rounded-xl h-9 bg-slate-50 dark:bg-slate-900'
            />
          </div>
          <div className='space-y-2'>
            <Label className='text-[11px] uppercase tracking-wider text-slate-500 font-bold flex items-center gap-2'>
              <User className='w-3 h-3' /> 用户名
            </Label>
            <Input
              placeholder='user@example.com'
              value={emailConfig.user}
              onChange={(e) =>
                setEmailConfig({ ...emailConfig, user: e.target.value })
              }
              className='rounded-xl h-9 bg-slate-50 dark:bg-slate-900'
            />
          </div>
          <div className='space-y-2'>
            <Label className='text-[11px] uppercase tracking-wider text-slate-500 font-bold flex items-center gap-2'>
              <Key className='w-3 h-3' /> 密码/授权码
            </Label>
            <Input
              type='password'
              placeholder='••••••••'
              value={emailConfig.pass}
              onChange={(e) =>
                setEmailConfig({ ...emailConfig, pass: e.target.value })
              }
              className='rounded-xl h-9 bg-slate-50 dark:bg-slate-900'
            />
          </div>
          <div className='space-y-2'>
            <Label className='text-[11px] uppercase tracking-wider text-slate-500 font-bold flex items-center gap-2'>
              <AtSign className='w-3 h-3' /> 接收通知邮箱
            </Label>
            <Input
              placeholder='boss@example.com'
              value={emailConfig.to}
              onChange={(e) =>
                setEmailConfig({ ...emailConfig, to: e.target.value })
              }
              className='rounded-xl h-9 bg-slate-50 dark:bg-slate-900'
            />
          </div>
          <div className='flex items-center space-x-2 pt-8'>
            <Switch
              id='secure'
              checked={emailConfig.secure}
              onCheckedChange={(checked) =>
                setEmailConfig({ ...emailConfig, secure: checked })
              }
            />
            <Label
              htmlFor='secure'
              className='text-xs'
            >
              使用 SSL/TLS (通常端口 465 需要)
            </Label>
          </div>
        </div>
      ),
    },
    {
      icon: Brain,
      label: "大脑中枢 (Brain) 配置",
      desc: "指定用于任务分析、拆解和决策的核心模型",
      color: "text-blue-600",
      bgColor: "from-blue-600 to-indigo-600",
      content: (
        <div className='w-full max-w-sm mt-2'>
          <Select
            value={brainModelId}
            onValueChange={setBrainModelId}
          >
            <SelectTrigger className='rounded-xl h-10 bg-slate-50 dark:bg-slate-900'>
              <SelectValue placeholder='请选择大脑模型' />
            </SelectTrigger>
            <SelectContent>
              {chatModels.length > 0 ? (
                chatModels.map((m) => (
                  <SelectItem
                    key={m.id}
                    value={m.id}
                  >
                    {m.name} ({m.provider})
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
          <p className='text-[10px] text-slate-500 mt-2'>
            建议选择推理能力最强的模型（如 GPT-4o, Claude 3.5 Sonnet）
          </p>
        </div>
      ),
    },
    {
      icon: Globe,
      label: "语言",
      desc: "界面语言偏好",
      color: "text-emerald-500",
      bgColor: "from-emerald-500 to-teal-500",
      content: (
        <span className='text-sm text-slate-500 bg-slate-100 dark:bg-slate-800 px-3 py-1.5 rounded-lg'>
          简体中文
        </span>
      ),
    },
    {
      icon: Palette,
      label: "主题",
      desc: "界面外观风格",
      color: "text-violet-500",
      bgColor: "from-violet-500 to-purple-500",
      content: (
        <span className='text-sm text-slate-500 bg-slate-100 dark:bg-slate-800 px-3 py-1.5 rounded-lg'>
          跟随系统
        </span>
      ),
    },
    {
      icon: Bell,
      label: "通知频率",
      desc: "Ivy 助理运行扫描的频率",
      color: "text-violet-500",
      bgColor: "from-indigo-500 to-violet-500",
      content: (
        <span className='text-sm text-slate-500 bg-slate-100 dark:bg-slate-800 px-3 py-1.5 rounded-lg'>
          每 30 分钟 (开发模式限制)
        </span>
      ),
    },
    {
      icon: Shield,
      label: "安全",
      desc: "账户安全和权限设置",
      color: "text-red-500",
      bgColor: "from-red-500 to-rose-500",
      content: (
        <span className='text-sm text-slate-500 bg-slate-100 dark:bg-slate-800 px-3 py-1.5 rounded-lg'>
          开发中
        </span>
      ),
    },
    {
      icon: Server,
      label: "后台任务与定时器运行",
      desc: "开启后，即使切换公司或离线，任务中心的任务及定时触发器也会在后台继续执行；关闭时则暂停无活跃公司时的异步状态。",
      color: "text-indigo-500",
      bgColor: "from-indigo-500 to-blue-500",
      content: (
        <div className='flex items-center space-x-2'>
          <Switch
            id='background-scheduler'
            checked={isBackgroundRunning}
            onCheckedChange={setIsBackgroundRunning}
          />
          <Label
            htmlFor='background-scheduler'
            className='text-xs'
          >
            {isBackgroundRunning ? "保持后台运行" : "已关闭"}
          </Label>
        </div>
      ),
    },
  ];

  return (
    <div className='container mx-auto p-6 space-y-8 animate-in fade-in duration-500 max-w-4xl pb-20'>
      {/* Header */}
      <div className='flex flex-col md:flex-row md:items-center justify-between gap-4'>
        <div>
          <h2 className='text-3xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-slate-700 to-slate-900 dark:from-slate-200 dark:to-slate-400'>
            系统设置
          </h2>
          <p className='text-muted-foreground mt-2 text-lg'>
            管理公司设置、邮件服务和 AI 助理偏好。
          </p>
        </div>
        <div className='flex flex-col md:flex-row md:items-center gap-4'>
          <Button
            onClick={() => handleSave(true)}
            disabled={loading || isSaving}
            className={`gap-2 shadow-lg hover:scale-[1.02] active:scale-[0.98] transition-all rounded-xl px-5 py-2.5 ${
              saved
                ? "bg-green-500 hover:bg-green-600 text-white"
                : "bg-gradient-to-r from-slate-700 to-slate-900 dark:from-slate-200 dark:to-slate-400 dark:text-slate-900 text-white"
            }`}
          >
            {isSaving ? (
              <>
                <div className='h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent' />
                <span>正在保存...</span>
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

      {/* Settings List */}
      <Card className='border-0 shadow-sm bg-white dark:bg-slate-900 rounded-2xl overflow-hidden'>
        <CardContent className='p-0 divide-y divide-slate-100 dark:divide-slate-800'>
          {sections.map((section, idx) => {
            const SectionIcon = section.icon;
            return (
              <div
                key={idx}
                className={`flex flex-col md:flex-row md:items-center justify-between p-6 hover:bg-slate-50/80 dark:hover:bg-slate-800/30 transition-colors group ${section.label === "邮箱通知配置" ? "items-start" : ""}`}
              >
                <div className='flex items-start gap-4 mb-4 md:mb-0'>
                  <div
                    className={`p-2.5 rounded-xl bg-gradient-to-br ${section.bgColor} shadow-sm`}
                  >
                    <SectionIcon className='h-4 w-4 text-white' />
                  </div>
                  <div>
                    <div className='text-sm font-semibold text-slate-900 dark:text-slate-100'>
                      {section.label}
                    </div>
                    <div className='text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 max-w-[200px]'>
                      {section.desc}
                    </div>
                  </div>
                </div>
                <div className='w-full md:w-auto'>{section.content}</div>
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* Danger Zone */}
      <Card className='border-2 border-red-200 dark:border-red-900/50 bg-red-50/50 dark:bg-red-900/10 rounded-2xl'>
        <CardContent className='p-5'>
          <div className='flex items-center justify-between'>
            <div>
              <div className='text-sm font-semibold text-red-700 dark:text-red-400'>
                危险操作
              </div>
              <p className='text-[11px] text-red-600/70 dark:text-red-400/70 mt-0.5'>
                删除当前公司将永久删除包含的所有员工、任务、文件记录。此操作不可逆。
              </p>
            </div>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant='outline'
                  disabled={isDeleting || !companyId}
                  className='rounded-xl border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors'
                >
                  {isDeleting ? "删除中..." : "删除当前公司"}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>确认删除？</AlertDialogTitle>
                  <AlertDialogDescription>
                    确定要删除当前公司吗？此操作不可逆！删除当前公司将永久删除包含的所有员工、任务、文件记录。
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>取消</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleDeleteCompany}
                    className='bg-red-600 hover:bg-red-700 text-white'
                  >
                    确定删除
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
