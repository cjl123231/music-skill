import type { Track } from "../../domain/entities/track.js";
import type { FavoritesRepository } from "../../domain/repositories/favorites.repository.js";
import type { MusicProvider } from "../../domain/services/music-provider.js";
import type { BehaviorMemoryService } from "../memory/behavior-memory.service.js";
import { getBehaviorRecommendationWindow } from "../memory/memory-retention.js";
import type { PreferenceMemoryService } from "../memory/preference-memory.service.js";

interface RecommendationOptions {
  scene?: string;
}

function containsAny(text: string, candidates: string[]): boolean {
  const lower = text.toLocaleLowerCase();
  return candidates.some((candidate) => candidate && lower.includes(candidate.toLocaleLowerCase()));
}

function sceneKeywords(scene?: string): string[] {
  if (scene === "coding") {
    return ["轻", "安静", "纯音乐", "人声", "录音"];
  }

  if (scene === "calm") {
    return ["安静", "轻", "慢", "纯音乐", "录音"];
  }

  if (scene === "focus" || scene === "study") {
    return ["纯音乐", "轻", "安静", "录音"];
  }

  if (scene === "workout") {
    return ["快", "燃", "节奏"];
  }

  return [];
}

function scoreTrack(
  track: Track,
  positivePreferences: string[],
  negativePreferences: string[],
  behaviorHints: string[],
  isFavorite: boolean,
  scene?: string
): number {
  let score = isFavorite ? 100 : 0;

  const titleArtist = `${track.title} ${track.artist}`;
  if (containsAny(titleArtist, positivePreferences)) {
    score += 50;
  }

  if (containsAny(track.artist, positivePreferences)) {
    score += 35;
  }

  if (containsAny(titleArtist, behaviorHints)) {
    score += 20;
  }

  if (containsAny(titleArtist, sceneKeywords(scene))) {
    score += 25;
  }

  if (containsAny(titleArtist, negativePreferences)) {
    score -= 80;
  }

  if (containsAny(track.artist, negativePreferences)) {
    score -= 60;
  }

  return score;
}

export class RecommendationPlanner {
  constructor(
    private readonly provider: MusicProvider,
    private readonly favoritesRepository: FavoritesRepository,
    private readonly preferenceMemory: PreferenceMemoryService,
    private readonly behaviorMemory: BehaviorMemoryService
  ) {}

  async pickTrack(userId: string, options: RecommendationOptions = {}): Promise<Track | null> {
    const [favorites, allTracks, positivePreferences, negativePreferences, events] = await Promise.all([
      this.favoritesRepository.list(userId),
      this.provider.listTracks(),
      this.preferenceMemory.listPositive(userId),
      this.preferenceMemory.listNegative(userId),
      this.behaviorMemory.listRecent(userId, getBehaviorRecommendationWindow())
    ]);

    const favoriteIds = new Set(favorites.map((track) => track.id));
    const behaviorHints = events
      .filter((event) => !event.type.startsWith("preference.remembered.negative"))
      .map((event) => event.detail);
    const pool = favorites.length > 0 ? favorites : allTracks;

    if (pool.length === 0) {
      return null;
    }

    const ranked = [...pool].sort((a, b) => {
      const aScore = scoreTrack(
        a,
        positivePreferences,
        negativePreferences,
        behaviorHints,
        favoriteIds.has(a.id),
        options.scene
      );
      const bScore = scoreTrack(
        b,
        positivePreferences,
        negativePreferences,
        behaviorHints,
        favoriteIds.has(b.id),
        options.scene
      );
      return bScore - aScore;
    });

    return ranked[0] ?? null;
  }
}
