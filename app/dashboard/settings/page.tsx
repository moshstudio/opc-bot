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
} from "lucide-react";
import {
  updateEmailSettings,
  fetchEmailSettings,
} from "@/app/actions/notification-actions";
import { toast } from "sonner";

export default function SettingsPage() {
  const [companyName, setCompanyName] = useState("一人公司");
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);

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
      setLoading(false);
    }
    init();
  }, []);

  const handleSave = async () => {
    setLoading(true);
    const res = await updateEmailSettings(emailConfig);
    if (res.success) {
      setSaved(true);
      toast.success("系统设置已更新");
      setTimeout(() => setSaved(false), 2000);
    } else {
      toast.error(`更新失败: ${res.error}`);
    }
    setLoading(false);
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
        <Button
          onClick={handleSave}
          disabled={loading}
          className={`gap-2 shadow-lg hover:scale-[1.02] active:scale-[0.98] transition-all rounded-xl px-5 py-2.5 ${
            saved
              ? "bg-green-500 hover:bg-green-600"
              : "bg-gradient-to-r from-slate-700 to-slate-900 dark:from-slate-200 dark:to-slate-400 dark:text-slate-900 hover:opacity-90"
          } text-white`}
        >
          {saved ? (
            <>
              <CheckCircle className='h-4 w-4' />
              <span>已保存</span>
            </>
          ) : (
            <>
              <Save className='h-4 w-4' />
              <span>保存设置</span>
            </>
          )}
        </Button>
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
                重置公司数据将删除所有员工、任务和知识库信息。
              </p>
            </div>
            <Button
              variant='outline'
              className='rounded-xl border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors'
            >
              重置公司
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
