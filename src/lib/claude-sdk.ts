import { spawn, ChildProcess } from "node:child_process";

export interface ProgressEvent {
  type:
    | "started"
    | "activity"
    | "stdout"
    | "stderr"
    | "heartbeat"
    | "complete"
    | "error";
  message?: string;
  timestamp: number;
  elapsed: number;
  bytesReceived: number;
}

export interface ClaudeAgentOptions {
  timeout?: number; // ms, default 300000 (5 min)
  onProgress?: (event: ProgressEvent) => void;
  onStderr?: (data: string) => void;
}

export interface ClaudeAgentHandle {
  promise: Promise<string>;
  process: ChildProcess;
  abort: () => void;
}

/**
 * Check if Claude CLI is available
 */
export async function isClaudeAvailable(): Promise<boolean> {
  return new Promise((resolve) => {
    const child = spawn("claude", ["--version"], { stdio: "pipe" });
    child.on("close", (code) => resolve(code === 0));
    child.on("error", () => resolve(false));
  });
}

/**
 * Spawn Claude agent with full control (abort, progress)
 * IMPORTANT: Prompt is sent via stdin, NOT as CLI argument
 */
export function spawnClaudeAgentWithHandle(
  prompt: string,
  options: ClaudeAgentOptions = {}
): ClaudeAgentHandle {
  const { timeout = 300000, onProgress, onStderr } = options;
  const startTime = Date.now();
  let bytesReceived = 0;

  const child = spawn("claude", ["--print"], {
    stdio: ["pipe", "pipe", "pipe"],
  });

  // Send prompt via stdin (NOT as CLI argument)
  child.stdin.write(prompt);
  child.stdin.end();

  const emitProgress = (event: Partial<ProgressEvent>) => {
    onProgress?.({
      timestamp: Date.now(),
      elapsed: Date.now() - startTime,
      bytesReceived,
      ...event,
    } as ProgressEvent);
  };

  emitProgress({ type: "started", message: `PID: ${child.pid}` });

  const promise = new Promise<string>((resolve, reject) => {
    let stdout = "";
    let stderr = "";

    // Timeout handler
    const timeoutId = setTimeout(() => {
      child.kill("SIGTERM");
      emitProgress({ type: "error", message: "Timeout exceeded" });
      reject(new Error(`Timeout after ${timeout}ms`));
    }, timeout);

    child.stdout.on("data", (data) => {
      stdout += data.toString();
      bytesReceived += data.length;
      emitProgress({ type: "stdout" });
    });

    child.stderr.on("data", (data) => {
      stderr += data.toString();
      onStderr?.(data.toString());
      emitProgress({ type: "stderr", message: data.toString().slice(0, 200) });
    });

    child.on("close", (code) => {
      clearTimeout(timeoutId);
      if (code === 0) {
        emitProgress({ type: "complete", message: `${bytesReceived} bytes` });
        resolve(stdout.trim());
      } else {
        emitProgress({ type: "error", message: `Exit ${code}: ${stderr}` });
        reject(new Error(`Exit ${code}: ${stderr}`));
      }
    });

    child.on("error", (err) => {
      clearTimeout(timeoutId);
      emitProgress({ type: "error", message: err.message });
      reject(err);
    });
  });

  return {
    promise,
    process: child,
    abort: () => child.kill("SIGTERM"),
  };
}

/**
 * Simple async call to Claude
 */
export async function spawnClaudeAgent(
  prompt: string,
  options?: ClaudeAgentOptions
): Promise<string> {
  return spawnClaudeAgentWithHandle(prompt, options).promise;
}
