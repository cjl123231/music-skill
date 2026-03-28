import { createServer } from "node:http";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createAgentContainer } from "../../app/agent-container.js";
import { agentRequestSchema } from "../../agent/core/agent-dto.js";
import { getProviderStatus } from "../../infrastructure/providers/provider-status.js";
import { readFavoriteTracks, readStorageSnapshot } from "../../infrastructure/storage/sqlite/storage-factory.js";
import { skillRequestSchema } from "../openclaw/dto.js";
import { HttpRoutes } from "./routes.js";

const agentContainer = createAgentContainer();

function sendJson(res: import("node:http").ServerResponse, statusCode: number, body: unknown): void {
  res.statusCode = statusCode;
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
  res.setHeader("Content-Type", contentType);
  res.end(body);
}

function readUiFile(fileName: string): string {
  return readFileSync(resolve("ui", fileName), "utf8");
}

async function getPanelState() {
  const initialSnapshot = readStorageSnapshot();
  const activeUserId = initialSnapshot.latestSession?.userId ?? "panel-user";
  const { latestSession, latestDownloads } = readStorageSnapshot(activeUserId);
  const favorites = readFavoriteTracks(activeUserId);
  const playback = await agentContainer.provider.getNowPlaying();
  const libraryTracks = (await agentContainer.provider.listTracks()).slice(0, 20);
  const latestDownloadTitle = latestDownloads[0]?.trackTitle;
  const isCurrentTrackFavorited = Boolean(
    latestSession?.currentTrack && favorites.some((track) => track.id === latestSession.currentTrack?.id)
  );

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
    currentTrack: latestSession?.currentTrack ?? null,
    playbackStatusLabel: latestSession?.currentTrack ? "播放中" : "空闲",
    volumePercent: playback.volumePercent,
    feedbackText: latestDownloadTitle ? `最近下载完成：《${latestDownloadTitle}》` : "等待操作",
    downloads: latestDownloads,
    libraryTracks,
    favorites: favorites.slice(0, 8),
    favoriteCount: favorites.length,
    isCurrentTrackFavorited,
    provider: getProviderStatus({ musicLibraryDir: agentContainer.profile.runtimeConfig.musicLibraryDir }),
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
