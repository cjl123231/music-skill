import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import type { DownloadTask } from "../../../domain/entities/download-task.js";
import type { Playlist } from "../../../domain/entities/playlist.js";
import type { SessionContext } from "../../../domain/entities/session-context.js";
import type { Track } from "../../../domain/entities/track.js";

export interface DatabaseState {
  sessionContexts: Record<string, SessionContext>;
  favorites: Record<string, Track[]>;
  playlists: Record<string, Playlist[]>;
  downloadTasks: Record<string, DownloadTask[]>;
  agentPreferenceMemory: Record<string, Array<{ note: string; sentiment: "positive" | "negative" }>>;
  agentBehaviorEvents: Record<string, Array<{ type: string; detail: string; timestamp: string }>>;
  agentSceneMemory: Record<string, string>;
}

const emptyState: DatabaseState = {
  sessionContexts: {},
  favorites: {},
  playlists: {},
  downloadTasks: {},
  agentPreferenceMemory: {},
  agentBehaviorEvents: {},
  agentSceneMemory: {}
};

export class JsonFileDatabase {
  constructor(private readonly filePath: string) {}

  read(): DatabaseState {
    if (!existsSync(this.filePath)) {
      return structuredClone(emptyState);
    }

    const content = readFileSync(this.filePath, "utf8");
    if (!content.trim()) {
      return structuredClone(emptyState);
    }

    return {
      ...structuredClone(emptyState),
      ...JSON.parse(content)
    } satisfies DatabaseState;
  }

  write(state: DatabaseState): void {
    mkdirSync(dirname(this.filePath), { recursive: true });
    writeFileSync(this.filePath, JSON.stringify(state, null, 2), "utf8");
  }
}

export function createDatabase(filePath = process.env.MUSIC_DB_PATH ?? "./data/music-skill.db.json"): JsonFileDatabase {
  return new JsonFileDatabase(resolve(filePath));
}
