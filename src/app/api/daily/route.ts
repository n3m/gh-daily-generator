import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const dailys = await prisma.dailyReport.findMany({
      where: {
        userId: session.user.id,
      },
      orderBy: {
        date: "desc",
      },
      take: 50,
    });

    return NextResponse.json({
      dailys: dailys.map((d) => ({
        id: d.id,
        date: d.date.toISOString().split("T")[0],
        content: d.content,
        createdAt: d.createdAt,
      })),
    });
  } catch (error) {
    console.error("Error fetching dailys:", error);
    return NextResponse.json(
      { error: "Failed to fetch dailys" },
      { status: 500 }
    );
  }
}
