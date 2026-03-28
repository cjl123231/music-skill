import { existsSync, readdirSync, statSync } from "node:fs";
import { extname, join, resolve } from "node:path";

const supportedExtensions = new Set([".mp3", ".flac", ".wav", ".m4a", ".aac", ".ogg"]);

function countAudioFiles(root: string): number {
  const entries = readdirSync(root, { withFileTypes: true });
  let count = 0;

  for (const entry of entries) {
    const fullPath = join(root, entry.name);
    if (entry.isDirectory()) {
      count += countAudioFiles(fullPath);
      continue;
    }

    if (supportedExtensions.has(extname(entry.name).toLowerCase())) {
      count += 1;
    }
  }

  return count;
}

export function getProviderStatus() {
  const musicDir = process.env.MUSIC_LIBRARY_DIR;

  if (!musicDir) {
    return {
      connected: false,
      mode: "stub",
      label: "本地曲库未连接",
      detail: "未设置 MUSIC_LIBRARY_DIR"
    };
  }

  const resolved = resolve(musicDir);
  if (!existsSync(resolved) || !statSync(resolved).isDirectory()) {
    return {
      connected: false,
      mode: "stub",
      label: "本地曲库未连接",
      detail: `目录不可用：${resolved}`
    };
  }

  const count = countAudioFiles(resolved);
  if (count === 0) {
    return {
      connected: false,
      mode: "stub",
      label: "本地曲库未连接",
      detail: "目录中没有扫描到音频文件",
      trackCount: 0
    };
  }

  return {
    connected: true,
    mode: "local",
    label: "本地曲库已连接",
    detail: `${count} 首本地音频`,
    libraryPath: resolved,
    trackCount: count
  };
}
