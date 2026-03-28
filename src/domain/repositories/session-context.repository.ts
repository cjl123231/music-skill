import type { SessionContext } from "../entities/session-context.js";

export interface SessionContextRepository {
  getBySessionId(sessionId: string): Promise<SessionContext | null>;
  save(context: SessionContext): Promise<void>;
}
