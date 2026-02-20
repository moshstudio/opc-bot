import React from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { NodeDetailContentProps } from "./types";

export const NotificationDetails: React.FC<NodeDetailContentProps> = ({
  formData,
  handleChange,
}) => {
  return (
    <>
      <div className='space-y-2'>
        <Label>通知通道</Label>
        <Select
          value={formData.notificationType || "site"}
          onValueChange={(v) => handleChange("notificationType", v)}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value='site'>系统内通知</SelectItem>
            <SelectItem value='email'>邮件通知</SelectItem>
            <SelectItem value='both'>全部发送</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className='space-y-2'>
        <Label>通知标题</Label>
        <Input
          value={formData.subject || ""}
          onChange={(e) => handleChange("subject", e.target.value)}
          placeholder='任务执行通知'
        />
      </div>
      <div className='space-y-2'>
        <Label>通知内容</Label>
        <Textarea
          value={formData.content || ""}
          onChange={(e) => handleChange("content", e.target.value)}
          placeholder='输入通知详情...'
          className='min-h-[100px]'
        />
      </div>
    </>
  );
};
