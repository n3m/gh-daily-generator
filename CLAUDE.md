# GitHub Daily Generator

A Next.js web application that generates daily and weekly standup reports from GitHub commits using Claude AI.

## Tech Stack

- **Framework:** Next.js 16 (App Router) + TypeScript
- **Database:** PostgreSQL + Prisma 7 (with `@prisma/adapter-pg`)
- **Auth:** NextAuth.js v5 (beta) with GitHub OAuth + PrismaAdapter
- **AI:** Claude Code CLI SDK (via `--print` flag + stdin)
- **UI:** shadcn/ui + Tailwind CSS 4 + next-themes (dark mode)
- **Package Manager:** pnpm

## Project Structure

```
src/
├── app/
│   ├── (auth)/login/          # Login page
│   ├── (dashboard)/           # Protected dashboard routes
│   │   ├── page.tsx           # Dashboard home with stats
│   │   ├── daily/             # Daily reports
│   │   │   ├── page.tsx       # Calendar + generate
│   │   │   └── [id]/page.tsx  # View single daily
│   │   ├── weekly/            # Weekly reports
│   │   │   ├── page.tsx       # Week selector + generate
│   │   │   └── [id]/page.tsx  # View single weekly
│   │   └── settings/          # Organization settings
│   └── api/
│       ├── auth/[...nextauth]/ # NextAuth routes
│       ├── daily/             # Daily CRUD + generate
│       ├── weekly/            # Weekly CRUD + generate
│       ├── stats/             # Dashboard statistics
│       ├── github/orgs/       # GitHub organizations
│       └── settings/          # User settings
├── components/
│   ├── ui/                    # shadcn components
│   ├── markdown-renderer.tsx  # Render report content
│   ├── theme-provider.tsx     # Dark mode provider
│   └── theme-switcher.tsx     # Theme toggle
└── lib/
    ├── prisma.ts              # Prisma client with pg adapter
    ├── auth.ts                # NextAuth configuration
    ├── github.ts              # GitHub API client (Octokit)
    ├── claude-sdk.ts          # Claude CLI wrapper
    ├── prompts.ts             # AI prompt templates
    └── queue.ts               # Job queue (pg-boss) - not fully implemented
```

## Key Features

### Implemented
- GitHub OAuth login
- Dashboard with stats (dailys/weeklys this month, streak)
- Daily report generation from commits (single or batch)
- Weekly report generation (from dailys or commits)
- Organization filter for commits
- View/delete individual reports
- Copy report content to clipboard
- Settings page for organization selection
- Dark mode support
- Markdown rendering for reports

### Pending/Future
- Job queue system (pg-boss installed but not fully utilized)
- Job status polling for long-running generations
- Commit caching in database
- Repository filtering (include/exclude specific repos)

## Environment Variables

```env
DATABASE_URL=postgresql://user:pass@host:5432/db
DATABASE_SSL=false  # Set to "false" to disable SSL verification

# GitHub OAuth
GITHUB_ID=your_client_id
GITHUB_SECRET=your_client_secret

# NextAuth
NEXTAUTH_SECRET=your_secret
NEXTAUTH_URL=http://localhost:3000
```

## Database

The Prisma schema includes:
- `User`, `Account`, `Session` (NextAuth models)
- `Organization`, `UserOrganization` (saved org preferences)
- `Repository`, `Commit` (for caching - not fully used)
- `DailyReport`, `WeeklyReport` (generated reports)
- `Job` (for async processing - not fully used)

Run migrations:
```bash
pnpm exec prisma db push
```

## Claude CLI Integration

The app uses Claude Code CLI for AI-powered report generation. The CLI is called via spawn with the `--print` flag, and prompts are sent via stdin.

Key files:
- `src/lib/claude-sdk.ts` - CLI wrapper with timeout and error handling
- `src/lib/prompts.ts` - Prompt templates for daily/weekly generation

If Claude CLI is not available, the app falls back to a simple summary format.

## Development

```bash
pnpm install
pnpm dev
```

## Docker Deployment

The project includes a Dockerfile for Coolify deployment. The Docker image:
- Uses Node.js 22 Alpine
- Installs Claude Code CLI for the nextjs user
- Uses standalone output for smaller image size

```bash
docker build -t github-daily-generator .
```

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/daily` | GET | List user's dailys |
| `/api/daily/generate` | POST | Generate daily report(s) |
| `/api/daily/[id]` | GET/DELETE | Get/delete single daily |
| `/api/weekly` | GET | List user's weeklys |
| `/api/weekly/generate` | POST | Generate weekly report |
| `/api/weekly/[id]` | GET/DELETE | Get/delete single weekly |
| `/api/stats` | GET | Dashboard statistics |
| `/api/github/orgs` | GET | User's GitHub organizations |
| `/api/settings/organizations` | GET/POST | Saved org preferences |
| `/api/debug/claude` | GET | Debug Claude CLI availability |

### Debug Endpoint

The `/api/debug/claude` endpoint performs comprehensive checks:
1. `which claude` - Checks if claude is in PATH
2. `claude --version` - Verifies CLI responds to version flag
3. `claude --help` - Alternative check if version fails
4. Simple prompt test - Sends a test prompt if CLI is found

Returns detailed JSON with environment info, check results, and recommendations.

## Notes

- Reports are generated in Spanish by default (configurable in prompts.ts)
- Daily generation uses upsert to avoid duplicates for the same date
- Weekly generation can use existing dailys or fetch commits directly
- The streak calculation checks for consecutive days with dailys
