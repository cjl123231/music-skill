import type { SessionContext } from "../../domain/entities/session-context.js";
import type { PlaylistsRepository } from "../../domain/repositories/playlists.repository.js";
import { CurrentTrackResolver } from "./current-track-resolver.js";
import { AppError } from "../../shared/errors/app-error.js";
import { ErrorCodes } from "../../shared/errors/error-codes.js";

export class AddTrackToPlaylistUseCase {
  constructor(
    private readonly playlistsRepository: PlaylistsRepository,
    private readonly currentTrackResolver: CurrentTrackResolver
  ) {}

  async execute(input: { userId: string; playlistName?: string; context: SessionContext }) {
    const track = await this.currentTrackResolver.resolve(input.context);
    if (!track) {
      throw new AppError("There is no current track to add.", ErrorCodes.MusicNotPlaying);
    }

    if (!input.playlistName) {
      throw new AppError("Playlist name is required.", ErrorCodes.InvalidInput);
    }

    return this.playlistsRepository.addTrack(input.userId, input.playlistName, track);
  }
}
