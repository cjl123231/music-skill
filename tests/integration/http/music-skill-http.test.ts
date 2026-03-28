import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

describe("Music HTTP server", () => {
  let server: import("node:http").Server;
  let baseUrl: string;
  const openClawHome = resolve("./.tmp-test-openclaw");
  const generatedAgentDir = join(openClawHome, "agents", "music-agent");
  const generatedAgentConfigDir = join(generatedAgentDir, "config");
  const libraryDir = resolve("./.tmp-test-library");
  const dbPath = "./data/test-http-server.json";

  beforeAll(async () => {
    process.env.MUSIC_STORAGE_DRIVER = "json";
    process.env.MUSIC_DB_PATH = dbPath;
    process.env.OPENCLAW_HOME = openClawHome;
    delete process.env.MUSIC_LIBRARY_DIR;
    rmSync(dbPath, { force: true });
    rmSync(openClawHome, { recursive: true, force: true });
    rmSync(libraryDir, { recursive: true, force: true });
    mkdirSync(generatedAgentConfigDir, { recursive: true });
    mkdirSync(libraryDir, { recursive: true });
    writeFileSync(join(libraryDir, "录音.mp3"), "fake-audio", "utf8");
    writeFileSync(join(libraryDir, "录音.lrc"), ["[00:01.00]第一句歌词", "[00:05.00]第二句歌词"].join("\n"), "utf8");
    writeFileSync(
      join(generatedAgentDir, "agent.json"),
      JSON.stringify({
        id: "music-agent",
        name: "夜航电台",
        description: "一个可编辑人格的本地音乐助手。",
        wakeWord: "小乐",
        templateId: "midnight_dj"
      }),
      "utf8"
    );
    writeFileSync(
      join(generatedAgentDir, "PERSONA.md"),
      ["## Name", "- 夜航电台", "", "## Role", "- 陪伴型音乐助手"].join("\n"),
      "utf8"
    );
    writeFileSync(join(generatedAgentDir, "TRIGGERS.md"), ["## Wake Word", "- 小乐"].join("\n"), "utf8");
    writeFileSync(
      join(generatedAgentConfigDir, "env.json"),
      JSON.stringify({
        musicLibraryDir: libraryDir,
        storageDriver: "json",
        panelPort: 3310,
        wakeWord: "小乐"
      }),
      "utf8"
    );
    vi.resetModules();

    const { createHttpServer } = await import("../../../src/interfaces/http/server.js");
    server = createHttpServer();

    await new Promise<void>((resolve) => {
      server.listen(0, "127.0.0.1", () => resolve());
    });

    const address = server.address();
    if (!address || typeof address === "string") {
      throw new Error("Failed to resolve server address.");
    }

    baseUrl = `http://127.0.0.1:${address.port}`;
  });

  afterAll(async () => {
    await new Promise<void>((resolve, reject) => {
      server.close((error) => {
        if (error) {
          reject(error);
          return;
        }
        resolve();
      });
    });

    rmSync(process.env.MUSIC_DB_PATH!, { force: true });
    rmSync(openClawHome, { recursive: true, force: true });
    rmSync(libraryDir, { recursive: true, force: true });
  });

  it("handles agent requests", async () => {
    const response = await fetch(`${baseUrl}/agent/music/handle`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userId: "u_001",
        sessionId: "s_001",
        inputType: "text",
        text: "播放录音",
        source: "openclaw"
      })
    });

    expect(response.status).toBe(200);
    const body = (await response.json()) as {
      status: string;
      action: string;
      replyText: string;
    };

    expect(body.status).toBe("success");
    expect(body.action).toBe("music.play");
    expect(body.replyText).toContain("录音");
  });

  it("keeps /skill/music/handle as compatibility route through agent", async () => {
    const response = await fetch(`${baseUrl}/skill/music/handle`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userId: "u_001",
        sessionId: "s_001",
        inputType: "text",
        text: "播放录音"
      })
    });

    expect(response.status).toBe(200);
    const body = (await response.json()) as {
      status: string;
      intent: string;
      replyText: string;
      payload?: { trackTitle?: string };
    };

    expect(body.status).toBe("success");
    expect(body.intent).toBe("music.play");
    expect(body.replyText).toContain("录音");
    expect(body.payload?.trackTitle).toBe("录音");
  });

  it("returns agent metadata in panel state", async () => {
    await fetch(`${baseUrl}/agent/music/handle`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userId: "panel-real-user",
        sessionId: "session-panel-1",
        inputType: "text",
        text: "播放录音",
        source: "panel"
      })
    });

    await fetch(`${baseUrl}/agent/music/handle`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userId: "panel-real-user",
        sessionId: "session-panel-1",
        inputType: "text",
        text: "收藏这首歌",
        source: "panel"
      })
    });

    const response = await fetch(`${baseUrl}/api/panel/state`);

    expect(response.status).toBe(200);
    const body = (await response.json()) as {
      agent: { name: string; wakeWord: string; description: string; templateId?: string };
      activeUserId: string;
      favoriteCount: number;
      isCurrentTrackFavorited: boolean;
      provider: { connected: boolean; libraryPath?: string };
    };

    expect(body.agent.name.length).toBeGreaterThan(0);
    expect(body.agent.wakeWord.length).toBeGreaterThan(0);
    expect(body.agent.description.length).toBeGreaterThan(0);
    expect(body.activeUserId).toBe("panel-real-user");
    expect(body.favoriteCount).toBe(1);
    expect(body.isCurrentTrackFavorited).toBe(true);
    expect(body.provider.connected).toBe(true);
    expect(body.provider.libraryPath).toBe(libraryDir);
    if (body.agent.templateId) {
      expect(body.agent.templateId.length).toBeGreaterThan(0);
    }
  });

  it("returns local lyrics in panel state when a matching lyric file exists", async () => {
    await fetch(`${baseUrl}/agent/music/handle`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userId: "lyrics-user",
        sessionId: "lyrics-session",
        inputType: "text",
        text: "播放录音",
        source: "panel"
      })
    });

    const response = await fetch(`${baseUrl}/api/panel/state`);
    expect(response.status).toBe(200);

    const body = (await response.json()) as {
      lyrics: { found: boolean; format?: string; lines: Array<{ text: string }> };
    };

    expect(body.lyrics.found).toBe(true);
    expect(body.lyrics.format).toBe("lrc");
    expect(body.lyrics.lines[0]?.text).toBe("第一句歌词");
  });

  it("returns 400 for invalid requests", async () => {
    const response = await fetch(`${baseUrl}/agent/music/handle`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: "u_001" })
    });

    expect(response.status).toBe(400);
    const body = (await response.json()) as { status: string };
    expect(body.status).toBe("error");
  });
});
