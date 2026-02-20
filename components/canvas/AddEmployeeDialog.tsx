"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useModelContext } from "@/components/ModelContext";

import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Form } from "@/components/ui/form";

import { ROLE_TEMPLATES } from "./add-employee/templates";
import { formSchema, FormSchemaType } from "./add-employee/schema";
import { Header } from "./add-employee/Header";
import { EmptyModelAlert } from "./add-employee/EmptyModelAlert";
import { EmployeeForm } from "./add-employee/EmployeeForm";

interface AddEmployeeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAdd: (
    data: FormSchemaType & {
      workflow?: any;
      modelName?: string;
      modelConfig?: any;
    },
  ) => void;
}

export function AddEmployeeDialog({
  open,
  onOpenChange,
  onAdd,
}: AddEmployeeDialogProps) {
  const { models } = useModelContext();

  const defaultRole = "assistant";
  const template = ROLE_TEMPLATES[defaultRole];

  const form = useForm<FormSchemaType>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: template.defaultName,
      role: defaultRole,
      prompt: template.prompt,
      model: "",
    },
  });

  const selectedRole = form.watch("role");
  const currentTemplate = ROLE_TEMPLATES[selectedRole];

  // 当模型列表加载后，如果没有选中有效模型，设置一个默认模型
  useEffect(() => {
    if (open && models.length > 0) {
      const currentModel = form.getValues("model");
      const isCurrentModelValid = models.some((m) => m.id === currentModel);

      if (!isCurrentModelValid) {
        const defaultModelId =
          models.find(
            (m) => m.id === template.model || m.name === template.model,
          )?.id || models[0].id;
        form.setValue("model", defaultModelId);
      }
    }
  }, [open, models, template.model, form]);

  function onSubmit(values: FormSchemaType) {
    const tmpl = ROLE_TEMPLATES[values.role];

    // 同步模型到工作流中的 AI 节点
    let updatedWorkflow = tmpl?.workflow;
    if (updatedWorkflow && updatedWorkflow.nodes) {
      // 深拷贝工作流，避免修改原始模板
      const clonedWorkflow = JSON.parse(JSON.stringify(updatedWorkflow));
      clonedWorkflow.nodes = clonedWorkflow.nodes.map((node: any) => {
        // 如果是 AI 处理 (process/llm) 或 分类器 (question_classifier) 节点，将其使用的模型同步为当前选择的模型
        if (
          node.type === "process" ||
          node.type === "llm" ||
          node.type === "question_classifier"
        ) {
          return {
            ...node,
            data: {
              ...node.data,
              model: values.model,
            },
          };
        }
        return node;
      });
      updatedWorkflow = clonedWorkflow;
    }

    onAdd({
      ...values,
      workflow: updatedWorkflow,
    });
    onOpenChange(false);

    const defaultTmpl = ROLE_TEMPLATES[defaultRole];
    const defaultModelId =
      models.find(
        (m) => m.id === defaultTmpl.model || m.name === defaultTmpl.model,
      )?.id || (models.length > 0 ? models[0].id : "");

    form.reset({
      name: defaultTmpl.defaultName,
      role: defaultRole,
      prompt: defaultTmpl.prompt,
      model: defaultModelId,
    });
  }

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
    >
      <DialogContent
        className='sm:max-w-[500px] p-0 overflow-hidden border-0 shadow-2xl rounded-2xl bg-white dark:bg-slate-950'
        closeClassName='text-white hover:bg-white/20 transition-colors'
      >
        <Header color={currentTemplate?.color} />

        {models.length === 0 ? (
          <EmptyModelAlert onCancel={() => onOpenChange(false)} />
        ) : (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)}>
              <EmployeeForm models={models} />
            </form>
          </Form>
        )}
      </DialogContent>
    </Dialog>
  );
}
