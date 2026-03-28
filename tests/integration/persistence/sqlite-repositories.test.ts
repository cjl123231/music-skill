import { rmSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { BetterSqliteDownloadTaskRepository } from "../../../src/infrastructure/storage/sqlite/download-task.repository.better-sqlite.js";
import { BetterSqliteFavoritesRepository } from "../../../src/infrastructure/storage/sqlite/favorites.repository.better-sqlite.js";
import { BetterSqlitePlaylistsRepository } from "../../../src/infrastructure/storage/sqlite/playlists.repository.better-sqlite.js";
import { BetterSqliteSessionContextRepository } from "../../../src/infrastructure/storage/sqlite/session-context.repository.better-sqlite.js";
import { createSqliteClient } from "../../../src/infrastructure/storage/sqlite/sqlite-client.js";

describe("SQLite repositories", () => {
  it("persists favorites, playlists, downloads, and session context", async () => {
    const dbPath = "./data/test-music-skill.db";
    rmSync(dbPath, { force: true });

    const client = createSqliteClient(dbPath);
    const favoritesRepository = new BetterSqliteFavoritesRepository(client);
    const playlistsRepository = new BetterSqlitePlaylistsRepository(client);
    const downloadTaskRepository = new BetterSqliteDownloadTaskRepository(client);
    const sessionContextRepository = new BetterSqliteSessionContextRepository(client);

    const track = {
      id: "track-1",
      title: "Qing Tian",
      artist: "Jay Chou",
      source: "local",
      playable: true,
      downloadable: true,
      filePath: "/music/Qing Tian.mp3"
    };

    await favoritesRepository.add("user-1", track);
    await playlistsRepository.addTrack("user-1", "study", track);
    await downloadTaskRepository.save({
      id: "download-1",
      userId: "user-1",
      trackId: track.id,
      trackTitle: track.title,
      artistName: track.artist,
      filePath: "./downloads/Qing Tian.mp3",
      status: "completed",
      createdAt: new Date().toISOString()
    });
    await sessionContextRepository.save({
      sessionId: "session-1",
      userId: "user-1",
      currentTrack: track,
      lastSearchResults: [track],
      updatedAt: new Date().toISOString()
    });

    expect(await favoritesRepository.list("user-1")).toHaveLength(1);
    expect((await playlistsRepository.getByName("user-1", "study"))?.tracks).toHaveLength(1);
    expect(await downloadTaskRepository.listByUser("user-1")).toHaveLength(1);
    expect((await sessionContextRepository.getBySessionId("session-1"))?.currentTrack?.title).toBe("Qing Tian");

    client.close();
    rmSync(dbPath, { force: true });
    rmSync(`${dbPath}-shm`, { force: true });
    rmSync(`${dbPath}-wal`, { force: true });
  });
});
