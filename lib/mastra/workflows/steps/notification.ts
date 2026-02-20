import { createStep } from "@mastra/core/workflows";
import { z } from "zod";

/**
 * 通知 Step
 */
export const notificationStep = createStep({
  id: "notification",
  inputSchema: z.object({
    companyId: z.string().optional(),
    notificationType: z.enum(["site", "email", "both"]),
    subject: z.string(),
    content: z.string(),
  }),
  outputSchema: z.any(),
  execute: async ({ inputData }) => {
    if (!inputData.companyId) {
      console.warn(
        "[Step:notification] Missing companyId, skipping notification",
      );
      return { siteSent: false, emailSent: false, error: "Missing companyId" };
    }
    const { tools } = await import("../../tools");
    const results: any = {};

    if (
      inputData.notificationType === "site" ||
      inputData.notificationType === "both"
    ) {
      results.site = await tools.siteNotification.execute?.(
        {
          input: {
            companyId: inputData.companyId,
            title: inputData.subject,
            content: inputData.content,
            type: "info",
          },
        },
        {},
      );
    }

    if (
      inputData.notificationType === "email" ||
      inputData.notificationType === "both"
    ) {
      results.email = await tools.emailNotification.execute?.(
        {
          input: {
            companyId: inputData.companyId,
            subject: inputData.subject,
            content: inputData.content,
          },
        },
        {},
      );
    }

    return { ...results };
  },
});
