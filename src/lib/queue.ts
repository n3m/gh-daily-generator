import { PgBoss } from "pg-boss";

const connectionString = process.env.DATABASE_URL!;

let boss: PgBoss | null = null;

export async function getQueue(): Promise<PgBoss> {
  if (!boss) {
    boss = new PgBoss(connectionString);
    await boss.start();
  }
  return boss;
}

// Job types
export const QUEUE_NAMES = {
  GENERATE_DAILY: "generate-daily",
  GENERATE_WEEKLY: "generate-weekly",
  SYNC_COMMITS: "sync-commits",
} as const;

export interface GenerateDailyPayload {
  userId: string;
  date: string; // ISO date string
  organizationId: string;
}

export interface GenerateWeeklyPayload {
  userId: string;
  weekStart: string; // ISO date string
  weekEnd: string;
  useExistingDailys: boolean;
}

export interface SyncCommitsPayload {
  userId: string;
  organizationId: string;
  since?: string; // ISO date string
  until?: string;
}

export type QueuePayload =
  | GenerateDailyPayload
  | GenerateWeeklyPayload
  | SyncCommitsPayload;

// Enqueue functions
export async function enqueueDailyGeneration(
  payload: GenerateDailyPayload
): Promise<string | null> {
  const queue = await getQueue();
  return queue.send(QUEUE_NAMES.GENERATE_DAILY, payload);
}

export async function enqueueWeeklyGeneration(
  payload: GenerateWeeklyPayload
): Promise<string | null> {
  const queue = await getQueue();
  return queue.send(QUEUE_NAMES.GENERATE_WEEKLY, payload);
}

export async function enqueueCommitSync(
  payload: SyncCommitsPayload
): Promise<string | null> {
  const queue = await getQueue();
  return queue.send(QUEUE_NAMES.SYNC_COMMITS, payload);
}

// Graceful shutdown
export async function stopQueue(): Promise<void> {
  if (boss) {
    await boss.stop();
    boss = null;
  }
}
