import type { Playlist } from "../entities/playlist.js";
import type { Track } from "../entities/track.js";

export interface PlaylistsRepository {
  getByName(userId: string, name: string): Promise<Playlist | null>;
  save(playlist: Playlist): Promise<void>;
  addTrack(userId: string, playlistName: string, track: Track): Promise<Playlist>;
}
