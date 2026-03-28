import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { afterEach, describe, expect, it } from "vitest";
import { loadGeneratedAgentProfile } from "../../../src/agent/runtime/generated-agent.loader.js";

const tempRoots: string[] = [];

describe("loadGeneratedAgentProfile", () => {
  afterEach(() => {
    while (tempRoots.length > 0) {
      const dir = tempRoots.pop();
      if (dir) {
        rmSync(dir, { recursive: true, force: true });
      }
    }
  });

  it("loads identity, persona, and wake word from generated files", () => {
    const root = mkdtempSync(join(tmpdir(), "generated-agent-"));
    tempRoots.push(root);
    mkdirSync(join(root, "config"), { recursive: true });

    writeFileSync(
      join(root, "agent.json"),
      JSON.stringify(
        {
          id: "music-agent",
          name: "Midnight DJ",
          description: "Night radio",
          wakeWord: "小乐",
          templateId: "midnight_dj"
        },
        null,
        2
      ),
      "utf8"
    );
    writeFileSync(
      join(root, "PERSONA.md"),
      "# Persona\n\n## Name\n\n夜航电台\n\n## Role\n\nA late night music companion\n\n## Tone\n\n- warm\n- calm\n\n## Style\n\n- short replies\n- soft closing lines\n",
      "utf8"
    );
    writeFileSync(join(root, "TRIGGERS.md"), "# Triggers\n\n## Wake Word\n\n小乐\n", "utf8");
    writeFileSync(join(root, "config", "env.json"), JSON.stringify({ panelPort: 3390, wakeWord: "小乐" }, null, 2), "utf8");

    const profile = loadGeneratedAgentProfile(root);

    expect(profile.identity.name).toBe("Midnight DJ");
    expect(profile.identity.templateId).toBe("midnight_dj");
    expect(profile.persona.displayName).toBe("夜航电台");
    expect(profile.identity.wakeWord).toBe("小乐");
    expect(profile.runtimeConfig.panelPort).toBe(3390);
    expect(profile.persona.tone).toContain("warm");
  });
});
