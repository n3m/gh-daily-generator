import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const weekly = await prisma.weeklyReport.findUnique({
      where: {
        id,
        userId: session.user.id,
      },
    });

    if (!weekly) {
      return NextResponse.json({ error: "Weekly not found" }, { status: 404 });
    }

    return NextResponse.json({
      weekly: {
        id: weekly.id,
        weekStart: weekly.weekStart.toISOString().split("T")[0],
        weekEnd: weekly.weekEnd.toISOString().split("T")[0],
        content: weekly.content,
        createdAt: weekly.createdAt,
        updatedAt: weekly.updatedAt,
      },
    });
  } catch (error) {
    console.error("Error fetching weekly:", error);
    return NextResponse.json(
      { error: "Failed to fetch weekly" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    await prisma.weeklyReport.delete({
      where: {
        id,
        userId: session.user.id,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting weekly:", error);
    return NextResponse.json(
      { error: "Failed to delete weekly" },
      { status: 500 }
    );
  }
}
