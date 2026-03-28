import type { DownloadTask } from "../entities/download-task.js";
import type { Track } from "../entities/track.js";

export interface Downloader {
  downloadTrack(input: { userId: string; track: Track }): Promise<DownloadTask>;
}
