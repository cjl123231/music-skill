import type { Static } from "@sinclair/typebox";
import { Type } from "@sinclair/typebox";
import { createAgentContainer } from "../app/agent-container.js";
import { AppError } from "../shared/errors/app-error.js";
import { ErrorCodes } from "../shared/errors/error-codes.js";

const agentContainer = createAgentContainer();

export const musicControlParameters = Type.Object(
  {
    action: Type.Union(
      [
        Type.Literal("play"),
        Type.Literal("pause"),
        Type.Literal("resume"),
        Type.Literal("next"),
        Type.Literal("previous"),
        Type.Literal("now_playing"),
        Type.Literal("set_volume"),
        Type.Literal("favorite_current"),
        Type.Literal("add_current_to_playlist"),
        Type.Literal("download_current"),
        Type.Literal("download_status"),
        Type.Literal("list_downloads"),
        Type.Literal("play_by_preference")
      ],
      { description: "Music action to execute." }
    ),
    text: Type.Optional(Type.String({ description: "Natural-language command, mainly for play." })),
    playlistName: Type.Optional(Type.String({ description: "Target playlist name for add_current_to_playlist." })),
    volumePercent: Type.Optional(
      Type.Number({ minimum: 0, maximum: 100, description: "Target volume percent for set_volume." })
    ),
    userId: Type.Optional(Type.String({ description: "OpenClaw user identifier." })),
    sessionId: Type.Optional(Type.String({ description: "Conversation or thread identifier." }))
  },
  { additionalProperties: false }
);

export type MusicControlParams = Static<typeof musicControlParameters>;

function resolveRequiredIdentity(params: MusicControlParams): { userId: string; sessionId: string } {
  if (!params.userId?.trim() || !params.sessionId?.trim()) {
    throw new AppError(
      "music_control requires both userId and sessionId from the host runtime.",
      ErrorCodes.InvalidInput
    );
  }

  return {
    userId: params.userId.trim(),
    sessionId: params.sessionId.trim()
  };
}

function buildCommand(params: MusicControlParams): string {
  switch (params.action) {
    case "play":
      return params.text?.trim() || "播放晴天";
    case "pause":
      return "暂停";
    case "resume":
      return "继续播放";
    case "next":
      return "下一首";
    case "previous":
      return "上一首";
    case "now_playing":
      return "现在播放的是什么";
    case "set_volume":
      return `音量调到 ${params.volumePercent ?? 50}%`;
    case "favorite_current":
      return "收藏这首歌";
    case "add_current_to_playlist":
      return `把这首歌加入${params.playlistName ?? "默认"}歌单`;
    case "download_current":
      return "下载这首歌";
    case "download_status":
      return "下载好了没";
    case "list_downloads":
      return "查看下载列表";
    case "play_by_preference":
      return "按我的喜好播放";
  }
}

export async function executeMusicControl(params: MusicControlParams) {
  const identity = resolveRequiredIdentity(params);
  const response = await agentContainer.musicAgentService.handle({
    userId: identity.userId,
    sessionId: identity.sessionId,
    inputType: "text",
    text: buildCommand(params),
    source: "openclaw",
    timestamp: new Date().toISOString()
  });

  return {
    content: [
      {
        type: "text" as const,
        text: response.replyText
      }
    ],
    structuredContent: response
  };
}
