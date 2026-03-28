import { describe, expect, it } from "vitest";
import { RecommendationPlanner } from "../../../src/agent/planning/recommendation-planner.js";

describe("RecommendationPlanner", () => {
  it("does not treat negative remembered preferences as positive behavior hints", async () => {
    const planner = new RecommendationPlanner(
      {
        listTracks: async () => [
          {
            id: "track-jay",
            title: "晴天",
            artist: "周杰伦",
            source: "local",
            playable: true,
            downloadable: true
          },
          {
            id: "track-other",
            title: "夜曲钢琴版",
            artist: "Unknown Artist",
            source: "local",
            playable: true,
            downloadable: true
          }
        ]
      } as never,
      {
        list: async () => []
      } as never,
      {
        listPositive: async () => [],
        listNegative: async () => ["周杰伦"]
      } as never,
      {
        listRecent: async () => [
          {
            userId: "u1",
            type: "preference.remembered.negative",
            detail: "周杰伦",
            timestamp: new Date().toISOString()
          }
        ]
      } as never
    );

    const track = await planner.pickTrack("u1");
    expect(track?.id).toBe("track-other");
  });
});
