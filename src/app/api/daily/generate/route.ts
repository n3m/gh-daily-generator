import { auth } from "@/lib/auth";
import { createGitHubClient, getOrgRepos, getRepoCommits } from "@/lib/github";
import { spawnClaudeAgent, isClaudeAvailable } from "@/lib/claude-sdk";
import { buildDailyPrompt, CommitsByRepo } from "@/lib/prompts";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const session = await auth();

    if (!session?.accessToken || !session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { dates, organization } = body as {
      dates: string[];
      organization: string;
    };

    if (!dates || dates.length === 0) {
      return NextResponse.json(
        { error: "At least one date is required" },
        { status: 400 }
      );
    }

    if (!organization) {
      return NextResponse.json(
        { error: "Organization is required" },
        { status: 400 }
      );
    }

    const client = createGitHubClient(session.accessToken);

    // Get user's email for filtering commits
    const userEmail = session.user.email;

    // Get all repos in the organization
    const repos = await getOrgRepos(client, organization);

    const dailys: { date: string; content: string }[] = [];

    for (const date of dates) {
      // Calculate date range (full day)
      const since = new Date(date);
      since.setHours(0, 0, 0, 0);

      const until = new Date(date);
      until.setHours(23, 59, 59, 999);

      // Fetch commits from all repos for this date
      const commitsByRepo: CommitsByRepo[] = [];

      for (const repo of repos) {
        try {
          const commits = await getRepoCommits(
            client,
            organization,
            repo.name,
            userEmail,
            since.toISOString(),
            until.toISOString()
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
          // Skip repos we can't access
          console.error(`Error fetching commits for ${repo.name}:`, error);
        }
      }

      // Generate daily content
      let content: string;

      if (commitsByRepo.length === 0) {
        content = `No commits found for ${date} in ${organization}.`;
      } else {
        const prompt = buildDailyPrompt(commitsByRepo);

        // Check if Claude CLI is available
        const claudeAvailable = await isClaudeAvailable();
        console.log(`[Daily Generate] Claude CLI available: ${claudeAvailable}`);

        if (claudeAvailable) {
          try {
            console.log(`[Daily Generate] Calling Claude CLI for ${date}...`);
            content = await spawnClaudeAgent(prompt, { timeout: 120000 });
            console.log(`[Daily Generate] Claude CLI response received`);
          } catch (error) {
            console.error("[Daily Generate] Claude CLI error:", error);
            // Fallback to simple summary
            content = generateFallbackSummary(commitsByRepo, date);
          }
        } else {
          console.log("[Daily Generate] Claude CLI not available, using fallback");
          // Fallback if Claude CLI not available
          content = generateFallbackSummary(commitsByRepo, date);
        }
      }

      dailys.push({ date, content });
    }

    return NextResponse.json({ dailys });
  } catch (error) {
    console.error("Error generating daily:", error);
    return NextResponse.json(
      { error: "Failed to generate daily" },
      { status: 500 }
    );
  }
}

function generateFallbackSummary(
  commitsByRepo: CommitsByRepo[],
  date: string
): string {
  let summary = `Daily Report - ${date}\n\n`;

  for (const repo of commitsByRepo) {
    summary += `**${repo.repoName}:**\n`;
    for (const commit of repo.commits) {
      // Get first line of commit message
      const message = commit.message.split("\n")[0];
      summary += `- ${message}\n`;
    }
    summary += "\n";
  }

  return summary.trim();
}
