import type { Track } from "./track.js";

export interface Playlist {
  id: string;
  userId: string;
  name: string;
  tracks: Track[];
}
