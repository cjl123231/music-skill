import type { SessionContextRepository } from "../../domain/repositories/session-context.repository.js";
import type { PreferenceRecord } from "../memory/preference-memory.repository.js";
import type { AgentContext } from "../core/agent-context.js";

const CONTEXT_NOTE_LIMIT = 3;

function summarizePreferences(records: PreferenceRecord[]) {
  const positive = records.filter((record) => record.sentiment === "positive");
  const negative = records.filter((record) => record.sentiment === "negative");

  return {
    positiveCount: positive.length,
    negativeCount: negative.length,
    recentPositiveNotes: positive.slice(0, CONTEXT_NOTE_LIMIT).map((record) => record.note),
    recentNegativeNotes: negative.slice(0, CONTEXT_NOTE_LIMIT).map((record) => record.note)
  };
}

export class ContextManager {
  constructor(private readonly sessionContextRepository: SessionContextRepository) {}

  async load(userId: string, sessionId: string, preferenceRecords: PreferenceRecord[]): Promise<AgentContext> {
    const session = await this.sessionContextRepository.getByUserAndSessionId(userId, sessionId);

    return {
      userId,
      sessionId,
      currentTrackTitle: session?.currentTrack?.title,
      recentIntent: undefined,
      preferences: summarizePreferences(preferenceRecords),
      activeScene: undefined
    };
  }
}
