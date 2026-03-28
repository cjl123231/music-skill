import type { MusicProvider } from "../../domain/services/music-provider.js";

export class ResumeMusicUseCase {
  constructor(private readonly provider: MusicProvider) {}

  execute() {
    return this.provider.resume();
  }
}
