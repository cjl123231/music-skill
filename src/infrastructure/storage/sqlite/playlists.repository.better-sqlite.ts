import type { Playlist } from "../../../domain/entities/playlist.js";
import type { Track } from "../../../domain/entities/track.js";
import type { PlaylistsRepository } from "../../../domain/repositories/playlists.repository.js";
import { createId } from "../../../shared/utils/id.js";
import type { SqliteClient } from "./sqlite-client.js";

export class BetterSqlitePlaylistsRepository implements PlaylistsRepository {
  constructor(private readonly client: SqliteClient) {}

  async getByName(userId: string, name: string): Promise<Playlist | null> {
    const playlist = this.client.db
      .prepare("SELECT id, user_id, name FROM playlists WHERE user_id = ? AND name = ?")
      .get(userId, name) as { id: string; user_id: string; name: string } | undefined;

    if (!playlist) {
      return null;
    }

    const tracks = this.client.db
      .prepare("SELECT track_json FROM playlist_tracks WHERE playlist_id = ? ORDER BY position ASC")
      .all(playlist.id) as Array<{ track_json: string }>;

    return {
      id: playlist.id,
      userId: playlist.user_id,
      name: playlist.name,
      tracks: tracks.map((row) => JSON.parse(row.track_json) as Track)
    };
  }

  async save(playlist: Playlist): Promise<void> {
    try {
      this.client.db.exec("BEGIN");
      this.client.db
        .prepare(
          `INSERT INTO playlists (id, user_id, name)
           VALUES (?, ?, ?)
           ON CONFLICT(id) DO UPDATE SET user_id = excluded.user_id, name = excluded.name`
        )
        .run(playlist.id, playlist.userId, playlist.name);

      this.client.db.prepare("DELETE FROM playlist_tracks WHERE playlist_id = ?").run(playlist.id);

      const insertTrack = this.client.db.prepare(
        `INSERT INTO playlist_tracks (playlist_id, track_id, track_json, position)
         VALUES (?, ?, ?, ?)`
      );

      playlist.tracks.forEach((track, index) => {
        insertTrack.run(playlist.id, track.id, JSON.stringify(track), index);
      });

      this.client.db.exec("COMMIT");
    } catch (error) {
      this.client.db.exec("ROLLBACK");
      throw error;
    }
  }

  async addTrack(userId: string, playlistName: string, track: Track): Promise<Playlist> {
    const existing = await this.getByName(userId, playlistName);
    const playlist =
      existing ??
      ({
        id: createId("playlist"),
        userId,
        name: playlistName,
        tracks: []
      } satisfies Playlist);

    const alreadyExists = playlist.tracks.some((item) => item.id === track.id);
    const nextPlaylist: Playlist = {
      ...playlist,
      tracks: alreadyExists ? playlist.tracks : [...playlist.tracks, track]
    };

    await this.save(nextPlaylist);
    return nextPlaylist;
  }
}
