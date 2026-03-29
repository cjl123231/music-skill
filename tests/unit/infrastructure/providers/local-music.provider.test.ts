import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { LocalMusicProvider } from "../../../../src/infrastructure/providers/local/local-music.provider.js";

vi.mock("../../../../src/infrastructure/providers/local/music-metadata-loader.js", () => ({
  parseAudioMetadata: vi.fn(async () => ({
    common: {
      title: "Qing Tian",
      artist: "Jay Chou",
      album: "Ye Hui Mei"
    },
    format: {
      duration: 12.34
    }
  }))
}));

describe("LocalMusicProvider", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("scans local music files and searches by filename", async () => {
    const root = "./data/test-library";
    rmSync(root, { recursive: true, force: true });
    mkdirSync(root, { recursive: true });
    writeFileSync(join(root, "Jay Chou - Qing Tian.mp3"), "");

    const provider = new LocalMusicProvider(root);
    const tracks = await provider.searchTracks({ keyword: "qing tian" });

    expect(provider.hasTracks()).toBe(true);
    expect(tracks).toHaveLength(1);
    expect(tracks[0]?.artist).toBe("Jay Chou");
    expect(tracks[0]?.durationMs).toBe(12340);

    rmSync(root, { recursive: true, force: true });
  });

  it("syncs now playing state from the playback controller when available", async () => {
    const root = "./data/test-library";
    rmSync(root, { recursive: true, force: true });
    mkdirSync(root, { recursive: true });
    writeFileSync(join(root, "Jay Chou - Qing Tian.mp3"), "");

    const playbackController = {
      play: async () => {},
      pause: async () => {},
      resume: async () => {},
      stop: async () => {},
      setVolume: async () => {},
      getPlaybackState: async () => ({
        status: "paused" as const,
        volumePercent: 22
      })
    };

    const provider = new LocalMusicProvider(root, playbackController);
    const [track] = await provider.listTracks();
    await provider.play(track!);

    const state = await provider.getNowPlaying();

    expect(state.status).toBe("paused");
    expect(state.volumePercent).toBe(22);
    expect(state.track?.title).toBe("Qing Tian");

    rmSync(root, { recursive: true, force: true });
  });

  it("automatically advances to the next track when playback finishes naturally", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-03-28T00:00:00.000Z"));

    const root = "./data/test-library";
    rmSync(root, { recursive: true, force: true });
    mkdirSync(root, { recursive: true });
    writeFileSync(join(root, "A First Song.mp3"), "");
    writeFileSync(join(root, "B Second Song.mp3"), "");

    let stateCallCount = 0;
    const playbackController = {
      play: async () => {},
      pause: async () => {},
      resume: async () => {},
      stop: async () => {},
      setVolume: async () => {},
      getPlaybackState: async () => {
        stateCallCount += 1;
        if (stateCallCount === 1) {
          return {
            status: "playing" as const,
            volumePercent: 50
          };
        }

        return {
          status: "idle" as const,
          volumePercent: 50
        };
      }
    };

    const provider = new LocalMusicProvider(root, playbackController);
    const tracks = await provider.listTracks();

    await provider.play(tracks[0]!);
    await provider.getNowPlaying();
    vi.advanceTimersByTime(13_000);
    const state = await provider.getNowPlaying();

    expect(state.status).toBe("playing");
    expect(state.track?.id).toBe(tracks[1]?.id);

    rmSync(root, { recursive: true, force: true });
  });
});
