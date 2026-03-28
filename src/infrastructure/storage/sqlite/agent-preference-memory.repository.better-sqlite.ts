import type { PreferenceMemoryRepository, PreferenceRecord } from "../../../agent/memory/preference-memory.repository.js";
import type { PreferenceSentiment } from "../../../agent/planning/agent-plan.js";
import { getPreferenceMemoryLimit } from "../../../agent/memory/memory-retention.js";
import type { SqliteClient } from "./sqlite-client.js";

export class BetterSqlitePreferenceMemoryRepository implements PreferenceMemoryRepository {
  constructor(private readonly client: SqliteClient) {}

  async list(userId: string): Promise<PreferenceRecord[]> {
    const limit = getPreferenceMemoryLimit();
    const rows = this.client.db
      .prepare(
        `SELECT note, sentiment
         FROM agent_preference_memory
         WHERE user_id = ?
         ORDER BY id DESC
         LIMIT ?`
      )
      .all(userId, limit) as Array<{ note: string; sentiment: PreferenceSentiment }>;

    return rows.map((row) => ({
      note: row.note,
      sentiment: row.sentiment === "negative" ? "negative" : "positive"
    }));
  }

  async remember(userId: string, note: string, sentiment: PreferenceSentiment): Promise<void> {
    const limit = getPreferenceMemoryLimit();
    this.client.db
      .prepare(
        `DELETE FROM agent_preference_memory
         WHERE user_id = ?
           AND note = ?
           AND sentiment = ?`
      )
      .run(userId, note, sentiment);

    this.client.db
      .prepare("INSERT INTO agent_preference_memory (user_id, note, sentiment) VALUES (?, ?, ?)")
      .run(userId, note, sentiment);

    this.client.db
      .prepare(
        `DELETE FROM agent_preference_memory
         WHERE user_id = ?
           AND id NOT IN (
             SELECT id
             FROM agent_preference_memory
             WHERE user_id = ?
             ORDER BY id DESC
             LIMIT ?
           )`
      )
      .run(userId, userId, limit);
  }
}
