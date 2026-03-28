import type { DownloadTask } from "../../../domain/entities/download-task.js";
import type { DownloadTaskRepository } from "../../../domain/repositories/download-task.repository.js";
import type { JsonFileDatabase } from "./db.js";

export class JsonDownloadTaskRepository implements DownloadTaskRepository {
  constructor(private readonly db: JsonFileDatabase) {}

  async save(task: DownloadTask): Promise<void> {
    const state = this.db.read();
    const current = state.downloadTasks[task.userId] ?? [];
    state.downloadTasks[task.userId] = [...current, task];
    this.db.write(state);
  }

  async listByUser(userId: string): Promise<DownloadTask[]> {
    const state = this.db.read();
    return state.downloadTasks[userId] ?? [];
  }
}
