import { generateMusicAgent } from "../src/agent/generator/music-agent-generator.js";
import { listPersonaTemplateIds } from "../src/agent/generator/persona-templates.js";

function readArg(flag: string): string | undefined {
  const index = process.argv.indexOf(flag);
  if (index === -1) return undefined;
  return process.argv[index + 1];
}

if (process.argv.includes("--list-templates")) {
  console.log("Available persona templates:");
  for (const templateId of listPersonaTemplateIds()) {
    console.log(`- ${templateId}`);
  }
  process.exit(0);
}

const result = generateMusicAgent({
  rootDir: readArg("--root"),
  agentId: readArg("--id"),
  agentName: readArg("--name"),
  personaName: readArg("--persona"),
  wakeWord: readArg("--wake-word"),
  templateId: readArg("--template"),
  force: process.argv.includes("--force")
});

console.log(`Music Agent generated at: ${result.rootDir}`);
for (const file of result.files) {
  console.log(`${file.created ? "created" : "kept"}: ${file.path}`);
}
