import { describe, expect, it } from "vitest";
import { DialogueManager } from "../../../../src/application/dialogue/dialogue-manager.js";
import { createDatabase } from "../../../../src/infrastructure/storage/sqlite/db.js";
import { JsonSessionContextRepository } from "../../../../src/infrastructure/storage/sqlite/session-context.repository.json.js";

describe("DialogueManager", () => {
  it("creates a new context when missing", async () => {
    const manager = new DialogueManager(new JsonSessionContextRepository(createDatabase("./data/test-dialogue-manager.json")));
    const context = await manager.getOrCreate("s1", "u1");

    expect(context.sessionId).toBe("s1");
    expect(context.userId).toBe("u1");
    expect(context.currentTrack).toBeNull();
  });
});
