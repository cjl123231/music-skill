import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

const metadataModuleUrl = pathToFileURL(resolve(process.cwd(), "node_modules/music-metadata/lib/index.js")).href;

export interface ParsedAudioMetadata {
  common: {
    title?: string;
    artist?: string;
    album?: string;
  };
  format: {
    duration?: number;
  };
}

export async function parseAudioMetadata(filePath: string): Promise<ParsedAudioMetadata> {
  const module = (await import(metadataModuleUrl)) as {
    parseFile: (input: string) => Promise<ParsedAudioMetadata>;
  };

  return module.parseFile(filePath);
}
