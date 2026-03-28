import type { SceneMemoryRepository } from "../../../agent/memory/scene-memory.repository.js";
import type { SqliteClient } from "./sqlite-client.js";

export class BetterSqliteSceneMemoryRepository implements SceneMemoryRepository {
  constructor(private readonly client: SqliteClient) {}

  async getActiveScene(userId: string): Promise<string | undefined> {
    const row = this.client.db
      .prepare("SELECT scene FROM agent_scene_memory WHERE user_id = ?")
      .get(userId) as { scene: string } | undefined;
    return row?.scene;
  }

  async setActiveScene(userId: string, scene: string): Promise<void> {
    this.client.db
      .prepare(
        `INSERT INTO agent_scene_memory (user_id, scene, updated_at)
         VALUES (?, ?, CURRENT_TIMESTAMP)
         ON CONFLICT(user_id) DO UPDATE SET scene = excluded.scene, updated_at = CURRENT_TIMESTAMP`
      )
      .run(userId, scene);
  }
}
