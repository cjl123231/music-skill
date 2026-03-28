import { existsSync, readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join, resolve } from "node:path";
import type {
  GeneratedAgentIdentity,
  GeneratedAgentPersona,
  GeneratedAgentProfile,
  GeneratedAgentRuntimeConfig
} from "./generated-agent.types.js";

interface AgentJsonShape {
  id?: string;
  name?: string;
  description?: string;
  wakeWord?: string;
  templateId?: string;
}

interface EnvJsonShape {
  musicLibraryDir?: string;
  downloadDir?: string;
  storageDriver?: string;
  panelPort?: number;
  wakeWord?: string;
}

function resolveOpenClawHome(): string {
  if (process.env.OPENCLAW_HOME) {
    return resolve(process.env.OPENCLAW_HOME);
  }

  return resolve(join(homedir(), ".openclaw"));
}

function defaultRootDir(): string {
  return join(resolveOpenClawHome(), "agents", "music-agent");
}

function readTextIfExists(filePath: string): string {
  if (!existsSync(filePath)) {
    return "";
  }

  return readFileSync(filePath, "utf8");
}

function readJsonIfExists<T>(filePath: string): T | null {
  if (!existsSync(filePath)) {
    return null;
  }

  return JSON.parse(readFileSync(filePath, "utf8")) as T;
}

function parseSectionLines(markdown: string, heading: string): string[] {
  const escaped = heading.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = markdown.match(new RegExp(`## ${escaped}\\r?\\n([\\s\\S]*?)(?:\\r?\\n## |$)`));
  if (!match) {
    return [];
  }

  return match[1]
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => line.replace(/^-\s*/, "").trim())
    .filter(Boolean);
}

function parseSingleValue(markdown: string, heading: string): string | undefined {
  return parseSectionLines(markdown, heading)[0];
}

function parsePersona(markdown: string, fallbackName: string): GeneratedAgentPersona {
  return {
    displayName: parseSingleValue(markdown, "Name") ?? fallbackName,
    role: parseSingleValue(markdown, "Role"),
    tone: parseSectionLines(markdown, "Tone"),
    style: parseSectionLines(markdown, "Style"),
    rawMarkdown: markdown
  };
}

function detectWakeWord(triggersMarkdown: string, runtimeConfig: EnvJsonShape | null, agentJson: AgentJsonShape | null): string {
  const markdownWakeWord = parseSingleValue(triggersMarkdown, "Wake Word");
  return markdownWakeWord ?? runtimeConfig?.wakeWord ?? agentJson?.wakeWord ?? "音乐控制";
}

export function loadGeneratedAgentProfile(rootDir = defaultRootDir()): GeneratedAgentProfile {
  const resolvedRoot = resolve(rootDir);
  const agentJson = readJsonIfExists<AgentJsonShape>(join(resolvedRoot, "agent.json"));
  const envJson = readJsonIfExists<EnvJsonShape>(join(resolvedRoot, "config", "env.json"));
  const personaMarkdown = readTextIfExists(join(resolvedRoot, "PERSONA.md"));
  const triggersMarkdown = readTextIfExists(join(resolvedRoot, "TRIGGERS.md"));

  const identity: GeneratedAgentIdentity = {
    id: agentJson?.id ?? "music-agent",
    name: agentJson?.name ?? "Music Agent",
    description: agentJson?.description,
    wakeWord: detectWakeWord(triggersMarkdown, envJson, agentJson),
    templateId: agentJson?.templateId
  };

  const persona = parsePersona(personaMarkdown, identity.name);
  const runtimeConfig: GeneratedAgentRuntimeConfig = {
    musicLibraryDir: envJson?.musicLibraryDir,
    downloadDir: envJson?.downloadDir,
    storageDriver: envJson?.storageDriver,
    panelPort: envJson?.panelPort,
    wakeWord: identity.wakeWord
  };

  return {
    rootDir: resolvedRoot,
    identity,
    persona,
    runtimeConfig,
    triggersMarkdown
  };
}
