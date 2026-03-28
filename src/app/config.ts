export interface AppConfig {
  defaultProvider: string;
}

export function loadConfig(): AppConfig {
  return {
    defaultProvider: process.env.MUSIC_SKILL_DEFAULT_PROVIDER ?? "stub"
  };
}
