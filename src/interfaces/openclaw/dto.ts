import { z } from "zod";

export const skillRequestSchema = z.object({
  userId: z.string(),
  sessionId: z.string(),
  inputType: z.enum(["text", "voice"]),
  text: z.string().min(1)
});

export type SkillRequest = z.infer<typeof skillRequestSchema>;

export interface SkillResponsePayload {
  trackId?: string;
  trackTitle?: string;
  artistName?: string;
  volumePercent?: number;
  playbackStatus?: "idle" | "playing" | "paused";
  playlistName?: string;
  downloadTaskId?: string;
  filePath?: string;
  favoriteCount?: number;
  isFavorited?: boolean;
}

export interface SkillResponse {
  status: "success" | "error";
  intent: string;
  replyText: string;
  errorCode?: string;
  payload?: SkillResponsePayload;
}
