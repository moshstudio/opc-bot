import { NextRequest } from "next/server";
import { getMastraAgent } from "@/lib/mastra/agents";
import { db } from "@/lib/db";
import { logChatResponse } from "@/lib/services/employee-log";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { employeeId, message, clientModelConfig } = body;

    if (!employeeId || !message) {
      return Response.json(
        { error: "Missing employeeId or message" },
        { status: 400 },
      );
    }

    const employee = await db.employee.findUnique({
      where: { id: employeeId },
    });

    if (!employee) {
      return Response.json({ error: "Employee not found" }, { status: 404 });
    }

    // Save user message
    await db.message.create({
      data: { content: message, role: "user", employeeId },
    });

    // Fetch conversation history for context
    const history = await db.message.findMany({
      where: { employeeId },
      orderBy: { createdAt: "asc" },
      take: 50,
    });

    const contextMessages = history.map((m) => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    }));

    // Parse employee config
    let config: any = {};
    if (employee.config) {
      try {
        config = JSON.parse(employee.config);
      } catch (e) {
        console.error("Failed to parse employee config", e);
      }
    }

    // Resolve model
    let modelName =
      clientModelConfig?.modelName || config.modelName || config.model;
    if (!modelName) {
      const aiModel = await db.aiModel.findFirst({
        where: { companyId: employee.companyId, isActive: true },
        orderBy: { createdAt: "desc" },
      });
      modelName = aiModel?.id || "gpt-4o";
    }

    const agent = await getMastraAgent(
      employee.role || "assistant",
      modelName,
      config.prompt,
      clientModelConfig,
      clientModelConfig?.provider,
      employee.companyId,
    );

    // Stream response — cast to any for MessageListInput compatibility
    const result = await agent.stream(contextMessages as any);

    const encoder = new TextEncoder();
    let fullText = "";

    const send = (controller: ReadableStreamDefaultController, data: any) => {
      controller.enqueue(
        encoder.encode(`data: ${JSON.stringify(data)}\n\n`),
      );
    };

    const readable = new ReadableStream({
      async start(controller) {
        try {
          // fullStream is a ReadableStream<ChunkType> — use getReader()
          const reader = result.fullStream.getReader();

          while (true) {
            const { done, value: chunk } = await reader.read();
            if (done) break;

            switch (chunk.type) {
              case "text-delta":
                fullText += chunk.payload.text;
                send(controller, {
                  type: "text-delta",
                  content: chunk.payload.text,
                });
                break;
              case "reasoning-delta":
                send(controller, {
                  type: "reasoning",
                  content: chunk.payload.text,
                });
                break;
              case "tool-call":
                send(controller, {
                  type: "tool-call",
                  toolCallId: chunk.payload.toolCallId,
                  toolName: chunk.payload.toolName,
                  args: chunk.payload.args,
                });
                break;
              case "tool-result":
                send(controller, {
                  type: "tool-result",
                  toolCallId: chunk.payload.toolCallId,
                  toolName: chunk.payload.toolName,
                  result: chunk.payload.result,
                });
                break;
            }
          }

          // Save assistant message to DB
          if (fullText) {
            await db.message.create({
              data: { content: fullText, role: "assistant", employeeId },
            });
            await logChatResponse(
              employeeId,
              employee.name,
              message,
              fullText,
            );
          }

          send(controller, { type: "finish", fullText });
        } catch (error: any) {
          console.error("Stream error:", error);
          send(controller, { type: "error", message: error.message });
        } finally {
          controller.close();
        }
      },
    });

    return new Response(readable, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (error: any) {
    console.error("API Chat Error:", error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}
