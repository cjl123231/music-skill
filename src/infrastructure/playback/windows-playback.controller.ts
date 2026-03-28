import { spawn, type ChildProcessWithoutNullStreams } from "node:child_process";
import { pathToFileURL } from "node:url";
import type { Track } from "../../domain/entities/track.js";
import type { PlaybackController } from "../../domain/services/playback-controller.js";
import { AppError } from "../../shared/errors/app-error.js";
import { ErrorCodes } from "../../shared/errors/error-codes.js";

interface PlayerReply {
  ok: boolean;
  error?: string;
}

export class WindowsPlaybackController implements PlaybackController {
  private host: ChildProcessWithoutNullStreams | null = null;
  private volumePercent = 50;

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

  private ensureHost(): ChildProcessWithoutNullStreams {
    if (this.host && !this.host.killed) {
      return this.host;
    }

    this.host = spawn(
      "powershell",
      ["-NoProfile", "-ExecutionPolicy", "Bypass", "-File", "scripts/player-host.ps1"],
      {
        cwd: process.cwd(),
        stdio: ["pipe", "pipe", "pipe"]
      }
    );

    this.host.unref();

    return this.host;
  }

  private send(command: Record<string, unknown>): Promise<void> {
    const host = this.ensureHost();

    return new Promise((resolve, reject) => {
      const handleStdout = (chunk: Buffer) => {
        const line = chunk.toString("utf8").trim();
        if (!line) {
          return;
        }

        cleanup();

        try {
          const parsed = JSON.parse(line) as PlayerReply;
          if (parsed.ok) {
            resolve();
            return;
          }

          reject(new AppError(parsed.error ?? "Playback host failed.", ErrorCodes.InvalidInput));
        } catch (error) {
          reject(error);
        }
      };

      const handleStderr = (chunk: Buffer) => {
        cleanup();
        reject(new AppError(chunk.toString("utf8"), ErrorCodes.InvalidInput));
      };

      const cleanup = () => {
        host.stdout.off("data", handleStdout);
        host.stderr.off("data", handleStderr);
      };

      host.stdout.on("data", handleStdout);
      host.stderr.on("data", handleStderr);
      host.stdin.write(`${JSON.stringify(command)}\n`);
    });
  }
}
