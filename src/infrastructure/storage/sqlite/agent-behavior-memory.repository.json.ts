import type { BehaviorMemoryEventRecord, BehaviorMemoryRepository } from "../../../agent/memory/behavior-memory.repository.js";
import { getBehaviorMemoryLimit } from "../../../agent/memory/memory-retention.js";
import type { JsonFileDatabase } from "./db.js";

export class JsonBehaviorMemoryRepository implements BehaviorMemoryRepository {
  constructor(private readonly db: JsonFileDatabase) {}

  async record(event: BehaviorMemoryEventRecord): Promise<void> {
    const state = this.db.read();
    const current = state.agentBehaviorEvents[event.userId] ?? [];
    state.agentBehaviorEvents[event.userId] = [event, ...current].slice(0, getBehaviorMemoryLimit());
    this.db.write(state);
  }

  async listRecent(userId: string, limit = 20): Promise<BehaviorMemoryEventRecord[]> {
    const state = this.db.read();
    return (state.agentBehaviorEvents[userId] ?? []).slice(0, limit).map((event) => ({
      userId,
      type: event.type,
      detail: event.detail,
      timestamp: event.timestamp
    }));
  }
}
