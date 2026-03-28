import type { MusicProvider } from "../../domain/services/music-provider.js";

export class PreviousTrackUseCase {
  constructor(private readonly provider: MusicProvider) {}

  execute() {
    return this.provider.previous();
  }
}
