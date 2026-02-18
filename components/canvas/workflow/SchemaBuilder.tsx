import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Trash2, Plus, Code2, List } from "lucide-react";
import { cn } from "@/lib/utils";

interface SchemaField {
  id: string;
  name: string;
  type: "string" | "number" | "boolean" | "array" | "object";
  description: string;
  required: boolean;
}

interface SchemaBuilderProps {
  initialSchema: string;
  onChange: (schema: string) => void;
}

export function SchemaBuilder({ initialSchema, onChange }: SchemaBuilderProps) {
  // Parse schema string to fields - defined outside to be used in initialization
  const parseFields = (schemaStr: string): SchemaField[] | null => {
    try {
      if (!schemaStr || schemaStr.trim() === "") {
        return [];
      }
      const schema = JSON.parse(schemaStr);
      if (schema.type !== "object" || !schema.properties) {
        return null; // Invalid for builder
      }

      return Object.entries(schema.properties).map(
        ([key, val]: [string, any]) => ({
          id: Math.random().toString(36).substr(2, 9),
          name: key,
          type: val.type || "string",
          description: val.description || "",
          required: (schema.required || []).includes(key),
        }),
      );
    } catch {
      return null;
    }
  };

  const [code, setCode] = useState(initialSchema);
  const [prevSchema, setPrevSchema] = useState(initialSchema);

  // Initialize state from props
  const [fields, setFields] = useState<SchemaField[]>(() => {
    const parsed = parseFields(initialSchema);
    return parsed || [];
  });

  const [mode, setMode] = useState<"builder" | "code">(() => {
    const parsed = parseFields(initialSchema);
    // If parsing failed (null) and schema is not empty, force code mode
    if (parsed === null && initialSchema && initialSchema.trim() !== "") {
      return "code";
    }
    return "builder";
  });

  // Parse schema string to fields (helper for updates)
  const parseAndSetFields = (schemaStr: string) => {
    const parsed = parseFields(schemaStr);
    if (parsed !== null) {
      setFields(parsed);
      return true;
    }
    return false;
  };

  // Sync from parent if props change deeply
  if (initialSchema !== prevSchema) {
    setPrevSchema(initialSchema);

    if (initialSchema !== code) {
      setCode(initialSchema);

      // Attempt schema parse, if complex/invalid switch to code mode
      const parsed = parseFields(initialSchema);
      if (parsed !== null) {
        setFields(parsed);
      } else if (initialSchema && initialSchema.trim() !== "") {
        setMode("code");
      }
    }
  }

  // Update schema when fields change
  const updateSchemaFromFields = (currentFields: SchemaField[]) => {
    const properties: Record<string, any> = {};
    const required: string[] = [];

    currentFields.forEach((field) => {
      if (field.name) {
        properties[field.name] = {
          type: field.type,
          description: field.description,
        };
        if (field.required) {
          required.push(field.name);
        }
      }
    });

    const schema = {
      type: "object",
      properties,
      required: required.length > 0 ? required : undefined,
    };

    const schemaStr = JSON.stringify(schema, null, 2);
    setCode(schemaStr);
    onChange(schemaStr);
  };

  const addField = () => {
    const newField: SchemaField = {
      id: Math.random().toString(36).substr(2, 9),
      name: "",
      type: "string",
      description: "",
      required: true,
    };
    const newFields = [...fields, newField];
    setFields(newFields);
    updateSchemaFromFields(newFields);
  };

  const removeField = (id: string) => {
    const newFields = fields.filter((f) => f.id !== id);
    setFields(newFields);
    updateSchemaFromFields(newFields);
  };

  const updateField = (id: string, updates: Partial<SchemaField>) => {
    const newFields = fields.map((f) =>
      f.id === id ? { ...f, ...updates } : f,
    );
    setFields(newFields);
    updateSchemaFromFields(newFields);
  };

  if (mode === "code") {
    return (
      <div className='space-y-2'>
        <div className='flex items-center justify-between'>
          <Label className='text-xs font-semibold text-slate-500 uppercase tracking-wider'>
            JSON Schema (Raw)
          </Label>
          <Button
            variant='ghost'
            size='sm'
            onClick={() => {
              parseAndSetFields(code);
              setMode("builder");
            }}
            className='h-6 text-xs gap-1'
          >
            <List className='w-3 h-3' />
            切换到可视化编辑
          </Button>
        </div>
        <textarea
          className='flex min-h-[160px] w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-[11px] font-mono focus:ring-2 focus:ring-violet-500/20 transition-shadow resize-y'
          value={code}
          onChange={(e) => {
            setCode(e.target.value);
            onChange(e.target.value);
          }}
          placeholder='{ "type": "object", "properties": { ... } }'
        />
      </div>
    );
  }

  return (
    <div className='space-y-3'>
      <div className='flex items-center justify-between'>
        <Label className='text-xs font-semibold text-slate-500 uppercase tracking-wider'>
          输出字段定义
        </Label>
        <div className='flex items-center gap-2'>
          <Button
            variant='ghost'
            size='sm'
            onClick={() => setMode("code")}
            className='h-6 text-xs gap-1 text-slate-400 hover:text-slate-600'
          >
            <Code2 className='w-3 h-3' />
            代码
          </Button>
        </div>
      </div>

      <div className='space-y-2'>
        {fields.length === 0 && (
          <div className='p-4 text-center border-2 border-dashed border-slate-100 dark:border-slate-800 rounded-xl bg-slate-50/50 dark:bg-slate-900/50'>
            <p className='text-xs text-slate-400 mb-2'>还没有定义输出结构</p>
            <Button
              variant='outline'
              size='sm'
              onClick={addField}
              className='h-7 text-xs gap-1 bg-white dark:bg-slate-900'
            >
              <Plus className='w-3 h-3' />
              添加字段
            </Button>
          </div>
        )}

        {fields.map((field) => (
          <div
            key={field.id}
            className='group p-2 rounded-xl border border-slate-200 bg-white shadow-sm space-y-2 hover:border-violet-200 transition-colors'
          >
            <div className='flex items-center gap-2'>
              <Input
                placeholder='字段名 (例如: summary)'
                value={field.name}
                onChange={(e) =>
                  updateField(field.id, { name: e.target.value })
                }
                className='h-8 text-xs font-mono border-slate-200 bg-slate-50/50'
              />
              <Select
                value={field.type}
                onValueChange={(v: any) => updateField(field.id, { type: v })}
              >
                <SelectTrigger className='h-8 w-[100px] text-xs border-slate-200'>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value='string'>文本</SelectItem>
                  <SelectItem value='number'>数字</SelectItem>
                  <SelectItem value='boolean'>布尔</SelectItem>
                  <SelectItem value='array'>数组</SelectItem>
                  <SelectItem value='object'>对象</SelectItem>
                </SelectContent>
              </Select>
              <Button
                variant='ghost'
                size='icon'
                onClick={() => removeField(field.id)}
                className='h-8 w-8 text-slate-300 hover:text-rose-500 hover:bg-rose-50'
              >
                <Trash2 className='w-4 h-4' />
              </Button>
            </div>
            <div className='flex items-center gap-2'>
              <Input
                placeholder='描述 (例如: 文章的简短摘要)'
                value={field.description}
                onChange={(e) =>
                  updateField(field.id, { description: e.target.value })
                }
                className='h-7 text-xs border-slate-100 text-slate-500 focus:text-slate-900'
              />
              <div
                className='flex items-center gap-1.5 cursor-pointer select-none'
                onClick={() =>
                  updateField(field.id, { required: !field.required })
                }
              >
                <div
                  className={cn(
                    "flex-shrink-0 w-3 h-3 rounded-sm border transition-colors",
                    field.required
                      ? "bg-violet-500 border-violet-500"
                      : "border-slate-300",
                  )}
                />
                <span className='flex-shrink-0 text-[10px] text-slate-400'>
                  必填
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {fields.length > 0 && (
        <Button
          variant='ghost'
          size='sm'
          onClick={addField}
          className='w-full h-8 text-xs gap-1 border border-dashed border-slate-200 text-slate-500 hover:text-violet-600 hover:border-violet-200 hover:bg-violet-50/50'
        >
          <Plus className='w-3 h-3' />
          添加字段
        </Button>
      )}
    </div>
  );
}
