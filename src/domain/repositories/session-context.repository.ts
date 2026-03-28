import type { SessionContext } from "../entities/session-context.js";

export interface SessionContextRepository {
  getByUserAndSessionId(userId: string, sessionId: string): Promise<SessionContext | null>;
  save(context: SessionContext): Promise<void>;
}
