/**
 * Intent searcher using keyword matching over the CSV intent knowledge base.
 *
 * Strategy: For each intent row in the CSV, check if any of its keywords
 * appear in the user input. Score by:
 *   1. Longest keyword match
 *   2. Match position
 *   3. Intent priority
 *
 * This utility is kept for debugging and future ranking work. The production
 * router currently uses explicit ordered rules in `intent-router.ts`.
 */
import { loadIntents, type IntentEntry } from "./csv-loader.js";
import type { IntentType } from "../intents/intent-types.js";
import { IntentTypes } from "../intents/intent-types.js";

interface ScoredMatch {
  intent: string;
  score: number;
  matchedKeyword: string;
  priority: number;
}

export class IntentSearcher {
  private readonly entries: IntentEntry[];
  private readonly validIntents: Set<string>;

  constructor() {
    this.entries = loadIntents();
    this.validIntents = new Set(Object.values(IntentTypes));
  }

  search(input: string): IntentType {
    const text = input.trim().toLowerCase();
    if (!text) return IntentTypes.Unsupported;

    const matches: ScoredMatch[] = [];

    for (const entry of this.entries) {
      if (!this.validIntents.has(entry.intent)) continue;

      const allKeywords = [...entry.keywordsZh, ...entry.keywordsEn];
      let bestScore = 0;
      let bestKeyword = "";

      for (const keyword of allKeywords) {
        const kw = keyword.toLowerCase();
        const pos = text.indexOf(kw);

        if (pos === -1) continue;

        const lengthScore = kw.length * 10;
        const positionScore = Math.max(0, 100 - pos);
        const priorityScore = Math.max(0, 100 - entry.priority);
        const score = lengthScore + positionScore + priorityScore;

        if (score > bestScore) {
          bestScore = score;
          bestKeyword = keyword;
        }
      }

      if (bestScore > 0) {
        matches.push({
          intent: entry.intent,
          score: bestScore,
          matchedKeyword: bestKeyword,
          priority: entry.priority
        });
      }
    }

    if (matches.length === 0) return IntentTypes.Unsupported;

    matches.sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return a.priority - b.priority;
    });

    return matches[0].intent as IntentType;
  }

  searchWithScores(input: string, maxResults = 3): Array<{ intent: string; score: number; keyword: string }> {
    const text = input.trim().toLowerCase();
    if (!text) return [];

    const matches: Array<{ intent: string; score: number; keyword: string }> = [];

    for (const entry of this.entries) {
      const allKeywords = [...entry.keywordsZh, ...entry.keywordsEn];
      let bestScore = 0;
      let bestKeyword = "";

      for (const keyword of allKeywords) {
        const kw = keyword.toLowerCase();
        const pos = text.indexOf(kw);
        if (pos === -1) continue;

        const score = kw.length * 10 + Math.max(0, 100 - pos) + Math.max(0, 100 - entry.priority);
        if (score > bestScore) {
          bestScore = score;
          bestKeyword = keyword;
        }
      }

      if (bestScore > 0) {
        matches.push({ intent: entry.intent, score: bestScore, keyword: bestKeyword });
      }
    }

    return matches.sort((a, b) => b.score - a.score).slice(0, maxResults);
  }
}

let instance: IntentSearcher | null = null;

export function getIntentSearcher(): IntentSearcher {
  if (!instance) {
    instance = new IntentSearcher();
  }
  return instance;
}
