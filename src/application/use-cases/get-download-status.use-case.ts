import type { DownloadTaskRepository } from "../../domain/repositories/download-task.repository.js";

export class GetDownloadStatusUseCase {
  constructor(private readonly downloadTasks: DownloadTaskRepository) {}

  async execute(userId: string) {
    const tasks = await this.downloadTasks.listByUser(userId);
    return tasks.at(-1) ?? null;
  }
}
