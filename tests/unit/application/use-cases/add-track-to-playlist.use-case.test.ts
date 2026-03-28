import { describe, expect, it } from "vitest";
import { AddTrackToPlaylistUseCase } from "../../../../src/application/use-cases/add-track-to-playlist.use-case.js";
import { CurrentTrackResolver } from "../../../../src/application/use-cases/current-track-resolver.js";
import { createDatabase } from "../../../../src/infrastructure/storage/sqlite/db.js";
import { StubMusicProvider } from "../../../../src/infrastructure/providers/stub/stub-music.provider.js";
import { JsonPlaylistsRepository } from "../../../../src/infrastructure/storage/sqlite/playlists.repository.json.js";

describe("AddTrackToPlaylistUseCase", () => {
  it("creates a playlist and adds the current track", async () => {
    const repo = new JsonPlaylistsRepository(createDatabase("./data/test-playlists.json"));
    const useCase = new AddTrackToPlaylistUseCase(repo, new CurrentTrackResolver(new StubMusicProvider()));

    const playlist = await useCase.execute({
      userId: "u1",
      playlistName: "学习",
      context: {
        sessionId: "s1",
        userId: "u1",
        currentTrack: {
          id: "track_qingtian",
          title: "晴天",
          artist: "周杰伦",
          source: "stub",
          playable: true,
          downloadable: true
        },
        lastSearchResults: [],
        updatedAt: new Date().toISOString()
      }
    });

    expect(playlist.name).toBe("学习");
    expect(playlist.tracks).toHaveLength(1);
  });
});
