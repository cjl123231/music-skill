import type { MusicProvider } from "../../domain/services/music-provider.js";

export class NextTrackUseCase {
  constructor(private readonly provider: MusicProvider) {}

  execute() {
    return this.provider.next();
  }
}
