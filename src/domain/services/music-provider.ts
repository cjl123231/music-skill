import type { PlaybackState } from "../entities/playback-state.js";
import type { Track } from "../entities/track.js";

export interface MusicProvider {
  searchTracks(query: { keyword: string; artistName?: string }): Promise<Track[]>;
  listTracks(): Promise<Track[]>;
  play(track: Track): Promise<PlaybackState>;
  restorePlayback?(track: Track, status?: PlaybackState["status"]): Promise<PlaybackState>;
  pause(): Promise<PlaybackState>;
  resume(): Promise<PlaybackState>;
  next(): Promise<PlaybackState>;
  previous(): Promise<PlaybackState>;
  setVolume(percent: number): Promise<PlaybackState>;
  getNowPlaying(): Promise<PlaybackState>;
}
