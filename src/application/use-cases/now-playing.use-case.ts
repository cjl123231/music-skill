import type { MusicProvider } from "../../domain/services/music-provider.js";

export class NowPlayingUseCase {
  constructor(private readonly provider: MusicProvider) {}

  execute() {
    return this.provider.getNowPlaying();
  }
}
