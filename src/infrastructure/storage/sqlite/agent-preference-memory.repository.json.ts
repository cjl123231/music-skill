import type { JsonFileDatabase } from "./db.js";
import type { PreferenceMemoryRepository, PreferenceRecord } from "../../../agent/memory/preference-memory.repository.js";
import type { PreferenceSentiment } from "../../../agent/planning/agent-plan.js";
import { getPreferenceMemoryLimit } from "../../../agent/memory/memory-retention.js";

export class JsonPreferenceMemoryRepository implements PreferenceMemoryRepository {
  constructor(private readonly db: JsonFileDatabase) {}

  async list(userId: string): Promise<PreferenceRecord[]> {
    const state = this.db.read();
    return state.agentPreferenceMemory[userId] ?? [];
  }

  async remember(userId: string, note: string, sentiment: PreferenceSentiment): Promise<void> {
    const state = this.db.read();
    const current = state.agentPreferenceMemory[userId] ?? [];
    const deduped = current.filter((record) => !(record.note === note && record.sentiment === sentiment));
    state.agentPreferenceMemory[userId] = [{ note, sentiment }, ...deduped].slice(0, getPreferenceMemoryLimit());
    this.db.write(state);
  }
}
