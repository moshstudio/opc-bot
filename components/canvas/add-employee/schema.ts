import * as z from "zod";

export const formSchema = z.object({
  name: z.string().min(2, {
    message: "姓名至少需要 2 个字符。",
  }),
  role: z.string().min(1, {
    message: "请选择一个角色。",
  }),
  prompt: z.string().optional(),
  model: z.string().min(1, {
    message: "请选择一个模型。",
  }),
});

export type FormSchemaType = z.infer<typeof formSchema>;
