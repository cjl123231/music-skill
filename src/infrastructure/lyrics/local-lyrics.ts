import { existsSync, readFileSync } from "node:fs";
import { dirname, join, parse } from "node:path";

export interface LocalLyricsLine {
  timestampMs?: number;
  text: string;
}

export interface LocalLyricsPayload {
  found: boolean;
  sourcePath?: string;
  format?: "lrc" | "txt";
  lines: LocalLyricsLine[];
}

const TIMESTAMP_PATTERN = /\[(\d{1,2}):(\d{2})(?:\.(\d{1,3}))?\]/g;

function normalizeMilliseconds(raw?: string): number {
  if (!raw) return 0;
  if (raw.length === 3) return Number(raw);
  if (raw.length === 2) return Number(raw) * 10;
  return Number(raw) * 100;
}

function parseLrc(content: string): LocalLyricsLine[] {
  const lines: LocalLyricsLine[] = [];

  content
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .forEach((line) => {
      const timestamps = [...line.matchAll(TIMESTAMP_PATTERN)];
      const text = line.replace(TIMESTAMP_PATTERN, "").trim();

      if (!text) return;

      if (!timestamps.length) {
        lines.push({ text });
        return;
      }

      timestamps.forEach((match) => {
        const minutes = Number(match[1] ?? 0);
        const seconds = Number(match[2] ?? 0);
        const milliseconds = normalizeMilliseconds(match[3]);
        lines.push({
          timestampMs: minutes * 60_000 + seconds * 1_000 + milliseconds,
          text
        });
      });
    });

  return lines.sort((left, right) => (left.timestampMs ?? 0) - (right.timestampMs ?? 0));
}

function parsePlainText(content: string): LocalLyricsLine[] {
  return content
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((text) => ({ text }));
}

export function readLocalLyrics(trackFilePath?: string): LocalLyricsPayload {
  if (!trackFilePath) {
    return { found: false, lines: [] };
  }

  const file = parse(trackFilePath);
  const candidates = [
    { path: join(dirname(trackFilePath), `${file.name}.lrc`), format: "lrc" as const },
    { path: join(dirname(trackFilePath), `${file.name}.txt`), format: "txt" as const }
  ];

  for (const candidate of candidates) {
    if (!existsSync(candidate.path)) {
      continue;
    }

    const raw = readFileSync(candidate.path, "utf8");
    const lines = candidate.format === "lrc" ? parseLrc(raw) : parsePlainText(raw);

    return {
      found: true,
      sourcePath: candidate.path,
      format: candidate.format,
      lines
    };
  }

  return { found: false, lines: [] };
}
