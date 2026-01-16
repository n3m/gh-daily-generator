import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const weeklys = await prisma.weeklyReport.findMany({
      where: {
        userId: session.user.id,
      },
      orderBy: {
        weekStart: "desc",
      },
      take: 20,
    });

    return NextResponse.json({
      weeklys: weeklys.map((w) => ({
        id: w.id,
        weekStart: w.weekStart.toISOString().split("T")[0],
        weekEnd: w.weekEnd.toISOString().split("T")[0],
        content: w.content,
        createdAt: w.createdAt,
      })),
    });
  } catch (error) {
    console.error("Error fetching weeklys:", error);
    return NextResponse.json(
      { error: "Failed to fetch weeklys" },
      { status: 500 }
    );
  }
}
