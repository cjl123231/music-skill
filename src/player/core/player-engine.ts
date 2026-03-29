import type { PlaybackState } from "../../domain/entities/playback-state.js";
import type { Track } from "../../domain/entities/track.js";
import type { PlaybackController } from "../../domain/services/playback-controller.js";
import { AppError } from "../../shared/errors/app-error.js";
import { ErrorCodes } from "../../shared/errors/error-codes.js";

type TrackListResolver = () => Promise<Track[]>;

export class PlayerEngine {
  private playbackAnchorAt = 0;
  private elapsedBeforeAnchorMs = 0;
  private playback: PlaybackState = {
    status: "idle",
    track: null,
    volumePercent: 50
  };

  constructor(
    private readonly resolveTracks: TrackListResolver,
    private readonly playbackController?: PlaybackController
  ) {}

  async play(track: Track): Promise<PlaybackState> {
    if (this.playbackController) {
      await this.playbackController.play(track);
    }

    this.playbackAnchorAt = Date.now();
    this.elapsedBeforeAnchorMs = 0;
    this.playback = { ...this.playback, status: "playing", track };
    return this.playback;
  }

  async restorePlayback(track: Track, status: PlaybackState["status"] = "paused"): Promise<PlaybackState> {
    this.playbackAnchorAt = status === "playing" ? Date.now() : 0;
    this.elapsedBeforeAnchorMs = 0;
    this.playback = { ...this.playback, track, status };
    return this.playback;
  }

  async pause(): Promise<PlaybackState> {
    this.ensureTrack();
    if (this.playbackController) {
      await this.playbackController.pause();
    }

    this.freezeElapsedClock();
    this.playback = { ...this.playback, status: "paused" };
    return this.playback;
  }

  async resume(): Promise<PlaybackState> {
    this.ensureTrack();
    if (this.playbackController) {
      await this.playbackController.resume();
    }

    this.playbackAnchorAt = Date.now();
    this.playback = { ...this.playback, status: "playing" };
    return this.playback;
  }

  async stop(): Promise<PlaybackState> {
    if (this.playbackController) {
      await this.playbackController.stop();
    }

    this.playbackAnchorAt = 0;
    this.elapsedBeforeAnchorMs = 0;
    this.playback = { ...this.playback, status: "idle", track: null };
    return this.playback;
  }

  async next(): Promise<PlaybackState> {
    this.ensureTrack();
    return this.advanceBy(1);
  }

  async previous(): Promise<PlaybackState> {
    this.ensureTrack();
    return this.advanceBy(-1);
  }

  async setVolume(percent: number): Promise<PlaybackState> {
    if (this.playbackController) {
      await this.playbackController.setVolume(percent);
    }

    this.playback = { ...this.playback, volumePercent: percent };
    return this.playback;
  }

  async getState(): Promise<PlaybackState> {
    if (this.playbackController?.getPlaybackState) {
      const controllerState = await this.playbackController.getPlaybackState();
      const nextVolumePercent = this.playback.volumePercent;

      if (
        controllerState.status === "idle" &&
        this.playback.status === "playing" &&
        this.playback.track &&
        this.shouldAdvanceToNextTrack()
      ) {
        try {
          return await this.advanceBy(1);
        } catch {
          this.playback = {
            ...this.playback,
            status: "idle",
            volumePercent: nextVolumePercent
          };
          return this.playback;
        }
      }

      if (controllerState.status === "idle") {
        this.playback = {
          ...this.playback,
          status: this.playback.track ? this.playback.status : "idle",
          volumePercent: nextVolumePercent
        };
        return this.playback;
      }

      this.playback = {
        ...this.playback,
        status: controllerState.status,
        volumePercent: nextVolumePercent
      };
    }

    return this.playback;
  }

  getEstimatedElapsedMs(): number {
    if (!this.playback.track) {
      return 0;
    }

    if (this.playback.status === "playing" && this.playbackAnchorAt) {
      return this.elapsedBeforeAnchorMs + Math.max(0, Date.now() - this.playbackAnchorAt);
    }

    return this.elapsedBeforeAnchorMs;
  }

  private async advanceBy(offset: number): Promise<PlaybackState> {
    const tracks = await this.resolveTracks();
    if (!tracks.length) {
      throw new AppError("There are no tracks in the current library.", ErrorCodes.MusicNotFound);
    }

    const currentIndex = tracks.findIndex((track) => track.id === this.playback.track?.id);
    const normalizedIndex = currentIndex >= 0 ? currentIndex : 0;
    const nextIndex = (normalizedIndex + offset + tracks.length) % tracks.length;
    const nextTrack = tracks[nextIndex];

    if (this.playbackController) {
      await this.playbackController.play(nextTrack);
    }

    this.playbackAnchorAt = Date.now();
    this.elapsedBeforeAnchorMs = 0;
    this.playback = { ...this.playback, status: "playing", track: nextTrack };
    return this.playback;
  }

  private ensureTrack(): void {
    if (!this.playback.track) {
      throw new AppError("There is no track currently playing.", ErrorCodes.MusicNotPlaying);
    }
  }

  private freezeElapsedClock(): void {
    if (this.playback.status === "playing" && this.playbackAnchorAt) {
      this.elapsedBeforeAnchorMs += Math.max(0, Date.now() - this.playbackAnchorAt);
      this.playbackAnchorAt = 0;
    }
  }

  private shouldAdvanceToNextTrack(): boolean {
    const durationMs = this.playback.track?.durationMs;
    if (!durationMs) {
      return false;
    }

    const elapsedMs = this.getEstimatedElapsedMs();
    return elapsedMs >= Math.max(0, durationMs - 1500);
  }
}
