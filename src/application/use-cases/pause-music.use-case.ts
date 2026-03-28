import type { MusicProvider } from "../../domain/services/music-provider.js";

export class PauseMusicUseCase {
  constructor(private readonly provider: MusicProvider) {}

  execute() {
    return this.provider.pause();
  }
}
