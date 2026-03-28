import type { Track } from "../../../domain/entities/track.js";
import type { FavoritesRepository } from "../../../domain/repositories/favorites.repository.js";
import type { SqliteClient } from "./sqlite-client.js";

export class BetterSqliteFavoritesRepository implements FavoritesRepository {
  constructor(private readonly client: SqliteClient) {}

  async add(userId: string, track: Track): Promise<void> {
    this.client.db
      .prepare(
        `INSERT INTO favorites (user_id, track_id, track_json)
         VALUES (?, ?, ?)
         ON CONFLICT(user_id, track_id) DO UPDATE SET track_json = excluded.track_json`
      )
      .run(userId, track.id, JSON.stringify(track));
  }

  async list(userId: string): Promise<Track[]> {
    const rows = this.client.db
      .prepare("SELECT track_json FROM favorites WHERE user_id = ? ORDER BY created_at DESC")
      .all(userId) as Array<{ track_json: string }>;

    return rows.map((row) => JSON.parse(row.track_json) as Track);
  }
}
