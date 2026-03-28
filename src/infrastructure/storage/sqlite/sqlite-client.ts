import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { DatabaseSync } from "node:sqlite";

export class SqliteClient {
  readonly db: DatabaseSync;

  constructor(filePath = process.env.MUSIC_DB_PATH ?? "./data/music-skill.db") {
    const resolvedPath = resolve(filePath);
    mkdirSync(dirname(resolvedPath), { recursive: true });
    this.db = new DatabaseSync(resolvedPath);
    this.db.exec("PRAGMA journal_mode = WAL;");
    this.db.exec("PRAGMA foreign_keys = ON;");
    this.migrate();
  }

  close(): void {
    this.db.close();
  }

  private migrate(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS favorites (
        user_id TEXT NOT NULL,
        track_id TEXT NOT NULL,
        track_json TEXT NOT NULL,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (user_id, track_id)
      );

      CREATE TABLE IF NOT EXISTS playlists (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        name TEXT NOT NULL,
        UNIQUE(user_id, name)
      );

      CREATE TABLE IF NOT EXISTS playlist_tracks (
        playlist_id TEXT NOT NULL,
        track_id TEXT NOT NULL,
        track_json TEXT NOT NULL,
        position INTEGER NOT NULL,
        PRIMARY KEY (playlist_id, track_id),
        FOREIGN KEY (playlist_id) REFERENCES playlists(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS download_tasks (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        track_id TEXT NOT NULL,
        track_title TEXT NOT NULL,
        artist_name TEXT NOT NULL,
        file_path TEXT NOT NULL,
        status TEXT NOT NULL,
        created_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS session_contexts (
        session_id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        current_track_json TEXT,
        last_search_results_json TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS agent_preference_memory (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id TEXT NOT NULL,
        note TEXT NOT NULL,
        sentiment TEXT NOT NULL DEFAULT 'positive',
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS agent_behavior_events (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id TEXT NOT NULL,
        type TEXT NOT NULL,
        detail TEXT NOT NULL,
        created_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS agent_scene_memory (
        user_id TEXT PRIMARY KEY,
        scene TEXT NOT NULL,
        updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `);

    try {
      this.db.exec(`ALTER TABLE agent_preference_memory ADD COLUMN sentiment TEXT NOT NULL DEFAULT 'positive';`);
    } catch {
      // Column already exists on migrated databases.
    }
  }
}

export function createSqliteClient(filePath?: string): SqliteClient {
  return new SqliteClient(filePath);
}
