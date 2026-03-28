import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { afterEach, describe, expect, it } from "vitest";
import { generateMusicAgent } from "../../../src/agent/generator/music-agent-generator.js";

const tempRoots: string[] = [];

describe("generateMusicAgent", () => {
  afterEach(() => {
    while (tempRoots.length > 0) {
      const dir = tempRoots.pop();
      if (dir) {
        rmSync(dir, { recursive: true, force: true });
      }
    }
  });

  it("creates the expected agent scaffold", () => {
    const root = mkdtempSync(join(tmpdir(), "music-agent-"));
    tempRoots.push(root);

    const result = generateMusicAgent({
      rootDir: join(root, "agents", "music-agent"),
      agentName: "Midnight DJ",
      personaName: "夜航电台",
      wakeWord: "小乐"
    });

    expect(existsSync(join(result.rootDir, "agent.json"))).toBe(true);
    expect(existsSync(join(result.rootDir, "PERSONA.md"))).toBe(true);
    expect(existsSync(join(result.rootDir, "config", "env.json"))).toBe(true);

    const persona = readFileSync(join(result.rootDir, "PERSONA.md"), "utf8");
    expect(persona).toContain("夜航电台");

    const triggers = readFileSync(join(result.rootDir, "TRIGGERS.md"), "utf8");
    expect(triggers).toContain("小乐");
  });

  it("supports persona templates", () => {
    const root = mkdtempSync(join(tmpdir(), "music-agent-"));
    tempRoots.push(root);

    const result = generateMusicAgent({
      rootDir: join(root, "agents", "music-agent"),
      templateId: "study_buddy"
    });

    const persona = readFileSync(join(result.rootDir, "PERSONA.md"), "utf8");
    const triggers = readFileSync(join(result.rootDir, "TRIGGERS.md"), "utf8");
    const agentJson = readFileSync(join(result.rootDir, "agent.json"), "utf8");

    expect(persona).toContain("学习搭子");
    expect(triggers).toContain("开始专注");
    expect(agentJson).toContain('"templateId": "study_buddy"');
  });

  it("does not overwrite existing persona files unless force is enabled", () => {
    const root = mkdtempSync(join(tmpdir(), "music-agent-"));
    tempRoots.push(root);
    const agentRoot = join(root, "agents", "music-agent");

    generateMusicAgent({ rootDir: agentRoot, personaName: "初始人格" });
    generateMusicAgent({ rootDir: agentRoot, personaName: "后续人格" });

    const persona = readFileSync(join(agentRoot, "PERSONA.md"), "utf8");
    expect(persona).toContain("初始人格");

    generateMusicAgent({ rootDir: agentRoot, personaName: "强制人格", force: true });
    const forcedPersona = readFileSync(join(agentRoot, "PERSONA.md"), "utf8");
    expect(forcedPersona).toContain("强制人格");
  });
});
