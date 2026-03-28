import type { SessionContext } from "../../../domain/entities/session-context.js";
import type { SessionContextRepository } from "../../../domain/repositories/session-context.repository.js";
import type { JsonFileDatabase } from "./db.js";

function createSessionKey(userId: string, sessionId: string): string {
  return `${userId}::${sessionId}`;
}

export class JsonSessionContextRepository implements SessionContextRepository {
  constructor(private readonly db: JsonFileDatabase) {}

  async getByUserAndSessionId(userId: string, sessionId: string): Promise<SessionContext | null> {
    const state = this.db.read();
    return state.sessionContexts[createSessionKey(userId, sessionId)] ?? null;
  }

  async save(context: SessionContext): Promise<void> {
    const state = this.db.read();
    state.sessionContexts[createSessionKey(context.userId, context.sessionId)] = context;
    this.db.write(state);
  }
}
