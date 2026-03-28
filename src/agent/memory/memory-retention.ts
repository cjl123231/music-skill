function readIntEnv(name: string, fallback: number): number {
  const raw = process.env[name];
  if (!raw) {
    return fallback;
  }

  const value = Number.parseInt(raw, 10);
  return Number.isFinite(value) && value > 0 ? value : fallback;
}

export const DEFAULT_PREFERENCE_MEMORY_LIMIT = 50;
export const DEFAULT_BEHAVIOR_MEMORY_LIMIT = 200;
export const DEFAULT_BEHAVIOR_RECOMMENDATION_WINDOW = 20;

export function getPreferenceMemoryLimit(): number {
  return readIntEnv("MUSIC_AGENT_PREFERENCE_MEMORY_LIMIT", DEFAULT_PREFERENCE_MEMORY_LIMIT);
}

export function getBehaviorMemoryLimit(): number {
  return readIntEnv("MUSIC_AGENT_BEHAVIOR_MEMORY_LIMIT", DEFAULT_BEHAVIOR_MEMORY_LIMIT);
}

export function getBehaviorRecommendationWindow(): number {
  return readIntEnv("MUSIC_AGENT_BEHAVIOR_WINDOW", DEFAULT_BEHAVIOR_RECOMMENDATION_WINDOW);
}
