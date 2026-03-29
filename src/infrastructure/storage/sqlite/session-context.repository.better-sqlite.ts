import type { SessionContext } from "../../../domain/entities/session-context.js";
import type { SessionContextRepository } from "../../../domain/repositories/session-context.repository.js";
import type { SqliteClient } from "./sqlite-client.js";

export class BetterSqliteSessionContextRepository implements SessionContextRepository {
  constructor(private readonly client: SqliteClient) {}

  async getByUserAndSessionId(userId: string, sessionId: string): Promise<SessionContext | null> {
    const row = this.client.db
      .prepare(
        `SELECT session_id, user_id, current_track_json, last_search_results_json, updated_at
         , playback_status, volume_percent
         FROM session_contexts WHERE user_id = ? AND session_id = ?`
      )
      .get(userId, sessionId) as
      | {
          session_id: string;
          user_id: string;
          current_track_json: string | null;
          playback_status: "idle" | "playing" | "paused" | null;
          volume_percent: number | null;
          last_search_results_json: string;
          updated_at: string;
        }
      | undefined;

    if (!row) {
      return null;
    }

    return {
      sessionId: row.session_id,
      userId: row.user_id,
      currentTrack: row.current_track_json ? JSON.parse(row.current_track_json) : null,
      playbackStatus: row.playback_status ?? "idle",
      volumePercent: row.volume_percent ?? 50,
      lastSearchResults: JSON.parse(row.last_search_results_json),
      updatedAt: row.updated_at
    };
  }

  async save(context: SessionContext): Promise<void> {
    this.client.db
      .prepare(
        `INSERT INTO session_contexts (
          session_id, user_id, current_track_json, playback_status, volume_percent, last_search_results_json, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(user_id, session_id) DO UPDATE SET
          current_track_json = excluded.current_track_json,
          playback_status = excluded.playback_status,
          volume_percent = excluded.volume_percent,
          last_search_results_json = excluded.last_search_results_json,
          updated_at = excluded.updated_at`
      )
      .run(
        context.sessionId,
        context.userId,
        context.currentTrack ? JSON.stringify(context.currentTrack) : null,
        context.playbackStatus ?? "idle",
        context.volumePercent ?? 50,
        JSON.stringify(context.lastSearchResults),
        context.updatedAt
      );
  }
}
