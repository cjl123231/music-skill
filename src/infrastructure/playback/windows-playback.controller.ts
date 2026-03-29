import { spawn, type ChildProcessWithoutNullStreams } from "node:child_process";
import { pathToFileURL } from "node:url";
import { resolve as pathResolve } from "node:path";
import { existsSync } from "node:fs";
import type { Track } from "../../domain/entities/track.js";
import type { PlaybackController } from "../../domain/services/playback-controller.js";
import { AppError } from "../../shared/errors/app-error.js";
import { ErrorCodes } from "../../shared/errors/error-codes.js";

interface PlayerReply {
  ok: boolean;
  error?: string;
  status?: "idle" | "playing" | "paused";
  volumePercent?: number;
}

type HostFactory = () => ChildProcessWithoutNullStreams;

function defaultHostFactory(): ChildProcessWithoutNullStreams {
  const cwd = process.cwd();
  const exePath = pathResolve(cwd, "scripts", "player-host.exe");
  const backend = (process.env.MUSIC_PLAYER_BACKEND ?? "powershell").toLowerCase();

  // Native host is opt-in until it proves stable on the target machine.
  if (backend === "native" && existsSync(exePath)) {
    return spawn(exePath, [], { cwd, stdio: ["pipe", "pipe", "pipe"] });
  }

  return spawn("powershell",
    ["-NoProfile", "-ExecutionPolicy", "Bypass", "-File", "scripts/player-host.ps1"],
    { cwd, stdio: ["pipe", "pipe", "pipe"] }
  );
}

export class WindowsPlaybackController implements PlaybackController {
  private host: ChildProcessWithoutNullStreams | null = null;
  private volumePercent = 50;
  private stdoutBuffer = "";
  private inFlight = Promise.resolve();

  constructor(private readonly createHost: HostFactory = defaultHostFactory) {}

  async play(track: Track): Promise<void> {
    if (!track.filePath) {
      throw new AppError("Track file path is missing.", ErrorCodes.InvalidInput);
    }

    await this.send({
      action: "play",
      fileUrl: pathToFileURL(track.filePath).href,
      volumePercent: this.volumePercent
    });
  }

  async pause(): Promise<void> {
    await this.send({ action: "pause" });
  }

  async resume(): Promise<void> {
    await this.send({ action: "resume" });
  }

  async stop(): Promise<void> {
    await this.send({ action: "stop" });
  }

  async setVolume(percent: number): Promise<void> {
    this.volumePercent = percent;
    await this.send({ action: "set_volume", volumePercent: percent });
  }

  async getPlaybackState(): Promise<{ status: "idle" | "playing" | "paused"; volumePercent: number }> {
    const reply = await this.sendWithReply({ action: "get_state" });
    return {
      status: reply.status ?? "idle",
      volumePercent: reply.volumePercent ?? this.volumePercent
    };
  }

  private ensureHost(): ChildProcessWithoutNullStreams {
    if (this.host && !this.host.killed) {
      return this.host;
    }

    this.host = this.createHost();

    this.host.unref();
    this.host.stdout.setEncoding("utf8");

    return this.host;
  }

  private send(command: Record<string, unknown>): Promise<void> {
    const operation = this.inFlight.then(() => this.sendSerialized(command).then(() => undefined));
    this.inFlight = operation.catch(() => undefined);
    return operation;
  }

  private sendWithReply(command: Record<string, unknown>): Promise<PlayerReply> {
    const operation = this.inFlight.then(() => this.sendSerialized(command));
    this.inFlight = operation.then(() => undefined).catch(() => undefined);
    return operation;
  }

  private sendSerialized(command: Record<string, unknown>): Promise<PlayerReply> {
    const host = this.ensureHost();

    return new Promise((resolve, reject) => {
      const handleStdout = (chunk: string | Buffer) => {
        this.stdoutBuffer += typeof chunk === "string" ? chunk : chunk.toString("utf8");

        while (true) {
          const newlineIndex = this.stdoutBuffer.indexOf("\n");
          if (newlineIndex === -1) {
            return;
          }

          const line = this.stdoutBuffer.slice(0, newlineIndex).trim();
          this.stdoutBuffer = this.stdoutBuffer.slice(newlineIndex + 1);

          if (!line) {
            continue;
          }

          cleanup();

          try {
            const parsed = JSON.parse(line) as PlayerReply;
            if (parsed.ok) {
              resolve(parsed);
              return;
            }

            reject(new AppError(parsed.error ?? "Playback host failed.", ErrorCodes.InvalidInput));
            return;
          } catch (error) {
            reject(error);
            return;
          }
        }
      };

      const handleStderr = (chunk: Buffer | string) => {
        cleanup();
        const stderr = typeof chunk === "string" ? chunk : chunk.toString("utf8");
        reject(new AppError(stderr.trim() || "Playback host failed.", ErrorCodes.InvalidInput));
      };

      const handleExit = () => {
        cleanup();
        this.host = null;
        reject(new AppError("Playback host exited unexpectedly.", ErrorCodes.InvalidInput));
      };

      const cleanup = () => {
        host.stdout.off("data", handleStdout);
        host.stderr.off("data", handleStderr);
        host.off("exit", handleExit);
      };

      host.stdout.on("data", handleStdout);
      host.stderr.on("data", handleStderr);
      host.on("exit", handleExit);
      host.stdin.write(`${JSON.stringify(command)}\n`);
    });
  }
}
