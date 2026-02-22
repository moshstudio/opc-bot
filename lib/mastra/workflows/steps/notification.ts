import { createStep } from "@mastra/core/workflows";
import { z } from "zod";
import { formatStepOutput, stepOutputSchema } from "./utils";

/**
 * 通知 Step
 */
export const notificationStep = createStep({
  id: "notification",
  inputSchema: z.object({
    companyId: z.string().optional(),
    notificationType: z.enum(["site", "email", "both"]),
    subject: z.string(),
    content: z.any(),
  }),
  outputSchema: stepOutputSchema,
  execute: async ({ inputData }) => {
    console.log(
      "[Step:notification] Executing with inputData keys:",
      Object.keys(inputData),
    );

    const companyId = inputData.companyId;
    const notificationType = inputData.notificationType || "site";
    const subject = inputData.subject || "Ivy 工作流通知";
    const rawContent = inputData.content || "收到来自工作流的消息";

    // 使用统一的渲染工具，渲染各种数据格式 (字符串、对象、数组)
    const { renderToMarkdown } = await import("./utils");
    const content = renderToMarkdown(rawContent);

    if (!companyId) {
      console.warn(
        "[Step:notification] Missing companyId, skipping notification",
      );
      return formatStepOutput(
        { siteSent: false, emailSent: false },
        { error: "Missing companyId", success: false },
      );
    }

    const { tools } = await import("../../tools");
    const results: any = {};

    if (notificationType === "site" || notificationType === "both") {
      console.log("[Step:notification] Sending site notification...");
      results.site = await tools.siteNotification.execute?.(
        {
          input: {
            companyId,
            title: subject,
            content,
            type: "info",
          },
        },
        {},
      );
      console.log(
        "[Step:notification] Site notification result:",
        results.site,
      );
    }

    if (notificationType === "email" || notificationType === "both") {
      console.log("[Step:notification] Sending email notification...");
      results.email = await tools.emailNotification.execute?.(
        {
          input: {
            companyId,
            subject,
            content,
          },
        },
        {},
      );
      console.log(
        "[Step:notification] Email notification result:",
        results.email,
      );
    }

    // Ensure we return something even if no type matched (though default is "site")
    if (Object.keys(results).length === 0) {
      console.warn(
        `[Step:notification] No notification was sent. notificationType was: ${notificationType}`,
      );
    }

    return formatStepOutput(results);
  },
});
