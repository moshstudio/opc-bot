"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { updateEmployee } from "@/app/actions/employee-actions";

import { Save, Loader2 } from "lucide-react";
import { useModelContext } from "@/components/ModelContext";

interface EmployeeConfigPanelProps {
  employee: any;
  onUpdate: (data: any) => void;
}

export function EmployeeConfigPanel({
  employee,
  onUpdate,
}: EmployeeConfigPanelProps) {
  const { models } = useModelContext();

  // Parse config if it's a string, otherwise use it as is or default object
  const initialConfig =
    typeof employee.config === "string"
      ? JSON.parse(employee.config)
      : employee.config || {};

  const [formData, setFormData] = useState({
    name: employee.name || employee.label || "",
    role: employee.role || "",
    model: initialConfig.model || "",
    prompt: initialConfig.prompt || "",
    temperature: initialConfig.temperature || 0.7,
  });

  const [loading, setLoading] = useState(false);

  // Sync state if employee prop changes (e.g. switching nodes)
  useEffect(() => {
    const config =
      typeof employee.config === "string"
        ? JSON.parse(employee.config)
        : employee.config || {};

    // eslint-disable-next-line
    setFormData({
      name: employee.name || employee.label || "",
      role: employee.role || "",
      model: config.model || "",
      prompt: config.prompt || "",
      temperature: config.temperature || 0.7,
    });
  }, [employee]);

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >,
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSave = async () => {
    setLoading(true);
    const config = {
      model: formData.model,
      prompt: formData.prompt,
      temperature: Number(formData.temperature),
    };

    const res = await updateEmployee(employee.id, {
      name: formData.name,
      role: formData.role,
      config,
    });

    if (res.success) {
      onUpdate({
        ...employee,
        name: formData.name,
        role: formData.role,
        config: JSON.stringify(config), // Ensure consistent format
        ...config, // Also spread config for immediate UI updates if needed
      });
    } else {
      console.error(res.error);
    }
    setLoading(false);
  };

  return (
    <div className='flex flex-col h-full space-y-6 p-1'>
      <div className='space-y-4'>
        <div className='space-y-2'>
          <Label htmlFor='name'>姓名</Label>
          <Input
            id='name'
            name='name'
            value={formData.name}
            onChange={handleChange}
            placeholder='员工姓名'
          />
        </div>

        <div className='space-y-2'>
          <Label htmlFor='role'>角色</Label>
          <Input
            id='role'
            name='role'
            value={formData.role}
            onChange={handleChange}
            placeholder='例如：助理，DevOps'
          />
        </div>

        <div className='space-y-2'>
          <Label htmlFor='model'>模型</Label>
          <select
            id='model'
            name='model'
            value={formData.model}
            onChange={handleChange}
            className='flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50'
          >
            {models.length > 0 ? (
              models.map((m) => (
                <option
                  key={m.id}
                  value={m.id}
                >
                  {m.name} ({m.provider})
                </option>
              ))
            ) : (
              <option
                disabled
                value=''
              >
                未配置模型，请前往“模型管理”添加
              </option>
            )}
          </select>
        </div>

        <div className='space-y-2'>
          <Label htmlFor='temperature'>温度: {formData.temperature}</Label>
          <Input
            id='temperature'
            name='temperature'
            type='number'
            min='0'
            max='1'
            step='0.1'
            value={formData.temperature}
            onChange={handleChange}
          />
        </div>

        <div className='space-y-2'>
          <Label htmlFor='prompt'>系统提示词</Label>
          <Textarea
            id='prompt'
            name='prompt'
            value={formData.prompt}
            onChange={handleChange}
            className='min-h-[150px] font-mono text-sm'
            placeholder='你是一个乐于助人的助手...'
          />
        </div>
      </div>

      <div className='pt-4'>
        <Button
          onClick={handleSave}
          disabled={loading}
          className='w-full'
        >
          {loading ? (
            <>
              <Loader2 className='mr-2 h-4 w-4 animate-spin' />
              保存中...
            </>
          ) : (
            <>
              <Save className='mr-2 h-4 w-4' />
              保存配置
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
