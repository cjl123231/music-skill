import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { DatabaseSync } from "node:sqlite";

const sqliteClients = new Map<string, SqliteClient>();

export class SqliteClient {
  readonly db: DatabaseSync;
  readonly filePath: string;

  constructor(filePath = process.env.MUSIC_DB_PATH ?? "./data/music-skill.db") {
    const resolvedPath = resolve(filePath);
    this.filePath = resolvedPath;
    mkdirSync(dirname(resolvedPath), { recursive: true });
    this.db = new DatabaseSync(resolvedPath);
    this.db.exec("PRAGMA journal_mode = WAL;");
    this.db.exec("PRAGMA foreign_keys = ON;");
    this.migrate();
  }

  close(): void {
    this.db.close();
    sqliteClients.delete(this.filePath);
  }

  private migrate(): void {
    const sessionContextsColumns = this.db
      .prepare("PRAGMA table_info(session_contexts)")
      .all() as Array<{ name: string; pk: number }>;
    const requiresSessionContextMigration =
      sessionContextsColumns.length > 0 &&
      !sessionContextsColumns.some((column) => column.name === "user_id" && column.pk > 0);

    if (requiresSessionContextMigration) {
      this.db.exec(`
        ALTER TABLE session_contexts RENAME TO session_contexts_legacy;

        CREATE TABLE session_contexts (
          session_id TEXT NOT NULL,
          user_id TEXT NOT NULL,
          current_track_json TEXT,
          last_search_results_json TEXT NOT NULL,
          updated_at TEXT NOT NULL,
          PRIMARY KEY (user_id, session_id)
        );

        INSERT INTO session_contexts (
          session_id, user_id, current_track_json, last_search_results_json, updated_at
        )
        SELECT session_id, user_id, current_track_json, last_search_results_json, updated_at
        FROM session_contexts_legacy;

        DROP TABLE session_contexts_legacy;
      `);
    }

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
        session_id TEXT NOT NULL,
        user_id TEXT NOT NULL,
        current_track_json TEXT,
        last_search_results_json TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        PRIMARY KEY (user_id, session_id)
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
  const resolvedPath = resolve(filePath ?? process.env.MUSIC_DB_PATH ?? "./data/music-skill.db");
  const existing = sqliteClients.get(resolvedPath);
  if (existing) {
    return existing;
  }

  const client = new SqliteClient(resolvedPath);
  sqliteClients.set(resolvedPath, client);
  return client;
}
