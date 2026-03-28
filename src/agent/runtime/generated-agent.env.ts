import type { GeneratedAgentProfile } from "./generated-agent.types.js";

export function applyGeneratedAgentEnvironment(profile: GeneratedAgentProfile): void {
  if (!process.env.MUSIC_LIBRARY_DIR && profile.runtimeConfig.musicLibraryDir) {
    process.env.MUSIC_LIBRARY_DIR = profile.runtimeConfig.musicLibraryDir;
  }

  if (!process.env.MUSIC_STORAGE_DRIVER && profile.runtimeConfig.storageDriver) {
    process.env.MUSIC_STORAGE_DRIVER = profile.runtimeConfig.storageDriver;
  }

  if (!process.env.PORT && profile.runtimeConfig.panelPort) {
    process.env.PORT = String(profile.runtimeConfig.panelPort);
  }
}
