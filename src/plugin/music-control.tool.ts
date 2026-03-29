import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
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
        Type.Literal("launch_agent"),
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
      { description: "Music agent action to execute." }
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
      return params.text?.trim() || "\u64ad\u653e\u6674\u5929";
    case "pause":
      return "\u6682\u505c";
    case "resume":
      return "\u7ee7\u7eed\u64ad\u653e";
    case "next":
      return "\u4e0b\u4e00\u9996";
    case "previous":
      return "\u4e0a\u4e00\u9996";
    case "now_playing":
      return "\u73b0\u5728\u64ad\u653e\u7684\u662f\u4ec0\u4e48";
    case "set_volume":
      return `\u97f3\u91cf\u8c03\u5230 ${params.volumePercent ?? 50}%`;
    case "favorite_current":
      return "\u6536\u85cf\u8fd9\u9996\u6b4c";
    case "add_current_to_playlist":
      return `\u628a\u8fd9\u9996\u6b4c\u52a0\u5165${params.playlistName ?? "\u9ed8\u8ba4"}\u6b4c\u5355`;
    case "download_current":
      return "\u4e0b\u8f7d\u8fd9\u9996\u6b4c";
    case "download_status":
      return "\u4e0b\u8f7d\u597d\u4e86\u6ca1";
    case "list_downloads":
      return "\u67e5\u770b\u4e0b\u8f7d\u5217\u8868";
    case "play_by_preference":
      return "\u6309\u6211\u7684\u559c\u597d\u64ad\u653e";
    case "launch_agent":
      return "/music";
  }
}

function launchAgent(): { replyText: string; panelUrl: string } {
  const projectRoot = resolve(process.cwd());
  const port = process.env.DESKTOP_PLAYER_PORT ?? process.env.PORT ?? "3330";
  const panelUrl = `http://127.0.0.1:${port}/panel`;

  if (process.platform === "win32") {
    const desktopScriptPath = resolve(projectRoot, "scripts", "start-desktop.ps1");
    const trayScriptPath = resolve(projectRoot, "scripts", "start-tray.ps1");
    const scriptPath = existsSync(desktopScriptPath)
      ? desktopScriptPath
      : existsSync(trayScriptPath)
        ? trayScriptPath
        : resolve(projectRoot, "scripts", "start-assistant.ps1");

    if (!existsSync(scriptPath)) {
      throw new AppError("No Windows startup script was found for XiaoLe.", ErrorCodes.InvalidInput);
    }

    spawn("powershell.exe", ["-NoProfile", "-ExecutionPolicy", "Bypass", "-File", scriptPath], {
      cwd: projectRoot,
      detached: true,
      stdio: "ignore",
      windowsHide: true,
      env: { ...process.env, PORT: port, DESKTOP_PLAYER_PORT: port }
    }).unref();

    return {
      replyText: `\u5c0f\u4e50\u6b63\u5728\u540e\u53f0\u542f\u52a8\u684c\u9762\u64ad\u653e\u5668\u3002\u6253\u5f00 ${panelUrl} \u5373\u53ef\u4f7f\u7528\uff1b\u5982\u679c\u684c\u9762\u7a97\u53e3\u5df2\u7ecf\u5f39\u51fa\uff0c\u76f4\u63a5\u5728\u684c\u9762\u7aef\u64cd\u4f5c\u5373\u53ef\u3002`,
      panelUrl
    };
  }

  const scriptPath = resolve(projectRoot, "scripts", "start-assistant.sh");
  if (!existsSync(scriptPath)) {
    throw new AppError("start-assistant.sh was not found.", ErrorCodes.InvalidInput);
  }

  spawn("bash", [scriptPath], {
    cwd: projectRoot,
    detached: true,
    stdio: "ignore",
    env: { ...process.env, PORT: port, DESKTOP_PLAYER_PORT: port }
  }).unref();

  return {
    replyText: `\u5c0f\u4e50\u6b63\u5728\u540e\u53f0\u542f\u52a8\u684c\u9762\u64ad\u653e\u5668\u3002\u6253\u5f00 ${panelUrl} \u5373\u53ef\u4f7f\u7528\u3002`,
    panelUrl
  };
}

export async function executeMusicControl(params: MusicControlParams) {
  if (params.action === "launch_agent") {
    const launched = launchAgent();
    return {
      content: [
        {
          type: "text" as const,
          text: launched.replyText
        }
      ],
      structuredContent: {
        status: "success",
        action: "music.launch_agent",
        replyText: launched.replyText,
        payload: { panelUrl: launched.panelUrl }
      }
    };
  }

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
