import type { SessionContext } from "../../../domain/entities/session-context.js";
import type { SessionContextRepository } from "../../../domain/repositories/session-context.repository.js";
import type { JsonFileDatabase } from "./db.js";

export class JsonSessionContextRepository implements SessionContextRepository {
  constructor(private readonly db: JsonFileDatabase) {}

  async getBySessionId(sessionId: string): Promise<SessionContext | null> {
    const state = this.db.read();
    return state.sessionContexts[sessionId] ?? null;
  }

  async save(context: SessionContext): Promise<void> {
    const state = this.db.read();
    state.sessionContexts[context.sessionId] = context;
    this.db.write(state);
  }
}
