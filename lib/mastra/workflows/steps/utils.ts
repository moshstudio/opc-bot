import { z } from "zod";

/**
 * 从 LLM 文本响应中提取 JSON，处理 markdown 代码块包裹的情况
 */
export function extractJsonFromText(text: string): any | null {
  // 首先尝试直接解析
  try {
    return JSON.parse(text);
  } catch {
    // 忽略，尝试其他方式
  }

  // 尝试提取 markdown 代码块中的 JSON
  const codeBlockMatch = text.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/);
  if (codeBlockMatch) {
    try {
      return JSON.parse(codeBlockMatch[1].trim());
    } catch {
      // 忽略
    }
  }

  // 尝试从文本中找到 JSON 对象
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    try {
      return JSON.parse(jsonMatch[0]);
    } catch {
      // 忽略
    }
  }

  return null;
}

/** 从 Mastra result 提取文本 */
export async function extractTextFromResult(
  result: any,
  stepName: string = "unknown",
): Promise<string> {
  try {
    const rawText = result.text as any;
    return rawText && typeof rawText.then === "function"
      ? await rawText
      : rawText || "";
  } catch (e) {
    console.warn(`[Step:${stepName}] Error extracting text from result:`, e);
    return "";
  }
}

/**
 * 统一节点输出格式包装函数
 * @param primaryOutput 主要输出内容 (映射到 output 字段)
 * @param additionalData 其他需要包含在输出对象中的字段 (如 count, type, result 等)
 * @returns 统一格式的输出对象
 */
export function formatStepOutput<T = any>(
  primaryOutput: T,
  additionalData: Record<string, any> = {},
) {
  return {
    success: true,
    output: primaryOutput,
    ...additionalData,
  };
}

/**
 * 统一节点输出 Schema
 */
export const stepOutputSchema = z
  .object({
    success: z.boolean(),
    output: z.any(),
  })
  .passthrough();

/**
 * 将数据（对象、数组、字符串）渲染为 Markdown 格式，增强通知显示效果
 */
export function renderToMarkdown(data: any): string {
  if (data === null || data === undefined) return "";
  if (typeof data !== "object") return String(data);

  if (Array.isArray(data)) {
    if (data.length === 0) return "[]";

    // 检查是否是对象数组
    const firstItem = data[0];
    if (
      typeof firstItem === "object" &&
      firstItem !== null &&
      !Array.isArray(firstItem)
    ) {
      // 提取所有唯一键
      const allKeys = Array.from(
        new Set(data.flatMap((item) => Object.keys(item || {}))),
      );
      if (allKeys.length === 0) return data.map(String).join(", ");

      // 限制列数，避免显示错乱
      const displayKeys = allKeys.slice(0, 8);

      // 渲染为 Markdown 表格
      const header = `| ${displayKeys.join(" | ")} |`;
      const separator = `| ${displayKeys.map(() => "---").join(" | ")} |`;
      const rows = data.map((item) => {
        return `| ${displayKeys
          .map((k) => {
            const val = item?.[k];
            if (val === null || val === undefined) return "-";
            return typeof val === "object"
              ? JSON.stringify(val).slice(0, 50) +
                  (JSON.stringify(val).length > 50 ? "..." : "")
              : String(val);
          })
          .join(" | ")} |`;
      });
      return [header, separator, ...rows].join("\n");
    }

    // 普通数组渲染为列表
    return data
      .map(
        (item) => `- ${typeof item === "object" ? JSON.stringify(item) : item}`,
      )
      .join("\n");
  }

  // 单个对象
  const keys = Object.keys(data);
  if (keys.length === 0) return "{}";

  // 如果字段很少，使用列表，如果字段多，使用表格
  if (keys.length <= 6) {
    const rows = keys.map((k) => {
      const val = data[k];
      const valStr =
        typeof val === "object" ? JSON.stringify(val, null, 2) : String(val);
      if (typeof val === "object" && valStr.includes("\n")) {
        return `**${k}**:\n\`\`\`json\n${valStr}\n\`\`\``;
      }
      return `**${k}**: ${valStr}`;
    });
    return rows.join("\n\n");
  }

  // 渲染为垂直表格 (字段 | 值)
  const header = "| 字段 | 值 |";
  const separator = "| --- | --- |";
  const rows = keys.map((k) => {
    const val = data[k];
    const valStr = typeof val === "object" ? JSON.stringify(val) : String(val);
    return `| **${k}** | ${valStr} |`;
  });
  return [header, separator, ...rows].join("\n");
}
