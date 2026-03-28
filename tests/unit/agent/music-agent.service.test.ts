import { rmSync } from "node:fs";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { MusicAgentService } from "../../../src/agent/core/music-agent.service.js";
import { createAgentContainer } from "../../../src/app/agent-container.js";

describe("MusicAgentService", () => {
  beforeEach(() => {
    process.env.MUSIC_STORAGE_DRIVER = "json";
    process.env.MUSIC_DB_PATH = "./data/test-music-agent-service.json";
    rmSync(process.env.MUSIC_DB_PATH, { force: true });
  });

  afterEach(() => {
    rmSync(process.env.MUSIC_DB_PATH!, { force: true });
  });

  it("delegates regular music commands to the existing skill handler", async () => {
    const { musicAgentService } = createAgentContainer();

    const response = await musicAgentService.handle({
      userId: "agent_u_001",
      sessionId: "agent_s_001",
      inputType: "text",
      text: "播放周杰伦的晴天",
      source: "openclaw",
      timestamp: new Date().toISOString()
    });

    expect(response.status).toBe("success");
    expect(response.action).toBe("music.play");
  });

  it("stores explicit preference memory through the planner", async () => {
    const { musicAgentService } = createAgentContainer();

    const response = await musicAgentService.handle({
      userId: "agent_u_002",
      sessionId: "agent_s_002",
      inputType: "text",
      text: "记住我喜欢这种安静的人声",
      source: "panel",
      timestamp: new Date().toISOString()
    });

    expect(response.status).toBe("success");
    expect(response.action).toBe("agent.memory.preference.positive");
    expect(response.memoryEffects?.[0]).toContain("记住我喜欢这种安静的人声");
  });

  it("maps preference-play command to favorite playback", async () => {
    const { musicAgentService } = createAgentContainer();

    await musicAgentService.handle({
      userId: "agent_u_003",
      sessionId: "agent_s_003",
      inputType: "text",
      text: "播放周杰伦的晴天",
      source: "openclaw",
      timestamp: new Date().toISOString()
    });

    await musicAgentService.handle({
      userId: "agent_u_003",
      sessionId: "agent_s_003",
      inputType: "text",
      text: "收藏这首歌",
      source: "openclaw",
      timestamp: new Date().toISOString()
    });

    const response = await musicAgentService.handle({
      userId: "agent_u_003",
      sessionId: "agent_s_003",
      inputType: "text",
      text: "按我的喜好播放",
      source: "headset_voice",
      timestamp: new Date().toISOString()
    });

    expect(response.status).toBe("success");
    expect(response.action).toBe("music.play");
    expect(response.payload?.trackTitle).toBe("晴天");
  });

  it("uses remembered preference notes to influence recommendation flow", async () => {
    const { musicAgentService } = createAgentContainer();

    await musicAgentService.handle({
      userId: "agent_u_004",
      sessionId: "agent_s_004",
      inputType: "text",
      text: "记住我喜欢周杰伦",
      source: "panel",
      timestamp: new Date().toISOString()
    });

    const response = await musicAgentService.handle({
      userId: "agent_u_004",
      sessionId: "agent_s_004",
      inputType: "text",
      text: "按我的喜好播放",
      source: "headset_voice",
      timestamp: new Date().toISOString()
    });

    expect(response.status).toBe("success");
    expect(response.action).toBe("music.play");
    expect(response.replyText.length).toBeGreaterThan(0);
  });

  it("supports coding-scene recommendation commands", async () => {
    const { musicAgentService } = createAgentContainer();

    await musicAgentService.handle({
      userId: "agent_u_005",
      sessionId: "agent_s_005",
      inputType: "text",
      text: "播放录音",
      source: "openclaw",
      timestamp: new Date().toISOString()
    });

    await musicAgentService.handle({
      userId: "agent_u_005",
      sessionId: "agent_s_005",
      inputType: "text",
      text: "收藏这首歌",
      source: "openclaw",
      timestamp: new Date().toISOString()
    });

    const response = await musicAgentService.handle({
      userId: "agent_u_005",
      sessionId: "agent_s_005",
      inputType: "text",
      text: "来点适合写代码的",
      source: "headset_voice",
      timestamp: new Date().toISOString()
    });

    expect(response.status).toBe("success");
    expect(response.action).toBe("music.play");
  });

  it("supports calm-scene recommendation commands", async () => {
    const { musicAgentService } = createAgentContainer();

    await musicAgentService.handle({
      userId: "agent_u_006",
      sessionId: "agent_s_006",
      inputType: "text",
      text: "播放录音",
      source: "openclaw",
      timestamp: new Date().toISOString()
    });

    await musicAgentService.handle({
      userId: "agent_u_006",
      sessionId: "agent_s_006",
      inputType: "text",
      text: "收藏这首歌",
      source: "openclaw",
      timestamp: new Date().toISOString()
    });

    const response = await musicAgentService.handle({
      userId: "agent_u_006",
      sessionId: "agent_s_006",
      inputType: "text",
      text: "来点安静的",
      source: "headset_voice",
      timestamp: new Date().toISOString()
    });

    expect(response.status).toBe("success");
    expect(response.action).toBe("music.play");
  });

  it("includes persona-aware recommendation reasoning", async () => {
    const service = new MusicAgentService({
      musicSkillHandler: {
        handle: async () => ({
          status: "success",
          intent: "music.play",
          replyText: "正在播放《夜色钢琴曲》。",
          payload: { trackTitle: "夜色钢琴曲" }
        })
      } as never,
      contextManager: {
        load: async () => ({
          userId: "agent_u_007",
          sessionId: "agent_s_007",
          preferences: {
            positiveCount: 0,
            negativeCount: 0,
            recentPositiveNotes: [],
            recentNegativeNotes: []
          },
          activeScene: "calm"
        })
      } as never,
      planner: {
        plan: () => ({
          type: "play_recommended",
          action: "agent.recommend.play",
          scene: "calm"
        })
      } as never,
      recommendationPlanner: {
        pickTrack: async () => ({
          id: "track_001",
          title: "夜色钢琴曲",
          artist: "Unknown",
          source: "local",
          playable: true,
          downloadable: true
        })
      } as never,
      preferenceMemory: {
        list: async () => []
      } as never,
      behaviorMemory: {
        record: async () => undefined
      } as never,
      sceneMemory: {
        getActiveScene: async () => "calm",
        setActiveScene: async () => undefined
      } as never,
      profile: {
        rootDir: "D:/fake-agent",
        identity: {
          id: "music-agent",
          name: "Midnight DJ",
          wakeWord: "小乐",
          templateId: "midnight_dj"
        },
        persona: {
          displayName: "夜航电台",
          tone: ["warm", "reflective"],
          style: ["short replies", "atmospheric language", "soft closing lines"],
          rawMarkdown: ""
        },
        runtimeConfig: {
          wakeWord: "小乐"
        },
        triggersMarkdown: ""
      }
    });

    const response = await service.handle({
      userId: "agent_u_007",
      sessionId: "agent_s_007",
      inputType: "text",
      text: "来点安静的",
      source: "panel",
      timestamp: new Date().toISOString()
    });

    expect(response.status).toBe("success");
    expect(response.reasoning).toContain("夜色钢琴曲");
    expect(response.replyText).toContain("夜航电台：");
    expect(response.replyText).toContain("慢慢听。");
    expect(response.persona?.templateId).toBe("midnight_dj");
    expect(response.payload?.recommendationReason).toBe(response.reasoning);
  });
});
