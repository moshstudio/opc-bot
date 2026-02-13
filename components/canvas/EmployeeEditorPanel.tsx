"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Settings,
  Workflow,
  Shield,
  MessageSquare,
  Save,
  Loader2,
  X,
  Users,
  Bot,
  ChevronLeft,
  Activity,
} from "lucide-react";
import { updateEmployee } from "@/app/actions/employee-actions";
import { updateEmployeeWorkflow } from "@/app/actions/employee-actions";
import { useModelContext } from "@/components/ModelContext";
import { toast } from "sonner";
import WorkflowCanvas from "@/components/canvas/workflow/WorkflowCanvas";
import { WorkflowDefinition } from "@/lib/workflow/types";
import { EmployeeChatPanel } from "./EmployeeChatPanel";
import { EmployeeLogPanel } from "./EmployeeLogPanel";

type TabType = "config" | "workflow" | "permissions" | "chat" | "log";

interface EmployeeEditorPanelProps {
  employee: any;
  allEmployees: { id: string; name: string; role: string }[];
  onClose: () => void;
  onUpdate: (updatedEmployee: any) => void;
}

export function EmployeeEditorPanel({
  employee,
  allEmployees,
  onClose,
  onUpdate,
}: EmployeeEditorPanelProps) {
  const [activeTab, setActiveTab] = useState<TabType>("workflow");
  const { models } = useModelContext();

  // config form
  const parseConfig = (emp: any) => {
    const raw =
      typeof emp.config === "string"
        ? JSON.parse(emp.config)
        : emp.config || {};
    return {
      model: raw.model || "",
      prompt: raw.prompt || "",
      temperature: raw.temperature || 0.7,
    };
  };

  const parsePermissions = (emp: any) => {
    try {
      if (emp.permissions)
        return typeof emp.permissions === "string"
          ? JSON.parse(emp.permissions)
          : emp.permissions;
    } catch {}
    return { canRead: true, canWrite: true, canExecute: true };
  };

  const parseWorkflow = (emp: any): WorkflowDefinition | undefined => {
    try {
      if (emp.workflow) {
        const raw =
          typeof emp.workflow === "string"
            ? JSON.parse(emp.workflow)
            : emp.workflow;
        if (raw.nodes && raw.edges) return raw;
      }
    } catch {}
    return undefined;
  };

  const [formData, setFormData] = useState({
    name: employee.name || "",
    role: employee.role || "",
    ...parseConfig(employee),
  });

  const [permissions, setPermissions] = useState(parsePermissions(employee));

  const [saving, setSaving] = useState(false);

  // Sync is handled by key={employee.id} in parent, so we only need to initialize state once.
  // If we need to sync updates without remounting, we'd use a more complex logic,
  // but for now, this avoids cascading renders.

  const handleSaveConfig = async () => {
    setSaving(true);
    const selectedModel = models.find((m) => m.id === formData.model);

    const config = {
      model: formData.model,
      modelName: selectedModel ? selectedModel.name : formData.model,
      modelConfig: selectedModel
        ? {
            baseUrl: selectedModel.baseUrl,
            apiKey: selectedModel.apiKey,
          }
        : undefined,
      prompt: formData.prompt,
      temperature: Number(formData.temperature),
    };

    const res = await updateEmployee(employee.id, {
      name: formData.name,
      role: formData.role,
      config,
      permissions,
    });

    if (res.success) {
      onUpdate({
        ...employee,
        name: formData.name,
        role: formData.role,
        config: JSON.stringify(config),
        permissions: JSON.stringify(permissions),
      });
      toast.success("配置已保存");
    } else {
      toast.error("保存失败: " + res.error);
    }
    setSaving(false);
  };

  const handleSaveWorkflow = async (workflow: WorkflowDefinition) => {
    await updateEmployeeWorkflow(employee.id, workflow);
    onUpdate({ ...employee, workflow: JSON.stringify(workflow) });
  };

  const tabs = [
    { id: "workflow" as TabType, label: "工作流", icon: Workflow },
    { id: "config" as TabType, label: "配置", icon: Settings },
    { id: "permissions" as TabType, label: "权限", icon: Shield },
    { id: "chat" as TabType, label: "对话", icon: MessageSquare },
    { id: "log" as TabType, label: "日志", icon: Activity },
  ];

  return (
    <div className='h-full flex flex-col bg-white dark:bg-slate-950'>
      {/* Header */}
      <div className='flex items-center justify-between px-4 py-3 border-b border-slate-100 dark:border-slate-800/50 bg-slate-50/80 dark:bg-slate-900/80 backdrop-blur-sm'>
        <div className='flex items-center gap-3'>
          <button
            onClick={onClose}
            className='p-1 rounded-lg hover:bg-slate-200/50 dark:hover:bg-slate-800/50 transition-colors'
          >
            <ChevronLeft className='w-4 h-4 text-slate-500' />
          </button>
          <div>
            <h3 className='text-sm font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2'>
              {employee.name}
              <Badge
                variant='secondary'
                className='text-[9px] h-4 px-1.5 font-normal'
              >
                {employee.role}
              </Badge>
            </h3>
            <p className='text-[10px] text-slate-400'>编辑员工配置与工作流</p>
          </div>
        </div>
      </div>

      {/* Tab Switcher */}
      <div className='flex border-b border-slate-100 dark:border-slate-800/50 px-2 bg-white/50 dark:bg-slate-950/50'>
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "flex items-center gap-1.5 px-3 py-2 text-xs font-medium transition-all border-b-2 -mb-px",
                isActive
                  ? "border-violet-500 text-violet-600 dark:text-violet-400"
                  : "border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300",
              )}
            >
              <Icon className='w-3.5 h-3.5' />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab Content */}
      <div className='flex-1 overflow-hidden'>
        {activeTab === "config" && (
          <ScrollArea className='h-full'>
            <div className='p-4 space-y-4'>
              <div className='space-y-2'>
                <Label
                  htmlFor='name'
                  className='text-xs font-semibold'
                >
                  员工姓名
                </Label>
                <Input
                  id='name'
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  className='rounded-xl h-9 text-sm'
                  placeholder='员工姓名'
                />
              </div>

              <div className='space-y-2'>
                <Label
                  htmlFor='role'
                  className='text-xs font-semibold'
                >
                  角色
                </Label>
                <Input
                  id='role'
                  value={formData.role}
                  onChange={(e) =>
                    setFormData({ ...formData, role: e.target.value })
                  }
                  className='rounded-xl h-9 text-sm'
                  placeholder='如：assistant'
                />
              </div>

              <div className='space-y-2'>
                <Label className='text-xs font-semibold'>模型</Label>
                <Select
                  value={formData.model}
                  onValueChange={(v) => setFormData({ ...formData, model: v })}
                >
                  <SelectTrigger className='rounded-xl h-9 text-sm'>
                    <SelectValue placeholder='选择 AI 模型' />
                  </SelectTrigger>
                  <SelectContent>
                    {models.map((m) => (
                      <SelectItem
                        key={m.id}
                        value={m.id}
                      >
                        {m.name} ({m.provider})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className='space-y-2'>
                <Label className='text-xs font-semibold'>
                  温度: {formData.temperature}
                </Label>
                <Input
                  type='number'
                  min='0'
                  max='2'
                  step='0.1'
                  value={formData.temperature}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      temperature: parseFloat(e.target.value) || 0.7,
                    })
                  }
                  className='rounded-xl h-9 text-sm'
                />
              </div>

              <div className='space-y-2'>
                <Label className='text-xs font-semibold'>
                  系统提示词 (Prompt)
                </Label>
                <textarea
                  value={formData.prompt}
                  onChange={(e) =>
                    setFormData({ ...formData, prompt: e.target.value })
                  }
                  placeholder='设定这个员工的行为方式...'
                  className='flex min-h-[120px] w-full rounded-xl border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500/20 transition-shadow'
                />
              </div>

              <Button
                onClick={handleSaveConfig}
                disabled={saving}
                className='w-full rounded-xl h-9 bg-gradient-to-r from-violet-600 to-purple-600 text-white font-semibold text-sm'
              >
                {saving ? (
                  <>
                    <Loader2 className='w-3.5 h-3.5 animate-spin mr-1.5' />
                    保存中...
                  </>
                ) : (
                  <>
                    <Save className='w-3.5 h-3.5 mr-1.5' />
                    保存配置
                  </>
                )}
              </Button>
            </div>
          </ScrollArea>
        )}

        {activeTab === "workflow" && (
          <div className='h-full'>
            <WorkflowCanvas
              initialWorkflow={parseWorkflow(employee)}
              onSave={handleSaveWorkflow}
              allEmployees={allEmployees}
              currentEmployeeId={employee.id}
            />
          </div>
        )}

        {activeTab === "permissions" && (
          <ScrollArea className='h-full'>
            <div className='p-4 space-y-4'>
              <div className='p-4 rounded-xl bg-gradient-to-br from-slate-50 to-slate-100/50 dark:from-slate-900 dark:to-slate-800/50 border border-slate-200/60 dark:border-slate-700/60'>
                <h4 className='text-xs font-bold text-slate-700 dark:text-slate-300 mb-3 flex items-center gap-2'>
                  <Shield className='w-3.5 h-3.5 text-violet-500' />
                  基础权限
                </h4>

                <div className='space-y-3'>
                  {[
                    {
                      key: "canRead",
                      label: "读取权限",
                      desc: "允许读取数据和知识库",
                    },
                    {
                      key: "canWrite",
                      label: "写入权限",
                      desc: "允许创建和修改数据",
                    },
                    {
                      key: "canExecute",
                      label: "执行权限",
                      desc: "允许执行任务和调用 API",
                    },
                    {
                      key: "canDelegate",
                      label: "委派权限",
                      desc: "允许将任务委派给子员工",
                    },
                    {
                      key: "canAccessInternet",
                      label: "联网权限",
                      desc: "允许搜索互联网",
                    },
                  ].map((perm) => (
                    <label
                      key={perm.key}
                      className='flex items-center justify-between p-2.5 rounded-lg hover:bg-white dark:hover:bg-slate-800/50 transition-colors cursor-pointer'
                    >
                      <div>
                        <span className='text-xs font-medium text-slate-700 dark:text-slate-300'>
                          {perm.label}
                        </span>
                        <p className='text-[10px] text-slate-400'>
                          {perm.desc}
                        </p>
                      </div>
                      <div className='relative'>
                        <input
                          type='checkbox'
                          checked={permissions[perm.key] ?? true}
                          onChange={(e) =>
                            setPermissions({
                              ...permissions,
                              [perm.key]: e.target.checked,
                            })
                          }
                          className='sr-only peer'
                        />
                        <div className='w-9 h-5 bg-slate-200 dark:bg-slate-700 peer-checked:bg-violet-500 rounded-full transition-colors' />
                        <div className='absolute left-0.5 top-0.5 w-4 h-4 bg-white rounded-full shadow-sm transition-transform peer-checked:translate-x-4' />
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              <Button
                onClick={handleSaveConfig}
                disabled={saving}
                className='w-full rounded-xl h-9 bg-gradient-to-r from-violet-600 to-purple-600 text-white font-semibold text-sm'
              >
                {saving ? (
                  <>
                    <Loader2 className='w-3.5 h-3.5 animate-spin mr-1.5' />
                    保存中...
                  </>
                ) : (
                  <>
                    <Save className='w-3.5 h-3.5 mr-1.5' />
                    保存权限
                  </>
                )}
              </Button>
            </div>
          </ScrollArea>
        )}

        {activeTab === "chat" && (
          <div className='h-full p-4'>
            <EmployeeChatPanel employee={employee} />
          </div>
        )}

        {activeTab === "log" && (
          <div className='h-full p-4 overflow-hidden'>
            <EmployeeLogPanel employeeId={employee.id} />
          </div>
        )}
      </div>
    </div>
  );
}
