import type { SessionContext } from "../../domain/entities/session-context.js";
import type { MusicProvider } from "../../domain/services/music-provider.js";
import { AppError } from "../../shared/errors/app-error.js";
import { ErrorCodes } from "../../shared/errors/error-codes.js";

export class PlayMusicUseCase {
  constructor(private readonly provider: MusicProvider) {}

  async execute(input: { keyword?: string; artistName?: string; context: SessionContext }) {
    if (!input.keyword) {
      throw new AppError("缺少要播放的内容。", ErrorCodes.InvalidInput);
    }

    const tracks = await this.provider.searchTracks({
      keyword: input.keyword,
      artistName: input.artistName
    });

    const track = tracks[0];
    if (!track) {
      throw new AppError("没有找到匹配的歌曲。", ErrorCodes.MusicNotFound);
    }

    const playback = await this.provider.play(track);
    return {
      playback,
      context: {
        ...input.context,
        currentTrack: track,
        lastSearchResults: tracks
      }
    };
  }
}
