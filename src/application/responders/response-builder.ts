import type { DownloadTask } from "../../domain/entities/download-task.js";
import type { PlaybackState } from "../../domain/entities/playback-state.js";
import type { Track } from "../../domain/entities/track.js";
import { loadResponses, type ResponseEntry } from "../search/csv-loader.js";

let templates: Map<string, ResponseEntry> | null = null;

function getTemplates(): Map<string, ResponseEntry> {
  if (!templates) {
    try {
      const entries = loadResponses();
      templates = new Map(entries.map((entry) => [entry.key, entry]));
    } catch {
      templates = new Map();
    }
  }
  return templates;
}

function render(key: string, vars: Record<string, string | number> = {}, fallback = ""): string {
  const entry = getTemplates().get(key);
  if (!entry) return fallback;

  let text = entry.templateZh;
  for (const [varName, value] of Object.entries(vars)) {
    text = text.replaceAll(`{{${varName}}}`, String(value));
  }
  return text;
}

export function buildPlaybackReply(state: PlaybackState): string {
  if (state.status === "playing" && state.track) {
    return render(
      "playback.playing",
      {
        artist: state.track.artist,
        title: state.track.title
      },
      `\u6b63\u5728\u64ad\u653e ${state.track.artist} \u7684\u300a${state.track.title}\u300b\u3002`
    );
  }

  if (state.status === "paused") {
    return render("playback.paused", {}, "\u5df2\u6682\u505c\u64ad\u653e\u3002");
  }

  return render("playback.idle", {}, "\u5f53\u524d\u6ca1\u6709\u6b63\u5728\u64ad\u653e\u7684\u97f3\u4e50\u3002");
}

export function buildVolumeReply(state: PlaybackState): string {
  return render("volume.set", { volumePercent: state.volumePercent }, `\u97f3\u91cf\u5df2\u8c03\u6574\u5230 ${state.volumePercent}%\u3002`);
}

export function buildFavoriteReply(trackTitle: string): string {
  return render("favorite.added", { title: trackTitle }, `\u5df2\u6536\u85cf\u300a${trackTitle}\u300b\u3002`);
}

export function buildFavoriteListReply(tracks: Track[]): string {
  if (tracks.length === 0) {
    return render("favorite.list.empty", {}, "\u4f60\u8fd8\u6ca1\u6709\u6536\u85cf\u4efb\u4f55\u6b4c\u66f2\u3002");
  }

  const latest = tracks.slice(0, 5).map((track) => `\u300a${track.title}\u300b`);
  return render(
    "favorite.list",
    {
      count: tracks.length,
      latest: latest.join("\u3001")
    },
    `\u4f60\u5df2\u6536\u85cf ${tracks.length} \u9996\u6b4c\uff0c\u6700\u8fd1\u5305\u62ec\uff1a${latest.join("\u3001")}\u3002`
  );
}

export function buildPlaylistReply(trackTitle: string, playlistName: string): string {
  return render(
    "playlist.added",
    {
      title: trackTitle,
      playlistName
    },
    `\u5df2\u628a\u300a${trackTitle}\u300b\u52a0\u5165\u6b4c\u5355\u201c${playlistName}\u201d\u3002`
  );
}

export function buildDownloadReply(trackTitle: string, filePath: string): string {
  return render(
    "download.done",
    {
      title: trackTitle,
      filePath
    },
    `\u5df2\u4e0b\u8f7d\u300a${trackTitle}\u300b\uff0c\u4fdd\u5b58\u5230 ${filePath}\u3002`
  );
}

export function buildDownloadStatusReply(task: DownloadTask | null): string {
  if (!task) {
    return render("download.status.empty", {}, "\u5f53\u524d\u8fd8\u6ca1\u6709\u4e0b\u8f7d\u4efb\u52a1\u3002");
  }

  return render(
    "download.status",
    {
      title: task.trackTitle,
      filePath: task.filePath
    },
    `\u6700\u8fd1\u4e00\u6b21\u4e0b\u8f7d\u5df2\u5b8c\u6210\uff1a\u300a${task.trackTitle}\u300b\uff0c\u6587\u4ef6\u4f4d\u4e8e ${task.filePath}\u3002`
  );
}

export function buildDownloadListReply(tasks: DownloadTask[]): string {
  if (tasks.length === 0) {
    return render("download.list.empty", {}, "\u5f53\u524d\u6ca1\u6709\u4e0b\u8f7d\u8bb0\u5f55\u3002");
  }

  const latest = tasks.slice(0, 3).map((task) => `\u300a${task.trackTitle}\u300b`);
  return render(
    "download.list",
    { latest: latest.join("\u3001") },
    `\u6700\u8fd1\u4e0b\u8f7d\u7684\u5185\u5bb9\u6709\uff1a${latest.join("\u3001")}\u3002`
  );
}
