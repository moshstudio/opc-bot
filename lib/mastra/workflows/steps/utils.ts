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
