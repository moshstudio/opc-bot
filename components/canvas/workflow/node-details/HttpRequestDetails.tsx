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

export const HttpRequestDetails: React.FC<NodeDetailContentProps> = ({
  formData,
  handleChange,
}) => {
  return (
    <>
      <div className='grid grid-cols-[100px_1fr] gap-2'>
        <div className='space-y-2'>
          <Label>方法</Label>
          <Select
            value={formData.httpMethod || "GET"}
            onValueChange={(v) => handleChange("httpMethod", v)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value='GET'>GET</SelectItem>
              <SelectItem value='POST'>POST</SelectItem>
              <SelectItem value='PUT'>PUT</SelectItem>
              <SelectItem value='DELETE'>DELETE</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className='space-y-2'>
          <Label>URL</Label>
          <Input
            value={formData.httpUrl || ""}
            onChange={(e) => handleChange("httpUrl", e.target.value)}
            placeholder='https://api....'
          />
        </div>
      </div>
      {(formData.httpMethod || "GET") !== "GET" && (
        <div className='space-y-2'>
          <Label>请求体 (JSON)</Label>
          <Textarea
            value={formData.httpBody || ""}
            onChange={(e) => handleChange("httpBody", e.target.value)}
            placeholder='{"key": "value"}'
            className='min-h-[100px] font-mono'
          />
        </div>
      )}
    </>
  );
};
