import { existsSync, rmSync, writeFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { CurrentTrackResolver } from "../../../../src/application/use-cases/current-track-resolver.js";
import { DownloadTrackUseCase } from "../../../../src/application/use-cases/download-track.use-case.js";
import { FileDownloader } from "../../../../src/infrastructure/downloads/file-downloader.js";
import { StubMusicProvider } from "../../../../src/infrastructure/providers/stub/stub-music.provider.js";
import { createDatabase } from "../../../../src/infrastructure/storage/sqlite/db.js";
import { JsonDownloadTaskRepository } from "../../../../src/infrastructure/storage/sqlite/download-task.repository.json.js";

describe("DownloadTrackUseCase", () => {
  it("copies the real local audio file when filePath is available", async () => {
    const dbPath = "./data/test-downloads-db.json";
    const downloadDir = "./downloads/test-downloads";
    const sourceFile = "./data/test-source-song.mp3";
    rmSync(dbPath, { force: true });
    rmSync(downloadDir, { recursive: true, force: true });
    rmSync(sourceFile, { force: true });
    writeFileSync(sourceFile, "fake-audio-content", "utf8");

    const useCase = new DownloadTrackUseCase(
      new FileDownloader(downloadDir),
      new JsonDownloadTaskRepository(createDatabase(dbPath)),
      new CurrentTrackResolver(new StubMusicProvider())
    );

    const task = await useCase.execute({
      userId: "u1",
      context: {
        sessionId: "s1",
        userId: "u1",
        currentTrack: {
          id: "track_local",
          title: "录音",
          artist: "Unknown Artist",
          filePath: sourceFile,
          source: "local",
          playable: true,
          downloadable: true
        },
        lastSearchResults: [],
        updatedAt: new Date().toISOString()
      }
    });

    expect(task.status).toBe("completed");
    expect(task.filePath.endsWith(".mp3")).toBe(true);
    expect(existsSync(task.filePath)).toBe(true);

    rmSync(dbPath, { force: true });
    rmSync(downloadDir, { recursive: true, force: true });
    rmSync(sourceFile, { force: true });
  });

  it("falls back to a placeholder text file for non-local tracks", async () => {
    const dbPath = "./data/test-downloads-db-fallback.json";
    const downloadDir = "./downloads/test-downloads-fallback";
    rmSync(dbPath, { force: true });
    rmSync(downloadDir, { recursive: true, force: true });

    const useCase = new DownloadTrackUseCase(
      new FileDownloader(downloadDir),
      new JsonDownloadTaskRepository(createDatabase(dbPath)),
      new CurrentTrackResolver(new StubMusicProvider())
    );

    const task = await useCase.execute({
      userId: "u1",
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

    expect(task.filePath.endsWith(".txt")).toBe(true);
    expect(existsSync(task.filePath)).toBe(true);

    rmSync(dbPath, { force: true });
    rmSync(downloadDir, { recursive: true, force: true });
  });

  it("keeps both files when downloading the same song twice", async () => {
    const dbPath = "./data/test-downloads-db-repeat.json";
    const downloadDir = "./downloads/test-downloads-repeat";
    const sourceFile = "./data/test-source-repeat.mp3";
    rmSync(dbPath, { force: true });
    rmSync(downloadDir, { recursive: true, force: true });
    rmSync(sourceFile, { force: true });
    writeFileSync(sourceFile, "fake-audio-content-repeat", "utf8");

    const useCase = new DownloadTrackUseCase(
      new FileDownloader(downloadDir),
      new JsonDownloadTaskRepository(createDatabase(dbPath)),
      new CurrentTrackResolver(new StubMusicProvider())
    );

    const context = {
      sessionId: "s1",
      userId: "u1",
      currentTrack: {
        id: "track_local_repeat",
        title: "录音",
        artist: "Unknown Artist",
        filePath: sourceFile,
        source: "local" as const,
        playable: true,
        downloadable: true
      },
      lastSearchResults: [],
      updatedAt: new Date().toISOString()
    };

    const firstTask = await useCase.execute({ userId: "u1", context });
    const secondTask = await useCase.execute({ userId: "u1", context });

    expect(firstTask.filePath).not.toBe(secondTask.filePath);
    expect(existsSync(firstTask.filePath)).toBe(true);
    expect(existsSync(secondTask.filePath)).toBe(true);

    rmSync(dbPath, { force: true });
    rmSync(downloadDir, { recursive: true, force: true });
    rmSync(sourceFile, { force: true });
  });
});
