import type { Track } from "../entities/track.js";

export interface FavoritesRepository {
  add(userId: string, track: Track): Promise<void>;
  list(userId: string): Promise<Track[]>;
}
