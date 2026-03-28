import type { FavoritesRepository } from "../../domain/repositories/favorites.repository.js";

export class ListFavoritesUseCase {
  constructor(private readonly favoritesRepository: FavoritesRepository) {}

  execute(userId: string) {
    return this.favoritesRepository.list(userId);
  }
}
