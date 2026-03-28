import type { DownloadTaskRepository } from "../../domain/repositories/download-task.repository.js";

export class ListDownloadsUseCase {
  constructor(private readonly downloadTasks: DownloadTaskRepository) {}

  execute(userId: string) {
    return this.downloadTasks.listByUser(userId);
  }
}
