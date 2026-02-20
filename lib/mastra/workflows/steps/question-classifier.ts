import { createStep } from "@mastra/core/workflows";
import { z } from "zod";
import { extractJsonFromText, extractTextFromResult } from "./utils";

/**
 * 问题分类 Step
 */
export const questionClassifierStep = createStep({
  id: "question_classifier",
  inputSchema: z.object({
    input: z.string(),
    inputVariable: z.string().optional(), // 选取的变量路径
    categories: z
      .array(
        z.object({
          key: z.string(),
          label: z.string().optional(),
          description: z.string().optional(),
        }),
      )
      .optional()
      .default([]),
    model: z.string().optional(),
    companyId: z.string().optional(),
    provider: z.string().optional(),
    instructions: z.string().optional(),
    memory: z
      .object({
        enabled: z.boolean().default(false),
        window: z.number().default(5),
      })
      .optional(),
  }),
  outputSchema: z.any(),
  execute: async ({ inputData }) => {
    const { getMastraAgent } = await import("../../agents");

    // 1. 获取 Agent (默认用较快的模型)
    const agent = await getMastraAgent(
      "classifier",
      inputData.model || "gpt-4o-mini", // 默认使用轻量模型
      undefined,
      { apiKey: undefined },
      inputData.provider,
    );

    // 2. 构建分类 Prompt
    const categories = inputData.categories || [];
    const categoryKeys = categories.map((c) => c.key);
    const categoryDesc = categories
      .map(
        (c) => `- ${c.key}: ${c.label || c.key} (${c.description || "无描述"})`,
      )
      .join("\n");

    const basePrompt = `
你是一个智能意图分类助手。

${inputData.instructions ? `\n【补充指令】\n${inputData.instructions}\n` : ""}

请分析用户的输入，将其归类为以下类别之一：

${categoryDesc}

如果通过上面的类别无法分类，且存在 "other" 或 "default" 类别，请归类为 "other"；否则请选择最接近的类别。

除了分类，还请提取关键词、判断紧急程度(low/medium/high) 并生成简短摘要。

请严格按照以下 JSON 格式输出，不要包含 Markdown 代码块或其他文字：
{
  "category": "分类的key (必须是上述其一)",
  "confidence": 0.9,
  "reasoning": "分类理由",
  "keywords": ["关键词1", "关键词2"],
  "urgency": "low",
  "summary": "一句话摘要"
}

用户输入：${inputData.input}
    `.trim();

    const maxRetries = 3;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        let prompt = basePrompt;

        // 重试时追加强调提示
        if (attempt > 1) {
          console.log(
            `[Step:classifier] Retry attempt ${attempt}/${maxRetries}`,
          );
          prompt += `\n\n【系统提示】：上一次未能提取到有效的 JSON 分类结果，请务必确保输出的是纯净的、合法的 JSON 字符串，category 字段必须是以下值之一：${categoryKeys.join(", ")}`;
        }

        // 3. 执行
        const result = await agent.generate(prompt);

        // 4. 解析结果
        const textValue = await extractTextFromResult(result, "classifier");

        let parsed: any = extractJsonFromText(textValue);

        if (!parsed || !parsed.category) {
          // JSON 解析失败 - 如果还有重试次数，继续尝试
          if (attempt < maxRetries) {
            console.warn(
              `[Step:classifier] JSON parse failed on attempt ${attempt}, retrying...`,
            );
            await new Promise((r) => setTimeout(r, 500));
            continue;
          }
          // 最后一次也失败了，使用 fallback
          console.warn(
            "[Step:classifier] All JSON parse attempts failed, using fallback",
          );
          parsed = {
            category: categories[0]?.key || "unknown",
            confidence: 0,
            reasoning: "JSON parsing failed after retries",
            summary: textValue.slice(0, 50),
            keywords: [],
            urgency: "low",
          };
        }

        // 5. 验证分类结果是否在预定义的类别列表中
        if (
          categoryKeys.length > 0 &&
          !categoryKeys.includes(parsed.category)
        ) {
          console.warn(
            `[Step:classifier] Category "${parsed.category}" not in predefined list: [${categoryKeys.join(", ")}]`,
          );
          // 尝试模糊匹配（忽略大小写）
          const fuzzyMatch = categoryKeys.find(
            (k) => k.toLowerCase() === parsed.category?.toLowerCase(),
          );
          if (fuzzyMatch) {
            parsed.category = fuzzyMatch;
          } else if (attempt < maxRetries) {
            // 如果还有重试次数，再试一次
            console.warn(
              `[Step:classifier] Invalid category on attempt ${attempt}, retrying...`,
            );
            await new Promise((r) => setTimeout(r, 500));
            continue;
          } else {
            // 最后一次也无效，降级到第一个分类
            parsed.category = categories[0]?.key || parsed.category;
          }
        }

        return {
          result: parsed.category,
          output: parsed,
        };
      } catch (error: any) {
        console.error(`[Step:classifier] Attempt ${attempt} error:`, error);
        if (attempt === maxRetries) {
          return {
            result: categories[0]?.key || "error",
            output: { error: error.message },
          };
        }
        await new Promise((r) => setTimeout(r, 1000));
      }
    }

    // 不可达，但 TypeScript 需要
    return {
      result: categories[0]?.key || "error",
      output: { error: "Classifier failed to execute (unreachable)" },
    };
  },
});
