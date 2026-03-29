import type { SessionContext } from "../../domain/entities/session-context.js";
import type { SessionContextRepository } from "../../domain/repositories/session-context.repository.js";
import { nowIso } from "../../shared/utils/time.js";

export class DialogueManager {
  constructor(private readonly sessionContexts: SessionContextRepository) {}

  async getOrCreate(sessionId: string, userId: string): Promise<SessionContext> {
    const existing = await this.sessionContexts.getByUserAndSessionId(userId, sessionId);
    if (existing) {
      return existing;
    }

    return {
      sessionId,
      userId,
      currentTrack: null,
      playbackStatus: "idle",
      volumePercent: 50,
      lastSearchResults: [],
      updatedAt: nowIso()
    };
  }

  async save(context: SessionContext): Promise<void> {
    await this.sessionContexts.save({
      ...context,
      updatedAt: nowIso()
    });
  }
}
