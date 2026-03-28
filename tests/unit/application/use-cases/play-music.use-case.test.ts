import { describe, expect, it } from "vitest";
import { PlayMusicUseCase } from "../../../../src/application/use-cases/play-music.use-case.js";
import { StubMusicProvider } from "../../../../src/infrastructure/providers/stub/stub-music.provider.js";

describe("PlayMusicUseCase", () => {
  it("plays the first matched track", async () => {
    const useCase = new PlayMusicUseCase(new StubMusicProvider());
    const result = await useCase.execute({
      keyword: "晴天",
      context: {
        sessionId: "s1",
        userId: "u1",
        currentTrack: null,
        lastSearchResults: [],
        updatedAt: new Date().toISOString()
      }
    });

    expect(result.playback.status).toBe("playing");
    expect(result.playback.track?.title).toBe("晴天");
  });
});
