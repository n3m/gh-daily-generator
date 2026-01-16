import { spawn } from "node:child_process";
import { NextResponse } from "next/server";

interface DebugResult {
  timestamp: string;
  environment: {
    PATH: string | undefined;
    HOME: string | undefined;
    USER: string | undefined;
    NODE_ENV: string | undefined;
    ANTHROPIC_API_KEY: string | undefined;
  };
  checks: {
    whichClaude: {
      success: boolean;
      result: string | null;
      error: string | null;
    };
    claudeVersion: {
      success: boolean;
      exitCode: number | null;
      stdout: string | null;
      stderr: string | null;
      error: string | null;
    };
    claudeHelp: {
      success: boolean;
      exitCode: number | null;
      stdout: string | null;
      stderr: string | null;
      error: string | null;
    };
    simplePrompt: {
      success: boolean;
      exitCode: number | null;
      stdout: string | null;
      stderr: string | null;
      error: string | null;
      duration: number | null;
    };
  };
  recommendations: string[];
}

async function runCommand(
  cmd: string,
  args: string[],
  options?: { input?: string; timeout?: number }
): Promise<{
  success: boolean;
  exitCode: number | null;
  stdout: string | null;
  stderr: string | null;
  error: string | null;
  duration: number;
}> {
  return new Promise((resolve) => {
    const startTime = Date.now();
    const timeout = options?.timeout ?? 30000;

    try {
      const child = spawn(cmd, args, {
        stdio: ["pipe", "pipe", "pipe"],
      });

      let stdout = "";
      let stderr = "";

      const timeoutId = setTimeout(() => {
        child.kill("SIGTERM");
        resolve({
          success: false,
          exitCode: null,
          stdout: stdout || null,
          stderr: stderr || null,
          error: `Timeout after ${timeout}ms`,
          duration: Date.now() - startTime,
        });
      }, timeout);

      if (options?.input) {
        child.stdin.write(options.input);
        child.stdin.end();
      }

      child.stdout.on("data", (data) => {
        stdout += data.toString();
      });

      child.stderr.on("data", (data) => {
        stderr += data.toString();
      });

      child.on("close", (code) => {
        clearTimeout(timeoutId);
        resolve({
          success: code === 0,
          exitCode: code,
          stdout: stdout.trim() || null,
          stderr: stderr.trim() || null,
          error: null,
          duration: Date.now() - startTime,
        });
      });

      child.on("error", (err) => {
        clearTimeout(timeoutId);
        resolve({
          success: false,
          exitCode: null,
          stdout: stdout.trim() || null,
          stderr: stderr.trim() || null,
          error: err.message,
          duration: Date.now() - startTime,
        });
      });
    } catch (err) {
      resolve({
        success: false,
        exitCode: null,
        stdout: null,
        stderr: null,
        error: err instanceof Error ? err.message : String(err),
        duration: Date.now() - startTime,
      });
    }
  });
}

async function tryWhich(): Promise<{ success: boolean; result: string | null; error: string | null }> {
  const result = await runCommand("which", ["claude"], { timeout: 5000 });

  if (result.success && result.stdout) {
    return {
      success: true,
      result: result.stdout,
      error: null,
    };
  }

  return {
    success: false,
    result: null,
    error: result.error || "Claude not found in PATH",
  };
}

export async function GET() {
  const result: DebugResult = {
    timestamp: new Date().toISOString(),
    environment: {
      PATH: process.env.PATH,
      HOME: process.env.HOME,
      USER: process.env.USER,
      NODE_ENV: process.env.NODE_ENV,
      ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY
        ? `${process.env.ANTHROPIC_API_KEY.substring(0, 10)}...`
        : undefined,
    },
    checks: {
      whichClaude: { success: false, result: null, error: null },
      claudeVersion: { success: false, exitCode: null, stdout: null, stderr: null, error: null },
      claudeHelp: { success: false, exitCode: null, stdout: null, stderr: null, error: null },
      simplePrompt: { success: false, exitCode: null, stdout: null, stderr: null, error: null, duration: null },
    },
    recommendations: [],
  };

  // Check 1: which claude
  result.checks.whichClaude = await tryWhich();

  // Check 2: claude --version
  const versionResult = await runCommand("claude", ["--version"]);
  result.checks.claudeVersion = {
    success: versionResult.success,
    exitCode: versionResult.exitCode,
    stdout: versionResult.stdout,
    stderr: versionResult.stderr,
    error: versionResult.error,
  };

  // Check 3: claude --help (in case --version doesn't work)
  const helpResult = await runCommand("claude", ["--help"]);
  result.checks.claudeHelp = {
    success: helpResult.success,
    exitCode: helpResult.exitCode,
    stdout: helpResult.stdout ? helpResult.stdout.substring(0, 500) + "..." : null,
    stderr: helpResult.stderr,
    error: helpResult.error,
  };

  // Check 4: Simple prompt test (only if version check passed)
  if (result.checks.claudeVersion.success || result.checks.claudeHelp.success) {
    const promptResult = await runCommand("claude", ["--print"], {
      input: "Reply with just the word 'OK'",
      timeout: 60000,
    });
    result.checks.simplePrompt = {
      success: promptResult.success,
      exitCode: promptResult.exitCode,
      stdout: promptResult.stdout,
      stderr: promptResult.stderr,
      error: promptResult.error,
      duration: promptResult.duration,
    };
  } else {
    result.checks.simplePrompt = {
      success: false,
      exitCode: null,
      stdout: null,
      stderr: null,
      error: "Skipped - Claude CLI not found",
      duration: null,
    };
  }

  // Generate recommendations
  if (!result.checks.whichClaude.success) {
    result.recommendations.push(
      "Claude CLI not found in PATH. Make sure it's installed and the PATH includes the installation directory."
    );
    result.recommendations.push(
      `Current PATH: ${result.environment.PATH}`
    );
    result.recommendations.push(
      "For Docker: ensure PATH includes /home/nextjs/.local/bin (Claude CLI installs to ~/.local/bin)"
    );
  }

  if (result.checks.claudeVersion.error === "spawn claude ENOENT") {
    result.recommendations.push(
      "ENOENT error means the 'claude' command was not found. Install Claude CLI or fix PATH."
    );
  }

  if (result.checks.claudeVersion.stderr?.includes("not authenticated")) {
    result.recommendations.push(
      "Claude CLI is not authenticated. Run 'claude login' to authenticate."
    );
  }

  if (result.checks.simplePrompt.error?.includes("Timeout")) {
    result.recommendations.push(
      "Claude CLI timed out. This could be a network issue or the CLI is hanging."
    );
  }

  // Check for authentication issues
  const promptOutput = result.checks.simplePrompt.stdout || "";
  if (
    promptOutput.includes("Invalid API key") ||
    promptOutput.includes("/login") ||
    promptOutput.includes("not authenticated")
  ) {
    result.recommendations.push(
      "Claude CLI is not authenticated. Set the ANTHROPIC_API_KEY environment variable."
    );
    if (!process.env.ANTHROPIC_API_KEY) {
      result.recommendations.push(
        "ANTHROPIC_API_KEY is not set. Add it to your environment variables in Coolify/Docker."
      );
    }
  }

  return NextResponse.json(result, { status: 200 });
}
