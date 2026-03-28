import type { PreferenceSentiment } from "../planning/agent-plan.js";

export interface PreferenceRecord {
  note: string;
  sentiment: PreferenceSentiment;
}

export interface PreferenceMemoryRepository {
  list(userId: string): Promise<PreferenceRecord[]>;
  remember(userId: string, note: string, sentiment: PreferenceSentiment): Promise<void>;
}
