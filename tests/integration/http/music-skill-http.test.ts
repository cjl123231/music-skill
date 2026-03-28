import { rmSync } from "node:fs";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

describe("Music HTTP server", () => {
  let server: import("node:http").Server;
  let baseUrl: string;

  beforeAll(async () => {
    process.env.MUSIC_STORAGE_DRIVER = "json";
    process.env.MUSIC_DB_PATH = "./data/test-http-server.json";
    rmSync(process.env.MUSIC_DB_PATH, { force: true });
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
  });

  it("handles agent requests", async () => {
    const response = await fetch(`${baseUrl}/agent/music/handle`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userId: "u_001",
        sessionId: "s_001",
        inputType: "text",
        text: "播放周杰伦的晴天",
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
    expect(body.replyText).toContain("晴天");
  });

  it("keeps /skill/music/handle as compatibility route through agent", async () => {
    const response = await fetch(`${baseUrl}/skill/music/handle`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userId: "u_001",
        sessionId: "s_001",
        inputType: "text",
        text: "播放周杰伦的晴天"
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
    expect(body.replyText).toContain("晴天");
    expect(body.payload?.trackTitle).toBe("晴天");
  });

  it("returns agent metadata in panel state", async () => {
    const response = await fetch(`${baseUrl}/api/panel/state`);

    expect(response.status).toBe(200);
    const body = (await response.json()) as {
      agent: { name: string; wakeWord: string; description: string; templateId?: string };
    };

    expect(body.agent.name.length).toBeGreaterThan(0);
    expect(body.agent.wakeWord.length).toBeGreaterThan(0);
    expect(body.agent.description.length).toBeGreaterThan(0);
    if (body.agent.templateId) {
      expect(body.agent.templateId.length).toBeGreaterThan(0);
    }
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
