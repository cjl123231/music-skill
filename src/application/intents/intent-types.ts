export const IntentTypes = {
  // Skill-level intents handled by MusicSkillHandler.
  Play: "music.play",
  Pause: "music.pause",
  Resume: "music.resume",
  Next: "music.next",
  Previous: "music.previous",
  NowPlaying: "music.now_playing",
  VolumeSet: "music.volume.set",
  FavoriteAdd: "music.favorite.add",
  FavoriteList: "music.favorite.list",
  PlaylistAddTrack: "music.playlist.add_track",
  DownloadTrack: "music.download.track",
  DownloadStatus: "music.download.status",
  DownloadList: "music.download.list",
  Unsupported: "music.unsupported",

  // Agent-level intents handled by ActionPlanner / MusicAgentService.
  RecommendScene: "agent.recommend.play",
  RecommendPreference: "agent.recommend.preference",
  RememberPositive: "agent.memory.preference.positive",
  RememberNegative: "agent.memory.preference.negative"
} as const;

export type IntentType = (typeof IntentTypes)[keyof typeof IntentTypes];

/** Check whether an intent is agent-level (not delegated to skill handler). */
export function isAgentIntent(intent: IntentType): boolean {
  return intent.startsWith("agent.");
}

/** Check whether an intent is skill-level (delegated to skill handler). */
export function isSkillIntent(intent: IntentType): boolean {
  return intent.startsWith("music.") && intent !== IntentTypes.Unsupported;
}
