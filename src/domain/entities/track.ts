export interface Track {
  id: string;
  title: string;
  artist: string;
  album?: string;
  filePath?: string;
  durationMs?: number;
  source: string;
  playable: boolean;
  downloadable: boolean;
}
