import type { PreferenceSentiment } from "../planning/agent-plan.js";
import type { PreferenceMemoryRepository, PreferenceRecord } from "./preference-memory.repository.js";

export interface PreferenceMemoryService {
  list(userId: string): Promise<PreferenceRecord[]>;
  listPositive(userId: string): Promise<string[]>;
  listNegative(userId: string): Promise<string[]>;
  remember(userId: string, note: string, sentiment: PreferenceSentiment): Promise<void>;
}

export class PreferenceMemoryServiceImpl implements PreferenceMemoryService {
  constructor(private readonly repository: PreferenceMemoryRepository) {}

  list(userId: string): Promise<PreferenceRecord[]> {
    return this.repository.list(userId);
  }

  async listPositive(userId: string): Promise<string[]> {
    const records = await this.repository.list(userId);
    return records.filter((r) => r.sentiment === "positive").map((r) => r.note);
  }

  async listNegative(userId: string): Promise<string[]> {
    const records = await this.repository.list(userId);
    return records.filter((r) => r.sentiment === "negative").map((r) => r.note);
  }

  remember(userId: string, note: string, sentiment: PreferenceSentiment): Promise<void> {
    return this.repository.remember(userId, note, sentiment);
  }
}
