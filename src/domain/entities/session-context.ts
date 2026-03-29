import type { Track } from "./track.js";

export interface SessionContext {
  sessionId: string;
  userId: string;
  currentTrack: Track | null;
  playbackStatus?: "idle" | "playing" | "paused";
  volumePercent?: number;
  lastSearchResults: Track[];
  updatedAt: string;
}
