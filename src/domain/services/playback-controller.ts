import type { Track } from "../entities/track.js";
import type { PlaybackState } from "../entities/playback-state.js";

export interface PlaybackController {
  play(track: Track): Promise<void>;
  pause(): Promise<void>;
  resume(): Promise<void>;
  stop(): Promise<void>;
  setVolume(percent: number): Promise<void>;
  getPlaybackState?(): Promise<Pick<PlaybackState, "status" | "volumePercent">>;
}
