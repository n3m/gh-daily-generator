import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createGitHubClient, getOrgRepos, getRepoCommits } from "@/lib/github";
import { spawnClaudeAgent, isClaudeAvailable } from "@/lib/claude-sdk";
import { buildWeeklyPrompt, CommitsByRepo } from "@/lib/prompts";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const session = await auth();

    if (!session?.accessToken || !session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { weekStart, source, organization } = body as {
      weekStart: string;
      source: "dailys" | "commits";
      organization: string;
    };

    if (!weekStart) {
      return NextResponse.json(
        { error: "Week start date is required" },
        { status: 400 }
      );
    }

    if (!organization) {
      return NextResponse.json(
        { error: "Organization is required" },
        { status: 400 }
      );
    }

    // Calculate week range
    const startDate = new Date(weekStart);
    startDate.setHours(0, 0, 0, 0);

    const endDate = new Date(startDate);
    endDate.setDate(startDate.getDate() + 6);
    endDate.setHours(23, 59, 59, 999);

    let content: string;
    const dailyContents: string[] = [];

    if (source === "dailys") {
      // Get dailys for this week
      const dailys = await prisma.dailyReport.findMany({
        where: {
          userId: session.user.id,
          date: {
            gte: startDate,
            lte: endDate,
          },
        },
        orderBy: {
          date: "asc",
        },
      });

      if (dailys.length > 0) {
        dailyContents.push(...dailys.map((d) => d.content));
      }
    }

    // If no dailys found or source is commits, fetch from GitHub
    let commitsByRepo: CommitsByRepo[] = [];

    if (dailyContents.length === 0 || source === "commits") {
      const client = createGitHubClient(session.accessToken);
      const userEmail = session.user.email;
      const repos = await getOrgRepos(client, organization);

      for (const repo of repos) {
        try {
          const commits = await getRepoCommits(
            client,
            organization,
            repo.name,
            userEmail,
            startDate.toISOString(),
            endDate.toISOString()
          );

          if (commits.length > 0) {
            commitsByRepo.push({
              repoName: repo.name,
              commits: commits.map((c) => ({
                sha: c.sha,
                message: c.commit.message,
              })),
            });
          }
        } catch (error) {
          console.error(`Error fetching commits for ${repo.name}:`, error);
        }
      }
    }

    // Build prompt based on available data
    const prompt = buildWeeklyPrompt(
      dailyContents.length > 0 ? dailyContents : [],
      commitsByRepo.length > 0 ? commitsByRepo : undefined
    );

    // Check if Claude CLI is available
    const claudeAvailable = await isClaudeAvailable();
    console.log(`[Weekly Generate] Claude CLI available: ${claudeAvailable}`);

    if (claudeAvailable) {
      try {
        console.log(`[Weekly Generate] Calling Claude CLI...`);
        content = await spawnClaudeAgent(prompt, { timeout: 180000 });
        console.log(`[Weekly Generate] Claude CLI response received`);
      } catch (error) {
        console.error("[Weekly Generate] Claude CLI error:", error);
        content = generateFallbackWeeklySummary(
          dailyContents,
          commitsByRepo,
          startDate,
          endDate
        );
      }
    } else {
      console.log("[Weekly Generate] Claude CLI not available, using fallback");
      content = generateFallbackWeeklySummary(
        dailyContents,
        commitsByRepo,
        startDate,
        endDate
      );
    }

    // Save to database (upsert to avoid duplicates)
    const savedWeekly = await prisma.weeklyReport.upsert({
      where: {
        userId_weekStart: {
          userId: session.user.id,
          weekStart: startDate,
        },
      },
      update: {
        content,
        weekEnd: endDate,
      },
      create: {
        userId: session.user.id,
        weekStart: startDate,
        weekEnd: endDate,
        content,
      },
    });

    return NextResponse.json({
      weekly: {
        id: savedWeekly.id,
        weekStart: startDate.toISOString().split("T")[0],
        weekEnd: endDate.toISOString().split("T")[0],
        content,
      },
    });
  } catch (error) {
    console.error("Error generating weekly:", error);
    return NextResponse.json(
      { error: "Failed to generate weekly" },
      { status: 500 }
    );
  }
}

function generateFallbackWeeklySummary(
  dailyContents: string[],
  commitsByRepo: CommitsByRepo[],
  startDate: Date,
  endDate: Date
): string {
  const startStr = startDate.toISOString().split("T")[0];
  const endStr = endDate.toISOString().split("T")[0];

  let summary = `Weekly Report - ${startStr} to ${endStr}\n\n`;

  if (dailyContents.length > 0) {
    summary += "## Summary from Daily Reports\n\n";
    dailyContents.forEach((content, i) => {
      summary += `### Day ${i + 1}\n${content}\n\n`;
    });
  } else if (commitsByRepo.length > 0) {
    summary += "## Summary from Commits\n\n";
    for (const repo of commitsByRepo) {
      summary += `**${repo.repoName}:**\n`;
      for (const commit of repo.commits) {
        const message = commit.message.split("\n")[0];
        summary += `- ${message}\n`;
      }
      summary += "\n";
    }
  } else {
    summary += "No activity recorded for this week.\n";
  }

  return summary.trim();
}
