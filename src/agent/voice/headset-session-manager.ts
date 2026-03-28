export interface VoiceAgentSession {
  sessionId: string;
  userId: string;
  source: "headset_voice";
  wakeWordEnabled: boolean;
  isListening: boolean;
  lastTranscript?: string;
  lastIntent?: string;
  activeScene?: string;
}

export class HeadsetSessionManager {
  private readonly sessions = new Map<string, VoiceAgentSession>();

  getOrCreate(userId: string, sessionId: string): VoiceAgentSession {
    const key = `${userId}:${sessionId}`;
    const existing = this.sessions.get(key);
    if (existing) {
      return existing;
    }

    const created: VoiceAgentSession = {
      userId,
      sessionId,
      source: "headset_voice",
      wakeWordEnabled: true,
      isListening: false
    };
    this.sessions.set(key, created);
    return created;
  }

  updateTranscript(userId: string, sessionId: string, transcript: string): void {
    const session = this.getOrCreate(userId, sessionId);
    session.lastTranscript = transcript;
  }
}
