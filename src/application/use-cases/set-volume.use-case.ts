import type { MusicProvider } from "../../domain/services/music-provider.js";
import { AppError } from "../../shared/errors/app-error.js";
import { ErrorCodes } from "../../shared/errors/error-codes.js";

export class SetVolumeUseCase {
  constructor(private readonly provider: MusicProvider) {}

  execute(percent?: number) {
    if (percent == null || Number.isNaN(percent) || percent < 0 || percent > 100) {
      throw new AppError("音量必须在 0 到 100 之间。", ErrorCodes.InvalidInput);
    }

    return this.provider.setVolume(percent);
  }
}
