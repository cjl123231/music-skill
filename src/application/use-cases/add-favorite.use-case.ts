import type { SessionContext } from "../../domain/entities/session-context.js";
import type { FavoritesRepository } from "../../domain/repositories/favorites.repository.js";
import { CurrentTrackResolver } from "./current-track-resolver.js";
import { AppError } from "../../shared/errors/app-error.js";
import { ErrorCodes } from "../../shared/errors/error-codes.js";

export class AddFavoriteUseCase {
  constructor(
    private readonly favoritesRepository: FavoritesRepository,
    private readonly currentTrackResolver: CurrentTrackResolver
  ) {}

  async execute(input: { userId: string; context: SessionContext }) {
    const track = await this.currentTrackResolver.resolve(input.context);
    if (!track) {
      throw new AppError("There is no current track to favorite.", ErrorCodes.MusicNotPlaying);
    }

    await this.favoritesRepository.add(input.userId, track);
    return track;
  }
}
