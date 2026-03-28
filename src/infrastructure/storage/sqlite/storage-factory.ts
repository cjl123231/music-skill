import type { DownloadTask } from "../../../domain/entities/download-task.js";
import type { SessionContext } from "../../../domain/entities/session-context.js";
import type { Track } from "../../../domain/entities/track.js";
import type { DownloadTaskRepository } from "../../../domain/repositories/download-task.repository.js";
import type { FavoritesRepository } from "../../../domain/repositories/favorites.repository.js";
import type { PlaylistsRepository } from "../../../domain/repositories/playlists.repository.js";
import type { SessionContextRepository } from "../../../domain/repositories/session-context.repository.js";
import type { PreferenceMemoryRepository } from "../../../agent/memory/preference-memory.repository.js";
import type { BehaviorMemoryRepository } from "../../../agent/memory/behavior-memory.repository.js";
import type { SceneMemoryRepository } from "../../../agent/memory/scene-memory.repository.js";
import { BetterSqlitePreferenceMemoryRepository } from "./agent-preference-memory.repository.better-sqlite.js";
import { JsonPreferenceMemoryRepository } from "./agent-preference-memory.repository.json.js";
import { BetterSqliteBehaviorMemoryRepository } from "./agent-behavior-memory.repository.better-sqlite.js";
import { JsonBehaviorMemoryRepository } from "./agent-behavior-memory.repository.json.js";
import { BetterSqliteSceneMemoryRepository } from "./agent-scene-memory.repository.better-sqlite.js";
import { JsonSceneMemoryRepository } from "./agent-scene-memory.repository.json.js";
import { BetterSqliteDownloadTaskRepository } from "./download-task.repository.better-sqlite.js";
import { JsonDownloadTaskRepository } from "./download-task.repository.json.js";
import { BetterSqliteFavoritesRepository } from "./favorites.repository.better-sqlite.js";
import { JsonFavoritesRepository } from "./favorites.repository.json.js";
import { JsonPlaylistsRepository } from "./playlists.repository.json.js";
import { BetterSqlitePlaylistsRepository } from "./playlists.repository.better-sqlite.js";
import { createDatabase } from "./db.js";
import { BetterSqliteSessionContextRepository } from "./session-context.repository.better-sqlite.js";
import { JsonSessionContextRepository } from "./session-context.repository.json.js";
import { createSqliteClient } from "./sqlite-client.js";

export interface StorageRepositories {
  sessionContextRepository: SessionContextRepository;
  downloadTaskRepository: DownloadTaskRepository;
  favoritesRepository: FavoritesRepository;
  playlistsRepository: PlaylistsRepository;
}

export interface AgentMemoryRepositories {
  preferenceMemoryRepository: PreferenceMemoryRepository;
  behaviorMemoryRepository: BehaviorMemoryRepository;
  sceneMemoryRepository: SceneMemoryRepository;
}

export interface StorageSnapshot {
  latestSession: SessionContext | null;
  latestDownloads: DownloadTask[];
}

export function readFavoriteTracks(userId: string): Track[] {
  const driver = (process.env.MUSIC_STORAGE_DRIVER ?? "sqlite").toLowerCase();

  if (driver === "sqlite") {
    const client = createSqliteClient();
    const rows = client.db
      .prepare("SELECT track_json FROM favorites WHERE user_id = ? ORDER BY created_at DESC")
      .all(userId) as Array<{ track_json: string }>;

    return rows.map((row) => JSON.parse(row.track_json) as Track);
  }

  const database = createDatabase();
  const state = database.read();
  return state.favorites[userId] ?? [];
}

export function createStorageRepositories(): StorageRepositories {
  const driver = (process.env.MUSIC_STORAGE_DRIVER ?? "sqlite").toLowerCase();

  if (driver === "sqlite") {
    const client = createSqliteClient();
    return {
      sessionContextRepository: new BetterSqliteSessionContextRepository(client),
      downloadTaskRepository: new BetterSqliteDownloadTaskRepository(client),
      favoritesRepository: new BetterSqliteFavoritesRepository(client),
      playlistsRepository: new BetterSqlitePlaylistsRepository(client)
    };
  }

  const database = createDatabase();
  return {
    sessionContextRepository: new JsonSessionContextRepository(database),
    downloadTaskRepository: new JsonDownloadTaskRepository(database),
    favoritesRepository: new JsonFavoritesRepository(database),
    playlistsRepository: new JsonPlaylistsRepository(database)
  };
}

export function createAgentMemoryRepositories(): AgentMemoryRepositories {
  const driver = (process.env.MUSIC_STORAGE_DRIVER ?? "sqlite").toLowerCase();

  if (driver === "sqlite") {
    const client = createSqliteClient();
    return {
      preferenceMemoryRepository: new BetterSqlitePreferenceMemoryRepository(client),
      behaviorMemoryRepository: new BetterSqliteBehaviorMemoryRepository(client),
      sceneMemoryRepository: new BetterSqliteSceneMemoryRepository(client)
    };
  }

  const database = createDatabase();
  return {
    preferenceMemoryRepository: new JsonPreferenceMemoryRepository(database),
    behaviorMemoryRepository: new JsonBehaviorMemoryRepository(database),
    sceneMemoryRepository: new JsonSceneMemoryRepository(database)
  };
}

export function readStorageSnapshot(): StorageSnapshot {
  const driver = (process.env.MUSIC_STORAGE_DRIVER ?? "sqlite").toLowerCase();

  if (driver === "sqlite") {
    const client = createSqliteClient();
    const latestSessionRow = client.db
      .prepare(
        `SELECT session_id, user_id, current_track_json, last_search_results_json, updated_at
         FROM session_contexts ORDER BY updated_at DESC LIMIT 1`
      )
      .get() as
      | {
          session_id: string;
          user_id: string;
          current_track_json: string | null;
          last_search_results_json: string;
          updated_at: string;
        }
      | undefined;
    const latestDownloadsRows = client.db
      .prepare(
        `SELECT id, user_id, track_id, track_title, artist_name, file_path, status, created_at
         FROM download_tasks ORDER BY created_at DESC LIMIT 3`
      )
      .all() as Array<{
      id: string;
      user_id: string;
      track_id: string;
      track_title: string;
      artist_name: string;
      file_path: string;
      status: "completed";
      created_at: string;
    }>;

    return {
      latestSession: latestSessionRow
        ? {
            sessionId: latestSessionRow.session_id,
            userId: latestSessionRow.user_id,
            currentTrack: latestSessionRow.current_track_json ? JSON.parse(latestSessionRow.current_track_json) : null,
            lastSearchResults: JSON.parse(latestSessionRow.last_search_results_json),
            updatedAt: latestSessionRow.updated_at
          }
        : null,
      latestDownloads: latestDownloadsRows.map((row) => ({
        id: row.id,
        userId: row.user_id,
        trackId: row.track_id,
        trackTitle: row.track_title,
        artistName: row.artist_name,
        filePath: row.file_path,
        status: row.status,
        createdAt: row.created_at
      }))
    };
  }

  const database = createDatabase();
  const state = database.read();
  const latestSession = Object.values(state.sessionContexts)
    .sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1))[0] ?? null;
  const latestDownloads = Object.values(state.downloadTasks).flat().slice(-3).reverse();

  return {
    latestSession,
    latestDownloads
  };
}
