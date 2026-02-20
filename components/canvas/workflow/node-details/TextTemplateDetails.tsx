import React from "react";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { NodeDetailContentProps } from "./types";

export const TextTemplateDetails: React.FC<NodeDetailContentProps> = ({
  formData,
  handleChange,
}) => {
  return (
    <div className='space-y-2'>
      <Label>模板内容</Label>
      <Textarea
        value={formData.templateContent || ""}
        onChange={(e) => handleChange("templateContent", e.target.value)}
        className='min-h-[150px]'
        placeholder='{{input}}'
      />
    </div>
  );
};
