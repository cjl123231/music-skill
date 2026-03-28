import type { Track } from "./track.js";

export interface SessionContext {
  sessionId: string;
  userId: string;
  currentTrack: Track | null;
  lastSearchResults: Track[];
  updatedAt: string;
}
