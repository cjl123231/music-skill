import { rmSync } from "node:fs";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { BetterSqliteBehaviorMemoryRepository } from "../../../src/infrastructure/storage/sqlite/agent-behavior-memory.repository.better-sqlite.js";
import { BetterSqlitePreferenceMemoryRepository } from "../../../src/infrastructure/storage/sqlite/agent-preference-memory.repository.better-sqlite.js";
import { createSqliteClient } from "../../../src/infrastructure/storage/sqlite/sqlite-client.js";

describe("agent memory retention", () => {
  const dbPath = "./data/test-agent-memory-retention.db";

  beforeEach(() => {
    process.env.MUSIC_AGENT_PREFERENCE_MEMORY_LIMIT = "3";
    process.env.MUSIC_AGENT_BEHAVIOR_MEMORY_LIMIT = "4";
    rmSync(dbPath, { force: true });
    rmSync(`${dbPath}-shm`, { force: true });
    rmSync(`${dbPath}-wal`, { force: true });
  });

  afterEach(() => {
    delete process.env.MUSIC_AGENT_PREFERENCE_MEMORY_LIMIT;
    delete process.env.MUSIC_AGENT_BEHAVIOR_MEMORY_LIMIT;
    rmSync(dbPath, { force: true });
    rmSync(`${dbPath}-shm`, { force: true });
    rmSync(`${dbPath}-wal`, { force: true });
  });

  it("deduplicates preference notes and trims old records", async () => {
    const client = createSqliteClient(dbPath);
    const repository = new BetterSqlitePreferenceMemoryRepository(client);

    await repository.remember("u1", "喜欢周杰伦", "positive");
    await repository.remember("u1", "喜欢安静的人声", "positive");
    await repository.remember("u1", "不喜欢太吵", "negative");
    await repository.remember("u1", "喜欢周杰伦", "positive");
    await repository.remember("u1", "喜欢钢琴", "positive");

    const records = await repository.list("u1");
    expect(records).toHaveLength(3);
    expect(records[0]?.note).toBe("喜欢钢琴");
    expect(records.filter((record) => record.note === "喜欢周杰伦")).toHaveLength(1);

    client.close();
  });

  it("trims old behavior events by retention limit", async () => {
    const client = createSqliteClient(dbPath);
    const repository = new BetterSqliteBehaviorMemoryRepository(client);

    for (let index = 1; index <= 6; index += 1) {
      await repository.record({
        userId: "u1",
        type: "agent.delegated",
        detail: `command-${index}`,
        timestamp: new Date(2026, 0, index).toISOString()
      });
    }

    const events = await repository.listRecent("u1", 10);
    expect(events).toHaveLength(4);
    expect(events[0]?.detail).toBe("command-6");
    expect(events[3]?.detail).toBe("command-3");

    client.close();
  });
});
