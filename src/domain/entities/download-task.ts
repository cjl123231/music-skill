export interface DownloadTask {
  id: string;
  userId: string;
  trackId: string;
  trackTitle: string;
  artistName: string;
  filePath: string;
  status: "completed";
  createdAt: string;
}
