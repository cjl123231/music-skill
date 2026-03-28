import type { DownloadTask } from "../../domain/entities/download-task.js";
import type { PlaybackState } from "../../domain/entities/playback-state.js";
import type { Track } from "../../domain/entities/track.js";
import { loadResponses, type ResponseEntry } from "../search/csv-loader.js";

// ============ TEMPLATE ENGINE ============

/** Cache loaded templates */
let _templates: Map<string, ResponseEntry> | null = null;

function getTemplates(): Map<string, ResponseEntry> {
  if (!_templates) {
    try {
      const entries = loadResponses();
      _templates = new Map(entries.map((e) => [e.key, e]));
    } catch {
      // If CSV loading fails, return empty map → all functions fall back to hardcoded defaults
      _templates = new Map();
    }
  }
  return _templates;
}

/**
 * Render a template by replacing {{variable}} placeholders with actual values.
 */
function render(key: string, vars: Record<string, string | number> = {}, fallback = ""): string {
  const templates = getTemplates();
  const entry = templates.get(key);

  if (!entry) return fallback;

  // Use Chinese template by default (primary user language)
  let text = entry.templateZh;

  for (const [varName, value] of Object.entries(vars)) {
    text = text.replaceAll(`{{${varName}}}`, String(value));
  }

  return text;
}

// ============ PUBLIC API (same signatures as before) ============

export function buildPlaybackReply(state: PlaybackState): string {
  if (state.status === "playing" && state.track) {
    return render("playback.playing", {
      artist: state.track.artist,
      title: state.track.title
    }, `正在播放 ${state.track.artist} 的《${state.track.title}》。`);
  }

  if (state.status === "paused") {
    return render("playback.paused", {}, "已暂停播放。");
  }

  return render("playback.idle", {}, "当前没有正在播放的音乐。");
}

export function buildVolumeReply(state: PlaybackState): string {
  return render("volume.set", {
    volumePercent: state.volumePercent
  }, `音量已调整到 ${state.volumePercent}%。`);
}

export function buildFavoriteReply(trackTitle: string): string {
  return render("favorite.added", {
    title: trackTitle
  }, `已收藏《${trackTitle}》。`);
}

export function buildFavoriteListReply(tracks: Track[]): string {
  if (tracks.length === 0) {
    return render("favorite.list.empty", {}, "你还没有收藏任何歌曲。");
  }

  const latest = tracks.slice(0, 5).map((track) => `《${track.title}》`);
  return render("favorite.list", {
    count: tracks.length,
    latest: latest.join("、")
  }, `你已收藏 ${tracks.length} 首歌，最近包括：${latest.join("、")}。`);
}

export function buildPlaylistReply(trackTitle: string, playlistName: string): string {
  return render("playlist.added", {
    title: trackTitle,
    playlistName
  }, `已把《${trackTitle}》加入歌单"${playlistName}"。`);
}

export function buildDownloadReply(trackTitle: string, filePath: string): string {
  return render("download.done", {
    title: trackTitle,
    filePath
  }, `已下载《${trackTitle}》，保存到 ${filePath}。`);
}

export function buildDownloadStatusReply(task: DownloadTask | null): string {
  if (!task) {
    return render("download.status.empty", {}, "当前还没有下载任务。");
  }

  return render("download.status", {
    title: task.trackTitle,
    filePath: task.filePath
  }, `最近一次下载已完成：《${task.trackTitle}》，文件位于 ${task.filePath}。`);
}

export function buildDownloadListReply(tasks: DownloadTask[]): string {
  if (tasks.length === 0) {
    return render("download.list.empty", {}, "当前没有下载记录。");
  }

  const latest = tasks.slice(0, 3).map((task) => `《${task.trackTitle}》`);
  return render("download.list", {
    latest: latest.join("、")
  }, `最近下载的内容有：${latest.join("、")}。`);
}
