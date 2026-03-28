import { describe, expect, it } from "vitest";
import { AddFavoriteUseCase } from "../../../../src/application/use-cases/add-favorite.use-case.js";
import { CurrentTrackResolver } from "../../../../src/application/use-cases/current-track-resolver.js";
import { createDatabase } from "../../../../src/infrastructure/storage/sqlite/db.js";
import { StubMusicProvider } from "../../../../src/infrastructure/providers/stub/stub-music.provider.js";
import { JsonFavoritesRepository } from "../../../../src/infrastructure/storage/sqlite/favorites.repository.json.js";

describe("AddFavoriteUseCase", () => {
  it("adds the current track to favorites", async () => {
    const repo = new JsonFavoritesRepository(createDatabase("./data/test-favorites.json"));
    const useCase = new AddFavoriteUseCase(repo, new CurrentTrackResolver(new StubMusicProvider()));

    const track = {
      id: "track_qingtian",
      title: "晴天",
      artist: "周杰伦",
      source: "stub",
      playable: true,
      downloadable: true
    };

    await useCase.execute({
      userId: "u1",
      context: {
        sessionId: "s1",
        userId: "u1",
        currentTrack: track,
        lastSearchResults: [],
        updatedAt: new Date().toISOString()
      }
    });

    const favorites = await repo.list("u1");
    expect(favorites).toHaveLength(1);
    expect(favorites[0]?.title).toBe("晴天");
  });
});
