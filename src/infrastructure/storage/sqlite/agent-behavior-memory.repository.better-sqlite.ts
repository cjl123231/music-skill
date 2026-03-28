import type { BehaviorMemoryEventRecord, BehaviorMemoryRepository } from "../../../agent/memory/behavior-memory.repository.js";
import { getBehaviorMemoryLimit } from "../../../agent/memory/memory-retention.js";
import type { SqliteClient } from "./sqlite-client.js";

export class BetterSqliteBehaviorMemoryRepository implements BehaviorMemoryRepository {
  constructor(private readonly client: SqliteClient) {}

  async record(event: BehaviorMemoryEventRecord): Promise<void> {
    const maxRecords = getBehaviorMemoryLimit();
    this.client.db
      .prepare(
        `INSERT INTO agent_behavior_events (user_id, type, detail, created_at)
         VALUES (?, ?, ?, ?)`
      )
      .run(event.userId, event.type, event.detail, event.timestamp);

    this.client.db
      .prepare(
        `DELETE FROM agent_behavior_events
         WHERE user_id = ?
           AND id NOT IN (
             SELECT id
             FROM agent_behavior_events
             WHERE user_id = ?
             ORDER BY id DESC
             LIMIT ?
           )`
      )
      .run(event.userId, event.userId, maxRecords);
  }

  async listRecent(userId: string, limit = 20): Promise<BehaviorMemoryEventRecord[]> {
    const rows = this.client.db
      .prepare(
        `SELECT user_id, type, detail, created_at
         FROM agent_behavior_events
         WHERE user_id = ?
         ORDER BY id DESC
         LIMIT ?`
      )
      .all(userId, limit) as Array<{
      user_id: string;
      type: string;
      detail: string;
      created_at: string;
    }>;

    return rows.map((row) => ({
      userId: row.user_id,
      type: row.type,
      detail: row.detail,
      timestamp: row.created_at
    }));
  }
}
