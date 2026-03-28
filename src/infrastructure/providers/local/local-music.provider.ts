import { readdirSync } from "node:fs";
import { basename, extname, join, resolve } from "node:path";
import type { PlaybackState } from "../../../domain/entities/playback-state.js";
import type { Track } from "../../../domain/entities/track.js";
import type { MusicProvider } from "../../../domain/services/music-provider.js";
import type { PlaybackController } from "../../../domain/services/playback-controller.js";
import { AppError } from "../../../shared/errors/app-error.js";
import { ErrorCodes } from "../../../shared/errors/error-codes.js";
import { parseAudioMetadata } from "./music-metadata-loader.js";

const supportedExtensions = new Set([".mp3", ".flac", ".wav", ".m4a", ".aac", ".ogg"]);

function walkFiles(root: string): string[] {
  const entries = readdirSync(root, { withFileTypes: true });
  const files: string[] = [];

  for (const entry of entries) {
    const fullPath = join(root, entry.name);
    if (entry.isDirectory()) {
      files.push(...walkFiles(fullPath));
      continue;
    }

    if (supportedExtensions.has(extname(entry.name).toLowerCase())) {
      files.push(fullPath);
    }
  }

  return files;
}

function parseTrackFromFilename(filePath: string): Track {
  const fileName = basename(filePath, extname(filePath));
  const parts = fileName.split(" - ");
  const artist = parts.length > 1 ? parts[0].trim() : "Unknown Artist";
  const title = parts.length > 1 ? parts.slice(1).join(" - ").trim() : fileName.trim();

  return {
    id: resolve(filePath),
    title,
    artist,
    filePath: resolve(filePath),
    source: "local",
    playable: true,
    downloadable: true
  };
}

export class LocalMusicProvider implements MusicProvider {
  private readonly filePaths: string[];
  private tracksPromise: Promise<Track[]> | null = null;
  private playback: PlaybackState = {
    status: "idle",
    track: null,
    volumePercent: 50
  };

  constructor(
    private readonly musicDir: string,
    private readonly playbackController?: PlaybackController
  ) {
    this.filePaths = walkFiles(musicDir);
  }

  hasTracks(): boolean {
    return this.filePaths.length > 0;
  }

  private async getTracks(): Promise<Track[]> {
    if (!this.tracksPromise) {
      this.tracksPromise = Promise.all(
        this.filePaths.map(async (filePath) => {
          const fallback = parseTrackFromFilename(filePath);

          try {
            const metadata = await parseAudioMetadata(filePath);
            return {
              ...fallback,
              title: metadata.common.title?.trim() || fallback.title,
              artist: metadata.common.artist?.trim() || fallback.artist,
              album: metadata.common.album?.trim() || fallback.album,
              durationMs: metadata.format.duration ? Math.round(metadata.format.duration * 1000) : undefined
            } satisfies Track;
          } catch {
            return fallback;
          }
        })
      );
    }

    return this.tracksPromise;
  }

  async searchTracks(query: { keyword: string; artistName?: string }): Promise<Track[]> {
    const tracks = await this.getTracks();
    const needle = query.keyword.toLowerCase();
    return tracks.filter((track) => {
      const keywordMatched =
        track.title.toLowerCase().includes(needle) || track.artist.toLowerCase().includes(needle);
      const artistMatched = query.artistName ? track.artist.toLowerCase().includes(query.artistName.toLowerCase()) : true;
      return keywordMatched && artistMatched;
    });
  }

  async listTracks(): Promise<Track[]> {
    return this.getTracks();
  }

  async play(track: Track): Promise<PlaybackState> {
    if (this.playbackController) {
      await this.playbackController.play(track);
    }
    this.playback = { ...this.playback, status: "playing", track };
    return this.playback;
  }

  async pause(): Promise<PlaybackState> {
    this.ensureTrack();
    if (this.playbackController) {
      await this.playbackController.pause();
    }
    this.playback = { ...this.playback, status: "paused" };
    return this.playback;
  }

  async resume(): Promise<PlaybackState> {
    this.ensureTrack();
    if (this.playbackController) {
      await this.playbackController.resume();
    }
    this.playback = { ...this.playback, status: "playing" };
    return this.playback;
  }

  async next(): Promise<PlaybackState> {
    this.ensureTrack();
    const tracks = await this.getTracks();
    const currentIndex = tracks.findIndex((track) => track.id === this.playback.track?.id);
    const nextTrack = tracks[(currentIndex + 1 + tracks.length) % tracks.length];
    if (this.playbackController) {
      await this.playbackController.play(nextTrack);
    }
    this.playback = { ...this.playback, status: "playing", track: nextTrack };
    return this.playback;
  }

  async previous(): Promise<PlaybackState> {
    this.ensureTrack();
    const tracks = await this.getTracks();
    const currentIndex = tracks.findIndex((track) => track.id === this.playback.track?.id);
    const previousTrack = tracks[(currentIndex - 1 + tracks.length) % tracks.length];
    if (this.playbackController) {
      await this.playbackController.play(previousTrack);
    }
    this.playback = { ...this.playback, status: "playing", track: previousTrack };
    return this.playback;
  }

  async setVolume(percent: number): Promise<PlaybackState> {
    if (this.playbackController) {
      await this.playbackController.setVolume(percent);
    }
    this.playback = { ...this.playback, volumePercent: percent };
    return this.playback;
  }

  async getNowPlaying(): Promise<PlaybackState> {
    if (this.playbackController?.getPlaybackState) {
      const controllerState = await this.playbackController.getPlaybackState();
      this.playback = {
        ...this.playback,
        status: controllerState.status,
        volumePercent: controllerState.volumePercent
      };

      if (controllerState.status === "idle") {
        this.playback = {
          ...this.playback,
          track: null
        };
      }
    }

    return this.playback;
  }

  private ensureTrack(): void {
    if (!this.playback.track) {
      throw new AppError("There is no track currently playing.", ErrorCodes.MusicNotPlaying);
    }
  }
}
