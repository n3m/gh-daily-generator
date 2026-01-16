import { Octokit } from "@octokit/rest";

export function createGitHubClient(accessToken: string): Octokit {
  return new Octokit({ auth: accessToken });
}

export interface GitHubOrg {
  id: number;
  login: string;
  avatar_url: string;
  description: string | null;
}

export interface GitHubRepo {
  id: number;
  name: string;
  full_name: string;
  private: boolean;
}

export interface GitHubCommit {
  sha: string;
  commit: {
    message: string;
    author: {
      name: string;
      email: string;
      date: string;
    };
  };
  stats?: {
    additions: number;
    deletions: number;
  };
  files?: Array<{
    filename: string;
  }>;
}

export async function getUserOrganizations(
  client: Octokit
): Promise<GitHubOrg[]> {
  const { data } = await client.orgs.listForAuthenticatedUser();
  return data.map((org) => ({
    id: org.id,
    login: org.login,
    avatar_url: org.avatar_url,
    description: org.description,
  }));
}

export async function getOrgRepos(
  client: Octokit,
  org: string
): Promise<GitHubRepo[]> {
  const repos: GitHubRepo[] = [];
  let page = 1;
  const perPage = 100;

  while (true) {
    const { data } = await client.repos.listForOrg({
      org,
      per_page: perPage,
      page,
      type: "all",
    });

    repos.push(
      ...data.map((repo) => ({
        id: repo.id,
        name: repo.name,
        full_name: repo.full_name,
        private: repo.private,
      }))
    );

    if (data.length < perPage) break;
    page++;
  }

  return repos;
}

export async function getRepoCommits(
  client: Octokit,
  owner: string,
  repo: string,
  author: string,
  since?: string,
  until?: string
): Promise<GitHubCommit[]> {
  const commits: GitHubCommit[] = [];
  let page = 1;
  const perPage = 100;

  while (true) {
    try {
      const { data } = await client.repos.listCommits({
        owner,
        repo,
        author,
        since,
        until,
        per_page: perPage,
        page,
      });

      const filteredCommits = data
        // Filter out merge commits
        .filter((commit) => {
          const message = commit.commit.message.toLowerCase();
          return (
            !message.startsWith("merge pull request") &&
            !message.startsWith("merge branch")
          );
        })
        .map((commit) => ({
          sha: commit.sha,
          commit: {
            message: commit.commit.message,
            author: {
              name: commit.commit.author?.name || "Unknown",
              email: commit.commit.author?.email || "",
              date: commit.commit.author?.date || new Date().toISOString(),
            },
          },
        }));

      commits.push(...filteredCommits);

      if (data.length < perPage) break;
      page++;
    } catch (error) {
      // Repository might be empty or we don't have access
      console.error(`Error fetching commits for ${owner}/${repo}:`, error);
      break;
    }
  }

  return commits;
}

export async function getCommitDetails(
  client: Octokit,
  owner: string,
  repo: string,
  sha: string
): Promise<GitHubCommit | null> {
  try {
    const { data } = await client.repos.getCommit({
      owner,
      repo,
      ref: sha,
    });

    return {
      sha: data.sha,
      commit: {
        message: data.commit.message,
        author: {
          name: data.commit.author?.name || "Unknown",
          email: data.commit.author?.email || "",
          date: data.commit.author?.date || new Date().toISOString(),
        },
      },
      stats:
        data.stats?.additions !== undefined &&
        data.stats?.deletions !== undefined
          ? {
              additions: data.stats.additions,
              deletions: data.stats.deletions,
            }
          : undefined,
      files: data.files?.map((f) => ({ filename: f.filename })),
    };
  } catch {
    return null;
  }
}
