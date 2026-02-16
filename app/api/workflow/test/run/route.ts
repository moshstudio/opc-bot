import { NextRequest } from "next/server";
import { executeWorkflow } from "@/lib/workflow/workflow-engine";

export async function POST(req: NextRequest) {
  try {
    const { employeeId, definition, input } = await req.json();

    const encoder = new TextEncoder();

    const stream = new ReadableStream({
      async start(controller) {
        const sendUpdate = (
          nodeId: string,
          status: string,
          output?: string,
          error?: string,
        ) => {
          try {
            const data = JSON.stringify({
              type: "update",
              nodeId,
              status,
              output,
              error,
            });
            controller.enqueue(encoder.encode(data + "\n"));
          } catch (e) {
            console.error("Error encoding stream chunk", e);
          }
        };

        try {
          // 1. 获取员工信息以拿到 companyId
          const { db } = await import("@/lib/db");
          const employee = await db.employee.findUnique({
            where: { id: employeeId },
            select: { companyId: true, role: true, name: true },
          });

          // 2. 执行工作流
          const result = await executeWorkflow(
            definition,
            input,
            employeeId,
            {
              companyId: employee?.companyId || "",
              role: employee?.role,
              name: employee?.name,
            },
            sendUpdate,
          );

          controller.enqueue(
            encoder.encode(JSON.stringify({ type: "final", result }) + "\n"),
          );
        } catch (err: any) {
          console.error("API Workflow execution error:", err);
          controller.enqueue(
            encoder.encode(
              JSON.stringify({ type: "error", error: err.message }) + "\n",
            ),
          );
        } finally {
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "application/x-ndjson",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
