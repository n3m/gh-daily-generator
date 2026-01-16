# syntax=docker/dockerfile:1

FROM node:22-slim AS base

# Install pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

# Install dependencies only when needed
FROM base AS deps
WORKDIR /app

# Install dependencies
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

# Rebuild the source code only when needed
FROM base AS builder
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Generate Prisma client
RUN pnpm exec prisma generate

# Build the application
ENV NEXT_TELEMETRY_DISABLED=1
RUN pnpm build

# Production image, copy all the files and run next
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Install dependencies needed for Claude Code CLI
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

RUN groupadd --system --gid 1001 nodejs
RUN useradd --system --uid 1001 --gid nodejs --create-home nextjs

# Install Claude Code CLI as nextjs user
USER nextjs
ENV HOME=/home/nextjs

# Install Claude CLI and verify installation
RUN curl -fsSL https://claude.ai/install.sh | bash \
    && echo "Claude CLI installed, verifying..." \
    && ls -la /home/nextjs/.claude/local/bin/ || true \
    && /home/nextjs/.claude/local/bin/claude --version || echo "Warning: claude --version failed"

# Switch back to root to copy files
USER root

# Copy necessary files
COPY --from=builder /app/public ./public
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/prisma.config.ts ./prisma.config.ts

# Set the correct permission for prerender cache
RUN mkdir .next
RUN chown nextjs:nodejs .next

# Automatically leverage output traces to reduce image size
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

# Add Claude CLI to PATH for nextjs user
ENV PATH="/home/nextjs/.claude/local/bin:${PATH}"
ENV HOME=/home/nextjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["node", "server.js"]
