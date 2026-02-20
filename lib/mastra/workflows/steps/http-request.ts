import { createStep } from "@mastra/core/workflows";
import { z } from "zod";

/**
 * HTTP 请求 Step
 */
export const httpRequestStep = createStep({
  id: "http_request",
  inputSchema: z.object({
    url: z.string(),
    method: z.enum(["GET", "POST", "PUT", "DELETE"]).default("GET"),
    headers: z.record(z.string()).optional(),
    body: z.any().optional(),
    companyId: z.string().optional(),
  }),
  outputSchema: z.any(),
  execute: async ({ inputData }) => {
    console.log(`[Step:http_request] ${inputData.method} ${inputData.url}`);
    const response = await fetch(inputData.url, {
      method: inputData.method,
      headers: {
        "Content-Type": "application/json",
        ...inputData.headers,
      },
      body:
        inputData.method !== "GET" ? JSON.stringify(inputData.body) : undefined,
    });

    const data = await response.json().catch(() => response.text());
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${JSON.stringify(data)}`);
    }
    return { data, status: response.status };
  },
});
