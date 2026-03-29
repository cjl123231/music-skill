import { describe, expect, it, vi, afterEach } from "vitest";
import { PlayerEngine } from "../../../src/player/core/player-engine.js";
import type { Track } from "../../../src/domain/entities/track.js";

const tracks: Track[] = [
  {
    id: "track-1",
    title: "First",
    artist: "Tester",
    durationMs: 12_000,
    source: "local",
    playable: true,
    downloadable: true
  },
  {
    id: "track-2",
    title: "Second",
    artist: "Tester",
    durationMs: 10_000,
    source: "local",
    playable: true,
    downloadable: true
  }
];

describe("PlayerEngine", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("plays, pauses, and resumes through the playback controller", async () => {
    const playbackController = {
      play: vi.fn(async () => {}),
      pause: vi.fn(async () => {}),
      resume: vi.fn(async () => {}),
      stop: vi.fn(async () => {}),
      setVolume: vi.fn(async () => {}),
      getPlaybackState: vi.fn(async () => ({
        status: "paused" as const,
        volumePercent: 35
      }))
    };

    const engine = new PlayerEngine(async () => tracks, playbackController);
    await engine.play(tracks[0]!);

    const state = await engine.getState();

    expect(playbackController.play).toHaveBeenCalledWith(tracks[0]);
    expect(state.track?.id).toBe("track-1");
    expect(state.status).toBe("paused");
    expect(state.volumePercent).toBe(50);
  });

  it("keeps the locally confirmed volume when controller polling lags behind", async () => {
    const playbackController = {
      play: vi.fn(async () => {}),
      pause: vi.fn(async () => {}),
      resume: vi.fn(async () => {}),
      stop: vi.fn(async () => {}),
      setVolume: vi.fn(async () => {}),
      getPlaybackState: vi.fn(async () => ({
        status: "playing" as const,
        volumePercent: 50
      }))
    };

    const engine = new PlayerEngine(async () => tracks, playbackController);
    await engine.play(tracks[0]!);
    await engine.setVolume(60);

    const state = await engine.getState();

    expect(state.volumePercent).toBe(60);
  });

  it("automatically advances to the next track when playback finishes naturally", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-03-29T00:00:00.000Z"));

    let stateCallCount = 0;
    const playbackController = {
      play: vi.fn(async () => {}),
      pause: vi.fn(async () => {}),
      resume: vi.fn(async () => {}),
      stop: vi.fn(async () => {}),
      setVolume: vi.fn(async () => {}),
      getPlaybackState: vi.fn(async () => {
        stateCallCount += 1;
        if (stateCallCount === 1) {
          return { status: "playing" as const, volumePercent: 50 };
        }

        return { status: "idle" as const, volumePercent: 50 };
      })
    };

    const engine = new PlayerEngine(async () => tracks, playbackController);

    await engine.play(tracks[0]!);
    await engine.getState();
    vi.advanceTimersByTime(13_000);

    const state = await engine.getState();

    expect(state.status).toBe("playing");
    expect(state.track?.id).toBe("track-2");
    expect(playbackController.play).toHaveBeenLastCalledWith(tracks[1]);
  });
});
