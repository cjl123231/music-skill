import { Type } from "@sinclair/typebox";
import { musicControlParameters, executeMusicControl } from "./music-control.tool.js";

export default {
  id: "music-skill",
  name: "XiaoLe Music Agent",
  description: "Registers XiaoLe as a music agent entry and exposes the music control execution tool.",
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
          "Launch XiaoLe or control playback, favorites, playlists, downloads, and preference-based music actions.",
        parameters: musicControlParameters,
        async execute(_id: string, params: unknown) {
          return executeMusicControl(params as Parameters<typeof executeMusicControl>[0]);
        }
      },
      { optional: true }
    );
  }
};
