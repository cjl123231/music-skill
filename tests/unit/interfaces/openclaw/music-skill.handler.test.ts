import { rmSync } from "node:fs";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createContainer } from "../../../../src/app/container.js";

describe("MusicSkillHandler", () => {
  beforeEach(() => {
    process.env.MUSIC_STORAGE_DRIVER = "json";
    process.env.MUSIC_DB_PATH = "./data/test-music-skill-handler.json";
    rmSync(process.env.MUSIC_DB_PATH, { force: true });
  });

  afterEach(() => {
    rmSync(process.env.MUSIC_DB_PATH!, { force: true });
  });

  it("returns structured payload for play intent", async () => {
    const container = createContainer();
    const response = await container.musicSkillHandler.handle({
      userId: "u_001",
      sessionId: "s_001",
      inputType: "text",
      text: "播放周杰伦的晴天"
    });

    expect(response.status).toBe("success");
    expect(response.intent).toBe("music.play");
    expect(response.payload?.trackTitle).toBe("晴天");
    expect(response.payload?.artistName).toBe("周杰伦");
    expect(response.payload?.playbackStatus).toBe("playing");
  });

  it("returns error code for unsupported command", async () => {
    const container = createContainer();
    const response = await container.musicSkillHandler.handle({
      userId: "u_001",
      sessionId: "s_002",
      inputType: "text",
      text: "帮我打开天气"
    });

    expect(response.status).toBe("error");
    expect(response.errorCode).toBe("INTENT_NOT_SUPPORTED");
  });

  it("favorites the current track after playback", async () => {
    const container = createContainer();

    await container.musicSkillHandler.handle({
      userId: "u_001",
      sessionId: "s_010",
      inputType: "text",
      text: "播放周杰伦的晴天"
    });

    const response = await container.musicSkillHandler.handle({
      userId: "u_001",
      sessionId: "s_010",
      inputType: "text",
      text: "收藏这首歌"
    });

    expect(response.status).toBe("success");
    expect(response.intent).toBe("music.favorite.add");
    expect(response.payload?.isFavorited).toBe(true);
  });

  it("lists favorite tracks", async () => {
    const container = createContainer();

    await container.musicSkillHandler.handle({
      userId: "u_001",
      sessionId: "s_011",
      inputType: "text",
      text: "播放周杰伦的晴天"
    });

    await container.musicSkillHandler.handle({
      userId: "u_001",
      sessionId: "s_011",
      inputType: "text",
      text: "收藏这首歌"
    });

    const response = await container.musicSkillHandler.handle({
      userId: "u_001",
      sessionId: "s_011",
      inputType: "text",
      text: "查看收藏"
    });

    expect(response.status).toBe("success");
    expect(response.intent).toBe("music.favorite.list");
    expect(response.payload?.favoriteCount).toBe(1);
  });

  it("plays the latest favorited track", async () => {
    const container = createContainer();

    await container.musicSkillHandler.handle({
      userId: "u_001",
      sessionId: "s_012",
      inputType: "text",
      text: "播放周杰伦的晴天"
    });

    await container.musicSkillHandler.handle({
      userId: "u_001",
      sessionId: "s_012",
      inputType: "text",
      text: "收藏这首歌"
    });

    const response = await container.musicSkillHandler.handle({
      userId: "u_001",
      sessionId: "s_012",
      inputType: "text",
      text: "播放我的收藏"
    });

    expect(response.status).toBe("success");
    expect(response.intent).toBe("music.play");
    expect(response.payload?.trackTitle).toBe("晴天");
  });

  it("plays a named favorite track", async () => {
    const container = createContainer();

    await container.musicSkillHandler.handle({
      userId: "u_001",
      sessionId: "s_013",
      inputType: "text",
      text: "播放周杰伦的晴天"
    });

    await container.musicSkillHandler.handle({
      userId: "u_001",
      sessionId: "s_013",
      inputType: "text",
      text: "收藏这首歌"
    });

    const response = await container.musicSkillHandler.handle({
      userId: "u_001",
      sessionId: "s_013",
      inputType: "text",
      text: "播放我收藏的晴天"
    });

    expect(response.status).toBe("success");
    expect(response.intent).toBe("music.play");
    expect(response.payload?.trackTitle).toBe("晴天");
  });

  it("downloads the current track after playback", async () => {
    const container = createContainer();

    await container.musicSkillHandler.handle({
      userId: "u_001",
      sessionId: "s_020",
      inputType: "text",
      text: "播放周杰伦的晴天"
    });

    const response = await container.musicSkillHandler.handle({
      userId: "u_001",
      sessionId: "s_020",
      inputType: "text",
      text: "下载这首歌"
    });

    expect(response.status).toBe("success");
    expect(response.intent).toBe("music.download.track");
    expect(response.payload?.filePath).toBeTruthy();
  });

  it("returns download list", async () => {
    const container = createContainer();
    const response = await container.musicSkillHandler.handle({
      userId: "u_001",
      sessionId: "s_021",
      inputType: "text",
      text: "查看下载列表"
    });

    expect(response.status).toBe("success");
    expect(response.intent).toBe("music.download.list");
  });
});
