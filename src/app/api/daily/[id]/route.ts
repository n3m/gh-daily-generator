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

    const daily = await prisma.dailyReport.findUnique({
      where: {
        id,
        userId: session.user.id,
      },
    });

    if (!daily) {
      return NextResponse.json({ error: "Daily not found" }, { status: 404 });
    }

    return NextResponse.json({
      daily: {
        id: daily.id,
        date: daily.date.toISOString().split("T")[0],
        content: daily.content,
        createdAt: daily.createdAt,
        updatedAt: daily.updatedAt,
      },
    });
  } catch (error) {
    console.error("Error fetching daily:", error);
    return NextResponse.json(
      { error: "Failed to fetch daily" },
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

    await prisma.dailyReport.delete({
      where: {
        id,
        userId: session.user.id,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting daily:", error);
    return NextResponse.json(
      { error: "Failed to delete daily" },
      { status: 500 }
    );
  }
}
