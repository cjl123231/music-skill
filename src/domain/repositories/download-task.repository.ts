import type { DownloadTask } from "../entities/download-task.js";

export interface DownloadTaskRepository {
  save(task: DownloadTask): Promise<void>;
  listByUser(userId: string): Promise<DownloadTask[]>;
}
