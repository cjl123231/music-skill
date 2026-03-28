import type { Track } from "../../../domain/entities/track.js";
import type { FavoritesRepository } from "../../../domain/repositories/favorites.repository.js";
import type { JsonFileDatabase } from "./db.js";

export class JsonFavoritesRepository implements FavoritesRepository {
  constructor(private readonly db: JsonFileDatabase) {}

  async add(userId: string, track: Track): Promise<void> {
    const state = this.db.read();
    const current = state.favorites[userId] ?? [];
    const exists = current.some((item) => item.id === track.id);
    state.favorites[userId] = exists ? current : [track, ...current];
    this.db.write(state);
  }

  async list(userId: string): Promise<Track[]> {
    const state = this.db.read();
    return state.favorites[userId] ?? [];
  }
}
