import { copyFileSync, existsSync, mkdirSync, writeFileSync } from "node:fs";
import { extname, resolve } from "node:path";
import type { DownloadTask } from "../../domain/entities/download-task.js";
import type { Track } from "../../domain/entities/track.js";
import type { Downloader } from "../../domain/services/downloader.js";
import { createId } from "../../shared/utils/id.js";
import { nowIso } from "../../shared/utils/time.js";

function sanitizeSegment(input: string): string {
  return input.replace(/[<>:"/\\|?*\x00-\x1F]/g, "_").trim();
}

function resolveSourceAudioPath(track: Track): string | null {
  const candidates = [track.filePath, track.id].filter((value): value is string => Boolean(value));
  for (const candidate of candidates) {
    if (existsSync(candidate)) {
      return candidate;
    }
  }

  return null;
}

function buildUniqueFilePath(directory: string, baseName: string, extension: string): string {
  const normalizedExtension = extension || ".mp3";
  const initialPath = resolve(directory, `${baseName}${normalizedExtension}`);
  if (!existsSync(initialPath)) {
    return initialPath;
  }

  let index = 2;
  while (true) {
    const candidatePath = resolve(directory, `${baseName} (${index})${normalizedExtension}`);
    if (!existsSync(candidatePath)) {
      return candidatePath;
    }
    index += 1;
  }
}

export class FileDownloader implements Downloader {
  constructor(private readonly downloadDir = process.env.MUSIC_DOWNLOAD_DIR ?? "./downloads") {}

  async downloadTrack(input: { userId: string; track: Track }): Promise<DownloadTask> {
    mkdirSync(resolve(this.downloadDir), { recursive: true });

    const safeArtist = sanitizeSegment(input.track.artist);
    const safeTitle = sanitizeSegment(input.track.title);
    const sourceAudioPath = resolveSourceAudioPath(input.track);
    const sourceExtension = sourceAudioPath ? extname(sourceAudioPath) || ".mp3" : ".txt";
    const fileBaseName = `${safeArtist} - ${safeTitle}`;
    const filePath = buildUniqueFilePath(this.downloadDir, fileBaseName, sourceExtension);

    if (sourceAudioPath) {
      copyFileSync(sourceAudioPath, filePath);
    } else {
      writeFileSync(
        filePath,
        [
          "Music Skill MVP download placeholder",
          `trackId=${input.track.id}`,
          `title=${input.track.title}`,
          `artist=${input.track.artist}`,
          `source=${input.track.source}`
        ].join("\n"),
        "utf8"
      );
    }

    return {
      id: createId("download"),
      userId: input.userId,
      trackId: input.track.id,
      trackTitle: input.track.title,
      artistName: input.track.artist,
      filePath,
      status: "completed",
      createdAt: nowIso()
    };
  }
}
