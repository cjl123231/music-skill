import type { SessionContext } from "../../domain/entities/session-context.js";
import type { Track } from "../../domain/entities/track.js";
import type { FavoritesRepository } from "../../domain/repositories/favorites.repository.js";
import type { MusicProvider } from "../../domain/services/music-provider.js";
import { AppError } from "../../shared/errors/app-error.js";
import { ErrorCodes } from "../../shared/errors/error-codes.js";

function includesIgnoreCase(value: string | undefined, query: string | undefined): boolean {
  if (!query) return true;
  if (!value) return false;
  return value.toLocaleLowerCase().includes(query.toLocaleLowerCase());
}

function findFavoriteTrack(tracks: Track[], keyword?: string, artistName?: string): Track | undefined {
  if (!keyword && !artistName) {
    return tracks[0];
  }

  return tracks.find((track) => {
    const titleMatch = includesIgnoreCase(track.title, keyword);
    const artistMatch = includesIgnoreCase(track.artist, artistName);
    return titleMatch && artistMatch;
  });
}

export class PlayFavoriteMusicUseCase {
  constructor(
    private readonly favoritesRepository: FavoritesRepository,
    private readonly provider: MusicProvider
  ) {}

  async execute(input: {
    userId: string;
    keyword?: string;
    artistName?: string;
    context: SessionContext;
  }) {
    const favorites = await this.favoritesRepository.list(input.userId);
    if (favorites.length === 0) {
      throw new AppError("你还没有收藏任何歌曲。", ErrorCodes.MusicNotFound);
    }

    const track = findFavoriteTrack(favorites, input.keyword, input.artistName);
    if (!track) {
      throw new AppError("在收藏中没有找到匹配的歌曲。", ErrorCodes.MusicNotFound);
    }

    const playback = await this.provider.play(track);
    return {
      playback,
      context: {
        ...input.context,
        currentTrack: track,
        lastSearchResults: favorites
      }
    };
  }
}
