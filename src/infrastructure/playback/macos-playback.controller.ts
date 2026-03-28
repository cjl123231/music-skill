import { spawn, type ChildProcess } from "node:child_process";
import type { PlaybackState } from "../../domain/entities/playback-state.js";
import type { Track } from "../../domain/entities/track.js";
import type { PlaybackController } from "../../domain/services/playback-controller.js";
import { AppError } from "../../shared/errors/app-error.js";
import { ErrorCodes } from "../../shared/errors/error-codes.js";

export class MacOSPlaybackController implements PlaybackController {
  private host: ChildProcess | null = null;
  private currentTrack: Track | null = null;
  private volumePercent = 50;
  private paused = false;

  async play(track: Track): Promise<void> {
    if (!track.filePath) {
      throw new AppError("Track file path is missing.", ErrorCodes.InvalidInput);
    }

    this.stopHost();
    this.currentTrack = track;
    this.paused = false;
    this.host = this.spawnHost(track.filePath, this.volumePercent);
  }

  async pause(): Promise<void> {
    if (!this.host || this.host.killed) {
      throw new AppError("There is no track currently playing.", ErrorCodes.MusicNotPlaying);
    }

    process.kill(this.host.pid!, "SIGSTOP");
    this.paused = true;
  }

  async resume(): Promise<void> {
    if (!this.host || this.host.killed) {
      if (!this.currentTrack) {
        throw new AppError("There is no track currently playing.", ErrorCodes.MusicNotPlaying);
      }

      this.host = this.spawnHost(this.currentTrack.filePath!, this.volumePercent);
      this.paused = false;
      return;
    }

    process.kill(this.host.pid!, "SIGCONT");
    this.paused = false;
  }

  async stop(): Promise<void> {
    this.stopHost();
    this.paused = false;
  }

  async setVolume(percent: number): Promise<void> {
    this.volumePercent = percent;
    await this.setSystemVolume(percent);
  }

  async getPlaybackState(): Promise<Pick<PlaybackState, "status" | "volumePercent">> {
    const activeHost = this.host && !this.host.killed;

    return {
      status: activeHost ? (this.paused ? "paused" : "playing") : "idle",
      volumePercent: this.volumePercent
    };
  }

  private spawnHost(filePath: string, volumePercent: number): ChildProcess {
    const normalizedVolume = Math.max(0, Math.min(1, volumePercent / 100));
    const host = spawn("afplay", ["-v", normalizedVolume.toFixed(2), filePath], {
      stdio: ["ignore", "ignore", "pipe"]
    });

    host.on("exit", () => {
      if (this.host?.pid === host.pid) {
        this.host = null;
        this.paused = false;
      }
    });

    return host;
  }

  private stopHost(): void {
    if (this.host && !this.host.killed && this.host.pid) {
      process.kill(this.host.pid, "SIGTERM");
    }
    this.host = null;
  }

  private async setSystemVolume(percent: number): Promise<void> {
    await new Promise<void>((resolve, reject) => {
      const command = `set volume output volume ${Math.max(0, Math.min(100, Math.round(percent)))}`
        ;
      const child = spawn("osascript", ["-e", command], {
        stdio: ["ignore", "ignore", "pipe"]
      });

      let stderr = "";
      child.stderr?.on("data", (chunk: Buffer) => {
        stderr += chunk.toString("utf8");
      });

      child.on("error", (error) => {
        reject(new AppError(error.message, ErrorCodes.InvalidInput));
      });

      child.on("exit", (code) => {
        if (code === 0) {
          resolve();
          return;
        }

        reject(new AppError(stderr.trim() || "Failed to set macOS volume.", ErrorCodes.InvalidInput));
      });
    });
  }
}
