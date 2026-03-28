import type { Playlist } from "../../../domain/entities/playlist.js";
import type { Track } from "../../../domain/entities/track.js";
import type { PlaylistsRepository } from "../../../domain/repositories/playlists.repository.js";
import { createId } from "../../../shared/utils/id.js";
import type { JsonFileDatabase } from "./db.js";

export class JsonPlaylistsRepository implements PlaylistsRepository {
  constructor(private readonly db: JsonFileDatabase) {}

  async getByName(userId: string, name: string): Promise<Playlist | null> {
    const state = this.db.read();
    const playlists = state.playlists[userId] ?? [];
    return playlists.find((playlist) => playlist.name === name) ?? null;
  }

  async save(playlist: Playlist): Promise<void> {
    const state = this.db.read();
    const playlists = state.playlists[playlist.userId] ?? [];
    const next = playlists.filter((item) => item.id !== playlist.id);
    next.push(playlist);
    state.playlists[playlist.userId] = next;
    this.db.write(state);
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
