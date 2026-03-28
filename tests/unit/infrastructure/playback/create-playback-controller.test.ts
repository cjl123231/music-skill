import { describe, expect, it, vi, afterEach } from "vitest";

describe("createPlaybackController", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns a Windows controller on win32", async () => {
    vi.spyOn(process, "platform", "get").mockReturnValue("win32");
    const { createPlaybackController } = await import("../../../../src/infrastructure/playback/create-playback-controller.js");

    expect(createPlaybackController()?.constructor.name).toBe("WindowsPlaybackController");
  });

  it("returns a macOS controller on darwin", async () => {
    vi.spyOn(process, "platform", "get").mockReturnValue("darwin");
    const { createPlaybackController } = await import("../../../../src/infrastructure/playback/create-playback-controller.js");

    expect(createPlaybackController()?.constructor.name).toBe("MacOSPlaybackController");
  });

  it("returns undefined on unsupported platforms", async () => {
    vi.spyOn(process, "platform", "get").mockReturnValue("linux");
    const { createPlaybackController } = await import("../../../../src/infrastructure/playback/create-playback-controller.js");

    expect(createPlaybackController()).toBeUndefined();
  });
});
