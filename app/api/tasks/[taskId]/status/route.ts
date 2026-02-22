import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ taskId: string }> },
) {
  try {
    const { taskId } = await params;

    const task = await db.task.findUnique({
      where: { id: taskId },
      include: {
        assignedTo: { select: { id: true, name: true, role: true } },
        subTasks: {
          include: {
            assignedTo: { select: { id: true, name: true, role: true } },
          },
          orderBy: { createdAt: "asc" },
        },
        messages: {
          orderBy: { createdAt: "desc" },
          take: 20,
        },
      },
    });

    if (!task) {
      return NextResponse.json({ error: "任务不存在" }, { status: 404 });
    }

    return NextResponse.json({
      task: {
        id: task.id,
        title: task.title,
        description: task.description,
        status: task.status,
        result: task.result,
        context: task.context,
        createdAt: task.createdAt,
        updatedAt: task.updatedAt,
        assignedTo: task.assignedTo,
      },
      subTasks: task.subTasks.map((st) => ({
        id: st.id,
        title: st.title,
        description: st.description,
        status: st.status,
        result: st.result,
        assignedTo: st.assignedTo,
        createdAt: st.createdAt,
      })),
      messages: task.messages,
    });
  } catch (error: any) {
    console.error("[API] Task status error:", error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 },
    );
  }
}
