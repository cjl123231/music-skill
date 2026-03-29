import { spawn, spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { createServer } from "node:http";
import { resolve } from "node:path";
import { createAgentContainer } from "../../app/agent-container.js";
import { agentRequestSchema } from "../../agent/core/agent-dto.js";
import { readLocalLyrics } from "../../infrastructure/lyrics/local-lyrics.js";
import { getProviderStatus } from "../../infrastructure/providers/provider-status.js";
import { readFavoriteTracks, readStorageSnapshot } from "../../infrastructure/storage/sqlite/storage-factory.js";
import { skillRequestSchema } from "../openclaw/dto.js";
import { HttpRoutes } from "./routes.js";

const agentContainer = createAgentContainer();

function setNoCache(res: import("node:http").ServerResponse): void {
  res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
  res.setHeader("Pragma", "no-cache");
  res.setHeader("Expires", "0");
}

function sendJson(res: import("node:http").ServerResponse, statusCode: number, body: unknown): void {
  res.statusCode = statusCode;
  setNoCache(res);
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.end(JSON.stringify(body));
}

function sendText(
  res: import("node:http").ServerResponse,
  statusCode: number,
  contentType: string,
  body: string
): void {
  res.statusCode = statusCode;
  setNoCache(res);
  res.setHeader("Content-Type", contentType);
  res.end(body);
}

function readUiFile(fileName: string): string {
  return readFileSync(resolve("ui", fileName), "utf8");
}

function getPlaybackStatusLabel(status: "idle" | "playing" | "paused"): string {
  if (status === "playing") return "播放中";
  if (status === "paused") return "已暂停";
  return "空闲";
}

function getVoiceScriptPath() {
  return resolve("scripts", "start-voice.ps1");
}

function getVoiceStatus() {
  if (process.platform !== "win32") {
    return {
      supported: false,
      running: false,
      label: "当前平台暂不支持从桌面播放器管理本地语音。"
    };
  }

  const command = `
$patterns = @("scripts\\\\start-voice.ps1","pnpm start:voice")
$processes = Get-CimInstance Win32_Process -ErrorAction SilentlyContinue | Where-Object {
  $commandLine = $_.CommandLine
  if (-not $commandLine) { return $false }
  foreach ($pattern in $patterns) {
    if ($commandLine -like "*$pattern*") { return $true }
  }
  return $false
}
($processes | Select-Object -ExpandProperty ProcessId -Unique) -join ","
`;

  const result = spawnSync("powershell.exe", ["-NoProfile", "-Command", command], {
    encoding: "utf8"
  });
  const stdout = (result.stdout ?? "").trim();
  const processIds = stdout
    ? stdout
        .split(",")
        .map((value) => value.trim())
        .filter(Boolean)
    : [];

  return {
    supported: true,
    running: processIds.length > 0,
    processIds,
    label: processIds.length > 0 ? "本地语音已在后台运行" : "本地语音未启动"
  };
}

function launchLocalVoiceAgent() {
  if (process.platform !== "win32") {
    return {
      status: "error",
      action: "agent.voice_launch_failed",
      replyText: "当前仅支持在 Windows 上从桌面播放器启动本地语音。"
    };
  }

  const existing = getVoiceStatus();
  if (existing.running) {
    return {
      status: "ok",
      action: "agent.voice_already_running",
      replyText: "本地语音已经在后台运行。直接对麦克风说“小乐，播放普通朋友”即可。"
    };
  }

  const child = spawn(
    "powershell.exe",
    ["-NoProfile", "-ExecutionPolicy", "Bypass", "-File", getVoiceScriptPath()],
    {
      cwd: resolve("."),
      env: { ...process.env, PORT: process.env.PORT ?? "3320" },
      detached: true,
      stdio: "ignore",
      windowsHide: true
    }
  );

  child.unref();

  return {
    status: "ok",
    action: "agent.voice_launch_requested",
    replyText: "本地语音监听已在后台启动。现在可以直接对麦克风说“小乐，播放普通朋友”。"
  };
}

function stopLocalVoiceAgent() {
  if (process.platform !== "win32") {
    return {
      status: "error",
      action: "agent.voice_stop_failed",
      replyText: "当前仅支持在 Windows 上从桌面播放器停止本地语音。"
    };
  }

  const status = getVoiceStatus();
  if (!status.running) {
    return {
      status: "ok",
      action: "agent.voice_not_running",
      replyText: "本地语音当前没有运行。"
    };
  }

  for (const processId of status.processIds ?? []) {
    try {
      process.kill(Number(processId));
    } catch {
      // ignore individual termination failures
    }
  }

  return {
    status: "ok",
    action: "agent.voice_stopped",
    replyText: "本地语音已停止。"
  };
}

async function getPanelState() {
  const initialSnapshot = readStorageSnapshot();
  const activeUserId = initialSnapshot.latestSession?.userId ?? "panel-user";
  const { latestSession, latestDownloads } = readStorageSnapshot(activeUserId);
  const favorites = readFavoriteTracks(activeUserId);
  const playback = await agentContainer.provider.getNowPlaying();
  const currentTrack = playback.track ?? latestSession?.currentTrack ?? null;
  const libraryTracks = await agentContainer.provider.listTracks();
  const latestDownloadTitle = latestDownloads[0]?.trackTitle;
  const isCurrentTrackFavorited = Boolean(
    currentTrack && favorites.some((track) => track.id === currentTrack.id)
  );
  const lyrics = readLocalLyrics(currentTrack?.filePath);
  const playbackStatus = currentTrack ? playback.status : "idle";
  const volumePercent = playback.volumePercent ?? latestSession?.volumePercent ?? 50;

  return {
    agent: {
      name: agentContainer.profile.persona.displayName ?? agentContainer.profile.identity.name,
      description:
        agentContainer.profile.identity.description ??
        agentContainer.profile.persona.role ??
        "一个可编辑人格的本地音乐助手。",
      wakeWord: agentContainer.profile.identity.wakeWord,
      templateId: agentContainer.profile.identity.templateId
    },
    currentTrack,
    playbackStatus,
    playbackStatusLabel: getPlaybackStatusLabel(playbackStatus),
    volumePercent,
    feedbackText: latestDownloadTitle ? `最近下载完成：《${latestDownloadTitle}》` : "等待操作",
    downloads: latestDownloads,
    libraryTracks,
    favorites: favorites.slice(0, 8),
    favoriteCount: favorites.length,
    isCurrentTrackFavorited,
    lyrics,
    localVoice: getVoiceStatus(),
    provider: getProviderStatus({
      musicLibraryDir: agentContainer.profile.runtimeConfig.musicLibraryDir
    }),
    activeUserId,
    debug: process.env.MUSIC_SKILL_DEBUG === "1"
  };
}

async function handleAgentPayload(raw: string) {
  const parsed = agentRequestSchema.parse(JSON.parse(raw));
  return agentContainer.musicAgentService.handle({
    ...parsed,
    timestamp: parsed.timestamp ?? new Date().toISOString()
  });
}

export function createHttpServer() {
  return createServer((req, res) => {
    if (req.method === "GET" && req.url === "/panel") {
      sendText(res, 200, "text/html; charset=utf-8", readUiFile("panel.html"));
      return;
    }

    if (req.method === "GET" && req.url === "/panel/styles.css") {
      sendText(res, 200, "text/css; charset=utf-8", readUiFile("styles.css"));
      return;
    }

    if (req.method === "GET" && req.url === "/panel/app.js") {
      sendText(res, 200, "application/javascript; charset=utf-8", readUiFile("app.js"));
      return;
    }

    if (req.method === "GET" && req.url === "/api/panel/state") {
      void (async () => {
        try {
          sendJson(res, 200, await getPanelState());
        } catch (error) {
          const message = error instanceof Error ? error.message : "Unknown error.";
          sendJson(res, 500, {
            status: "error",
            action: "panel.state_failed",
            replyText: message
          });
        }
      })();
      return;
    }

    if (req.method === "POST" && req.url === "/api/agent/voice/start") {
      try {
        sendJson(res, 200, launchLocalVoiceAgent());
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unknown error.";
        sendJson(res, 500, {
          status: "error",
          action: "agent.voice_launch_failed",
          replyText: message
        });
      }
      return;
    }

    if (req.method === "POST" && req.url === "/api/agent/voice/stop") {
      try {
        sendJson(res, 200, stopLocalVoiceAgent());
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unknown error.";
        sendJson(res, 500, {
          status: "error",
          action: "agent.voice_stop_failed",
          replyText: message
        });
      }
      return;
    }

    if (
      req.method === "POST" &&
      (req.url === HttpRoutes.HandleMusicAgent || req.url === HttpRoutes.HandleMusicSkill)
    ) {
      const chunks: Buffer[] = [];

      req.on("data", (chunk) => {
        chunks.push(Buffer.from(chunk));
      });

      req.on("end", async () => {
        try {
          const raw = Buffer.concat(chunks).toString("utf8");

          if (req.url === HttpRoutes.HandleMusicSkill) {
            const parsed = skillRequestSchema.parse(JSON.parse(raw));
            const response = await agentContainer.musicAgentService.handle({
              userId: parsed.userId,
              sessionId: parsed.sessionId,
              inputType: parsed.inputType,
              text: parsed.text,
              source: "openclaw",
              timestamp: new Date().toISOString()
            });

            sendJson(res, 200, {
              status: response.status,
              intent: response.action,
              replyText: response.replyText,
              payload: response.payload,
              reasoning: response.reasoning,
              persona: response.persona
            });
            return;
          }

          const response = await handleAgentPayload(raw);
          sendJson(res, 200, response);
        } catch (error) {
          const message = error instanceof Error ? error.message : "Unknown error.";

          if (req.url === HttpRoutes.HandleMusicSkill) {
            sendJson(res, 400, {
              status: "error",
              intent: "music.unsupported",
              replyText: message,
              errorCode: "INVALID_INPUT"
            });
            return;
          }

          sendJson(res, 400, {
            status: "error",
            action: "agent.invalid_input",
            replyText: message
          });
        }
      });

      return;
    }

    sendJson(res, 404, {
      status: "error",
      intent: "music.unsupported",
      replyText: "Route not found.",
      errorCode: "INVALID_INPUT"
    });
  });
}
