import type { SessionContext } from "../../domain/entities/session-context.js";
import type { Track } from "../../domain/entities/track.js";
import type { MusicProvider } from "../../domain/services/music-provider.js";

export class CurrentTrackResolver {
  constructor(private readonly provider: MusicProvider) {}

  async resolve(context: SessionContext): Promise<Track | null> {
    if (context.currentTrack) {
      return context.currentTrack;
    }

    const playback = await this.provider.getNowPlaying();
    return playback.track;
  }
}
