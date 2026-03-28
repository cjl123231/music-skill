import type { Track } from "./track.js";

export interface PlaybackState {
  status: "idle" | "playing" | "paused";
  track: Track | null;
  volumePercent: number;
}
