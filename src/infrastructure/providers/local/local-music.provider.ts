import { readdirSync } from "node:fs";
import { basename, extname, join, resolve } from "node:path";
import type { PlaybackState } from "../../../domain/entities/playback-state.js";
import type { Track } from "../../../domain/entities/track.js";
import type { MusicProvider } from "../../../domain/services/music-provider.js";
import type { PlaybackController } from "../../../domain/services/playback-controller.js";
import { parseAudioMetadata } from "./music-metadata-loader.js";
import { PlayerEngine } from "../../../player/core/player-engine.js";

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
  private readonly playerEngine: PlayerEngine;

  constructor(
    private readonly musicDir: string,
    private readonly playbackController?: PlaybackController
  ) {
    this.filePaths = walkFiles(musicDir);
    this.playerEngine = new PlayerEngine(() => this.getTracks(), playbackController);
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
    return this.playerEngine.play(track);
  }

  async restorePlayback(track: Track, status: PlaybackState["status"] = "paused"): Promise<PlaybackState> {
    return this.playerEngine.restorePlayback(track, status);
  }

  async pause(): Promise<PlaybackState> {
    return this.playerEngine.pause();
  }

  async resume(): Promise<PlaybackState> {
    return this.playerEngine.resume();
  }

  async next(): Promise<PlaybackState> {
    return this.playerEngine.next();
  }

  async previous(): Promise<PlaybackState> {
    return this.playerEngine.previous();
  }

  async setVolume(percent: number): Promise<PlaybackState> {
    return this.playerEngine.setVolume(percent);
  }

  async getNowPlaying(): Promise<PlaybackState> {
    return this.playerEngine.getState();
  }
}
