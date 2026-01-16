import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay());
    startOfWeek.setHours(0, 0, 0, 0);

    // Count dailys this month
    const dailysThisMonth = await prisma.dailyReport.count({
      where: {
        userId: session.user.id,
        createdAt: {
          gte: startOfMonth,
        },
      },
    });

    // Count weeklys this month
    const weeklysThisMonth = await prisma.weeklyReport.count({
      where: {
        userId: session.user.id,
        createdAt: {
          gte: startOfMonth,
        },
      },
    });

    // Get recent dailys
    const recentDailys = await prisma.dailyReport.findMany({
      where: {
        userId: session.user.id,
      },
      orderBy: {
        date: "desc",
      },
      take: 5,
    });

    // Calculate streak (consecutive days with dailys)
    const allDailys = await prisma.dailyReport.findMany({
      where: {
        userId: session.user.id,
      },
      orderBy: {
        date: "desc",
      },
      select: {
        date: true,
      },
    });

    let streak = 0;
    if (allDailys.length > 0) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      let checkDate = new Date(today);

      for (const daily of allDailys) {
        const dailyDate = new Date(daily.date);
        dailyDate.setHours(0, 0, 0, 0);

        if (dailyDate.getTime() === checkDate.getTime()) {
          streak++;
          checkDate.setDate(checkDate.getDate() - 1);
        } else if (dailyDate.getTime() < checkDate.getTime()) {
          // Check if it's yesterday (allow gap for today if not generated yet)
          const yesterday = new Date(today);
          yesterday.setDate(yesterday.getDate() - 1);

          if (streak === 0 && dailyDate.getTime() === yesterday.getTime()) {
            streak++;
            checkDate = new Date(yesterday);
            checkDate.setDate(checkDate.getDate() - 1);
          } else {
            break;
          }
        }
      }
    }

    return NextResponse.json({
      dailysThisMonth,
      weeklysThisMonth,
      streak,
      recentDailys: recentDailys.map((d) => ({
        id: d.id,
        date: d.date.toISOString().split("T")[0],
        content: d.content.substring(0, 150) + (d.content.length > 150 ? "..." : ""),
      })),
    });
  } catch (error) {
    console.error("Error fetching stats:", error);
    return NextResponse.json(
      { error: "Failed to fetch stats" },
      { status: 500 }
    );
  }
}
