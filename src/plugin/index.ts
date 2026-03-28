import { Type } from "@sinclair/typebox";
import { musicControlParameters, executeMusicControl } from "./music-control.tool.js";

export default {
  id: "music-skill",
  name: "Music Skill",
  description: "Registers a music control tool and bundles the Music Skill instructions.",
  configSchema: Type.Object({}, { additionalProperties: true }),
  register(api: {
    registerTool: (definition: {
      name: string;
      description: string;
      parameters: typeof musicControlParameters;
      execute: (id: string, params: typeof musicControlParameters extends infer _ ? any : never) => Promise<unknown>;
    }, options?: { optional?: boolean }) => void;
  }) {
    api.registerTool(
      {
        name: "music_control",
        description:
          "Control music playback, favorite the current track, add the current track to a playlist, download it, or inspect download history.",
        parameters: musicControlParameters,
        async execute(_id: string, params: unknown) {
          return executeMusicControl(params as Parameters<typeof executeMusicControl>[0]);
        }
      },
      { optional: true }
    );
  }
};
