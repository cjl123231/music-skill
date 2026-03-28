import { rmSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { createDatabase } from "../../../src/infrastructure/storage/sqlite/db.js";
import { JsonFavoritesRepository } from "../../../src/infrastructure/storage/sqlite/favorites.repository.json.js";
import { JsonPlaylistsRepository } from "../../../src/infrastructure/storage/sqlite/playlists.repository.json.js";
import { JsonSessionContextRepository } from "../../../src/infrastructure/storage/sqlite/session-context.repository.json.js";

describe("persistent repositories", () => {
  it("persist state across repository instances", async () => {
    const filePath = "./data/test-persistence.json";
    rmSync(filePath, { force: true });

    const databaseA = createDatabase(filePath);
    const sessionRepoA = new JsonSessionContextRepository(databaseA);
    const favoritesRepoA = new JsonFavoritesRepository(databaseA);
    const playlistsRepoA = new JsonPlaylistsRepository(databaseA);

    await sessionRepoA.save({
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
    });

    await favoritesRepoA.add("u1", {
      id: "track_qingtian",
      title: "晴天",
      artist: "周杰伦",
      source: "stub",
      playable: true,
      downloadable: true
    });

    await playlistsRepoA.addTrack("u1", "study", {
      id: "track_qingtian",
      title: "晴天",
      artist: "周杰伦",
      source: "stub",
      playable: true,
      downloadable: true
    });

    const databaseB = createDatabase(filePath);
    const sessionRepoB = new JsonSessionContextRepository(databaseB);
    const favoritesRepoB = new JsonFavoritesRepository(databaseB);
    const playlistsRepoB = new JsonPlaylistsRepository(databaseB);

    const session = await sessionRepoB.getByUserAndSessionId("u1", "s1");
    const favorites = await favoritesRepoB.list("u1");
    const playlist = await playlistsRepoB.getByName("u1", "study");

    expect(session?.currentTrack?.title).toBe("晴天");
    expect(favorites).toHaveLength(1);
    expect(playlist?.tracks).toHaveLength(1);

    await sessionRepoA.save({
      sessionId: "s1",
      userId: "u2",
      currentTrack: {
        id: "track_daoxiang",
        title: "稻香",
        artist: "周杰伦",
        source: "stub",
        playable: true,
        downloadable: true
      },
      lastSearchResults: [],
      updatedAt: new Date().toISOString()
    });

    const user2Session = await sessionRepoB.getByUserAndSessionId("u2", "s1");
    expect(user2Session?.currentTrack?.title).toBe("稻香");

    rmSync(filePath, { force: true });
  });
});
