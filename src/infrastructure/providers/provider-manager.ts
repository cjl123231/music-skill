import type { MusicProvider } from "../../domain/services/music-provider.js";
import { existsSync, statSync } from "node:fs";
import { resolve } from "node:path";
import { loadGeneratedAgentProfile } from "../../agent/runtime/generated-agent.loader.js";
import { createPlaybackController } from "../playback/create-playback-controller.js";
import { LocalMusicProvider } from "./local/local-music.provider.js";
import { StubMusicProvider } from "./stub/stub-music.provider.js";

export function createProvider(): MusicProvider {
  const profile = loadGeneratedAgentProfile();
  const musicDir = process.env.MUSIC_LIBRARY_DIR ?? profile.runtimeConfig.musicLibraryDir;
  if (musicDir) {
    const resolved = resolve(musicDir);
    if (existsSync(resolved) && statSync(resolved).isDirectory()) {
      const localProvider = new LocalMusicProvider(resolved, createPlaybackController());
      if (localProvider.hasTracks()) {
        return localProvider;
      }
    }
  }

  return new StubMusicProvider();
}
