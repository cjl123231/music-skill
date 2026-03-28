import type { SessionContext } from "../../domain/entities/session-context.js";
import type { DownloadTaskRepository } from "../../domain/repositories/download-task.repository.js";
import type { Downloader } from "../../domain/services/downloader.js";
import { CurrentTrackResolver } from "./current-track-resolver.js";
import { AppError } from "../../shared/errors/app-error.js";
import { ErrorCodes } from "../../shared/errors/error-codes.js";

export class DownloadTrackUseCase {
  constructor(
    private readonly downloader: Downloader,
    private readonly downloadTasks: DownloadTaskRepository,
    private readonly currentTrackResolver: CurrentTrackResolver
  ) {}

  async execute(input: { userId: string; context: SessionContext }) {
    const track = await this.currentTrackResolver.resolve(input.context);
    if (!track) {
      throw new AppError("There is no current track to download.", ErrorCodes.MusicNotPlaying);
    }

    const task = await this.downloader.downloadTrack({
      userId: input.userId,
      track
    });

    await this.downloadTasks.save(task);
    return task;
  }
}
