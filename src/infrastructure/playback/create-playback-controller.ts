import type { PlaybackController } from "../../domain/services/playback-controller.js";
import { MacOSPlaybackController } from "./macos-playback.controller.js";
import { WindowsPlaybackController } from "./windows-playback.controller.js";

export function createPlaybackController(): PlaybackController | undefined {
  switch (process.platform) {
    case "win32":
      return new WindowsPlaybackController();
    case "darwin":
      return new MacOSPlaybackController();
    default:
      return undefined;
  }
}
