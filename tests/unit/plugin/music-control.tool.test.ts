import { describe, expect, it } from "vitest";
import { executeMusicControl } from "../../../src/plugin/music-control.tool.js";
import { AppError } from "../../../src/shared/errors/app-error.js";
import { ErrorCodes } from "../../../src/shared/errors/error-codes.js";

describe("executeMusicControl", () => {
  it("plays music through the shared handler", async () => {
    const result = await executeMusicControl({
      action: "play",
      text: "播放周杰伦的晴天",
      userId: "u_001",
      sessionId: "s_001"
    });

    expect(result.content[0]?.text).toContain("晴天");
    expect((result.structuredContent as { action: string }).action).toBe("music.play");
  });

  it("sets volume through the shared handler", async () => {
    const result = await executeMusicControl({
      action: "set_volume",
      volumePercent: 30,
      userId: "u_001",
      sessionId: "s_001"
    });

    expect(result.content[0]?.text).toContain("30%");
  });

  it("adds the current track to a playlist", async () => {
    await executeMusicControl({
      action: "play",
      text: "播放周杰伦的晴天",
      userId: "u_002",
      sessionId: "s_002"
    });

    const result = await executeMusicControl({
      action: "add_current_to_playlist",
      playlistName: "workout",
      userId: "u_002",
      sessionId: "s_002"
    });

    expect(result.content[0]?.text).toContain("歌单");
  });

  it("downloads the current track", async () => {
    await executeMusicControl({
      action: "play",
      text: "播放周杰伦的晴天",
      userId: "u_003",
      sessionId: "s_003"
    });

    const result = await executeMusicControl({
      action: "download_current",
      userId: "u_003",
      sessionId: "s_003"
    });

    expect(result.content[0]?.text).toContain("下载");
  });

  it("returns latest download status", async () => {
    const result = await executeMusicControl({
      action: "download_status",
      userId: "u_003",
      sessionId: "s_003"
    });

    expect(result.content[0]?.text.length).toBeGreaterThan(0);
  });

  it("lists downloads", async () => {
    const result = await executeMusicControl({
      action: "list_downloads",
      userId: "u_003",
      sessionId: "s_003"
    });

    expect(result.content[0]?.text.length).toBeGreaterThan(0);
  });

  it("rejects tool calls without host user/session identity", async () => {
    await expect(
      executeMusicControl({
        action: "pause"
      })
    ).rejects.toMatchObject({
      code: ErrorCodes.InvalidInput
    } satisfies Partial<AppError>);
  });
});
