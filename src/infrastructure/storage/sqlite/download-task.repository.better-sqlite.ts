import type { DownloadTask } from "../../../domain/entities/download-task.js";
import type { DownloadTaskRepository } from "../../../domain/repositories/download-task.repository.js";
import type { SqliteClient } from "./sqlite-client.js";

export class BetterSqliteDownloadTaskRepository implements DownloadTaskRepository {
  constructor(private readonly client: SqliteClient) {}

  async save(task: DownloadTask): Promise<void> {
    this.client.db
      .prepare(
        `INSERT INTO download_tasks (
          id, user_id, track_id, track_title, artist_name, file_path, status, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        task.id,
        task.userId,
        task.trackId,
        task.trackTitle,
        task.artistName,
        task.filePath,
        task.status,
        task.createdAt
      );
  }

  async listByUser(userId: string): Promise<DownloadTask[]> {
    const rows = this.client.db
      .prepare(
        `SELECT id, user_id, track_id, track_title, artist_name, file_path, status, created_at
         FROM download_tasks WHERE user_id = ? ORDER BY created_at DESC`
      )
      .all(userId) as Array<{
      id: string;
      user_id: string;
      track_id: string;
      track_title: string;
      artist_name: string;
      file_path: string;
      status: "completed";
      created_at: string;
    }>;

    return rows.map((row) => ({
      id: row.id,
      userId: row.user_id,
      trackId: row.track_id,
      trackTitle: row.track_title,
      artistName: row.artist_name,
      filePath: row.file_path,
      status: row.status,
      createdAt: row.created_at
    }));
  }
}
