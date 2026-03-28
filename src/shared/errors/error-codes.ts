export const ErrorCodes = {
  InvalidInput: "INVALID_INPUT",
  IntentNotSupported: "INTENT_NOT_SUPPORTED",
  MusicNotFound: "MUSIC_NOT_FOUND",
  MusicNotPlaying: "MUSIC_NOT_PLAYING",
  PlaylistNotFound: "PLAYLIST_NOT_FOUND",
  DownloadFailed: "DOWNLOAD_FAILED"
} as const;

export type ErrorCode = (typeof ErrorCodes)[keyof typeof ErrorCodes];
