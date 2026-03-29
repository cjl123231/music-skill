import { rmSync } from "node:fs";
import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import { AppError } from "../../../src/shared/errors/app-error.js";
import { ErrorCodes } from "../../../src/shared/errors/error-codes.js";

describe("executeMusicControl", () => {
  beforeEach(() => {
    process.env.MUSIC_STORAGE_DRIVER = "json";
    process.env.MUSIC_DB_PATH = "./data/test-music-control-tool.json";
    process.env.MUSIC_LIBRARY_DIR = "";
    rmSync(process.env.MUSIC_DB_PATH, { force: true });
    vi.resetModules();
  });

  afterEach(() => {
    rmSync(process.env.MUSIC_DB_PATH!, { force: true });
    delete process.env.MUSIC_LIBRARY_DIR;
  });

  it("plays music through the shared handler", async () => {
    const { executeMusicControl } = await import("../../../src/plugin/music-control.tool.js");
    const result = await executeMusicControl({
      action: "play",
      text: "\u64ad\u653e\u5468\u6770\u4f26\u7684\u6674\u5929",
      userId: "u_001",
      sessionId: "s_001"
    });

    expect(result.content[0]?.text).toContain("\u6674\u5929");
    expect((result.structuredContent as { action: string }).action).toBe("music.play");
  });

  it("can launch the local music agent without host identity", async () => {
    vi.doMock("node:child_process", () => ({
      spawn: vi.fn(() => ({
        unref: vi.fn()
      }))
    }));

    const { executeMusicControl } = await import("../../../src/plugin/music-control.tool.js");
    const result = await executeMusicControl({
      action: "launch_agent"
    });

    expect(result.content[0]?.text).toContain("小乐正在后台启动");
    expect((result.structuredContent as { action: string }).action).toBe("music.launch_agent");
    vi.doUnmock("node:child_process");
  });

  it("sets volume through the shared handler", async () => {
    const { executeMusicControl } = await import("../../../src/plugin/music-control.tool.js");
    const result = await executeMusicControl({
      action: "set_volume",
      volumePercent: 30,
      userId: "u_001",
      sessionId: "s_001"
    });

    expect(result.content[0]?.text).toContain("30%");
  });

  it("adds the current track to a playlist", async () => {
    const { executeMusicControl } = await import("../../../src/plugin/music-control.tool.js");
    await executeMusicControl({
      action: "play",
      text: "\u64ad\u653e\u5468\u6770\u4f26\u7684\u6674\u5929",
      userId: "u_002",
      sessionId: "s_002"
    });

    const result = await executeMusicControl({
      action: "add_current_to_playlist",
      playlistName: "workout",
      userId: "u_002",
      sessionId: "s_002"
    });

    expect(result.content[0]?.text).toContain("\u6b4c\u5355");
  });

  it("downloads the current track", async () => {
    const { executeMusicControl } = await import("../../../src/plugin/music-control.tool.js");
    await executeMusicControl({
      action: "play",
      text: "\u64ad\u653e\u5468\u6770\u4f26\u7684\u6674\u5929",
      userId: "u_003",
      sessionId: "s_003"
    });

    const result = await executeMusicControl({
      action: "download_current",
      userId: "u_003",
      sessionId: "s_003"
    });

    expect(result.content[0]?.text).toContain("\u4e0b\u8f7d");
  });

  it("returns latest download status", async () => {
    const { executeMusicControl } = await import("../../../src/plugin/music-control.tool.js");
    const result = await executeMusicControl({
      action: "download_status",
      userId: "u_003",
      sessionId: "s_003"
    });

    expect(result.content[0]?.text.length).toBeGreaterThan(0);
  });

  it("lists downloads", async () => {
    const { executeMusicControl } = await import("../../../src/plugin/music-control.tool.js");
    const result = await executeMusicControl({
      action: "list_downloads",
      userId: "u_003",
      sessionId: "s_003"
    });

    expect(result.content[0]?.text.length).toBeGreaterThan(0);
  });

  it("rejects tool calls without host user/session identity", async () => {
    const { executeMusicControl } = await import("../../../src/plugin/music-control.tool.js");
    await expect(
      executeMusicControl({
        action: "pause"
      })
    ).rejects.toMatchObject({
      code: ErrorCodes.InvalidInput
    } satisfies Partial<AppError>);
  });
});
