import { NextRequest, NextResponse } from "next/server";
import { createOpenAI } from "@ai-sdk/openai";
import { generateText } from "ai";
import { db } from "@/lib/db";

export async function POST(req: NextRequest) {
  try {
    const { nodeType, nodeData, companyId } = await req.json();

    if (!nodeType || !nodeData) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 },
      );
    }

    // Identify relevant content for label generation
    let contentToSummarize = "";
    switch (nodeType) {
      case "llm":
      case "agent":
      case "process":
        contentToSummarize = `Node Type: ${nodeType}\nPrompt/Instructions: ${nodeData.prompt || nodeData.instructions || ""}`;
        break;
      case "http_request":
        contentToSummarize = `Node Type: HTTP Request\nMethod: ${nodeData.method}\nURL: ${nodeData.url}`;
        break;
      case "code":
        contentToSummarize = `Node Type: Code Execution\nLanguage: ${nodeData.codeLanguage}\nCode: ${nodeData.codeContent || nodeData.code || ""}`;
        break;
      case "knowledge_retrieval":
        contentToSummarize = `Node Type: Knowledge Retrieval\nQuery Type: ${nodeData.queryType}\nEmployee: ${nodeData.queryEmployeeId}`;
        break;
      case "notification":
        contentToSummarize = `Node Type: Notification\nSubject: ${nodeData.subject}\nContent: ${nodeData.content}`;
        break;
      case "condition":
        contentToSummarize = `Node Type: Condition Branch\nLogic: ${JSON.stringify(nodeData.conditions || [])}`;
        break;
      case "question_classifier":
        contentToSummarize = `Node Type: Question Classifier\nCategories: ${JSON.stringify(nodeData.categories || [])}`;
        break;
      default:
        contentToSummarize = `Node Type: ${nodeType}\nData: ${JSON.stringify(nodeData)}`;
    }

    // 1. Get the configured Label Generation Model ID from system settings
    const config = await db.systemConfig.findFirst({
      where: {
        key: "LABEL_GEN_MODEL_ID",
        ...(companyId ? { companyId } : {}),
      },
    });

    const modelId = config?.value;

    if (!modelId || modelId === "none") {
      return NextResponse.json(
        { error: "未配置 AI 标签生成模型，请在系统设置中配置" },
        { status: 400 },
      );
    }

    // 2. Fetch the corresponding AiModel details
    const dbModel = await db.aiModel.findUnique({
      where: { id: modelId },
    });

    if (!dbModel) {
      return NextResponse.json(
        { error: "配置的标签生成模型不存在或已被删除" },
        { status: 404 },
      );
    }

    const customOpenai = createOpenAI({
      apiKey: dbModel.apiKey || "dummy",
      baseURL: dbModel.baseUrl || undefined,
    });
    const model = customOpenai.chat(dbModel.name);

    const { text } = await generateText({
      model,
      system:
        "你是一个专业的流程编排助手。你的任务是根据节点的配置信息，生成一个极其简洁、概括性强的中文标签（通常在 2-6 个字之间）。不要包含引号、句号或多余的解释。只返回标签文本。",
      prompt: `请为以下工作流节点生成一个简洁的标签：\n\n${contentToSummarize}`,
    });

    return NextResponse.json({
      label: text.trim().replace(/^["']|["']$/g, ""),
    });
  } catch (error: any) {
    console.error("Generate Label Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
