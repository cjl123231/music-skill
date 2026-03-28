import { DialogueManager } from "../../application/dialogue/dialogue-manager.js";
import { routeIntent } from "../../application/intents/intent-router.js";
import { IntentTypes } from "../../application/intents/intent-types.js";
import {
  buildDownloadReply,
  buildDownloadListReply,
  buildDownloadStatusReply,
  buildFavoriteReply,
  buildFavoriteListReply,
  buildPlaybackReply,
  buildPlaylistReply,
  buildVolumeReply
} from "../../application/responders/response-builder.js";
import { AddFavoriteUseCase } from "../../application/use-cases/add-favorite.use-case.js";
import { AddTrackToPlaylistUseCase } from "../../application/use-cases/add-track-to-playlist.use-case.js";
import { DownloadTrackUseCase } from "../../application/use-cases/download-track.use-case.js";
import { GetDownloadStatusUseCase } from "../../application/use-cases/get-download-status.use-case.js";
import { extractSlots } from "../../application/slots/slot-extractor.js";
import { ListFavoritesUseCase } from "../../application/use-cases/list-favorites.use-case.js";
import { ListDownloadsUseCase } from "../../application/use-cases/list-downloads.use-case.js";
import { NextTrackUseCase } from "../../application/use-cases/next-track.use-case.js";
import { NowPlayingUseCase } from "../../application/use-cases/now-playing.use-case.js";
import { PauseMusicUseCase } from "../../application/use-cases/pause-music.use-case.js";
import { PlayFavoriteMusicUseCase } from "../../application/use-cases/play-favorite-music.use-case.js";
import { PlayMusicUseCase } from "../../application/use-cases/play-music.use-case.js";
import { PreviousTrackUseCase } from "../../application/use-cases/previous-track.use-case.js";
import { ResumeMusicUseCase } from "../../application/use-cases/resume-music.use-case.js";
import { SetVolumeUseCase } from "../../application/use-cases/set-volume.use-case.js";
import { AppError } from "../../shared/errors/app-error.js";
import { ErrorCodes } from "../../shared/errors/error-codes.js";
import type { SkillRequest, SkillResponse } from "./dto.js";

export interface MusicSkillDependencies {
  dialogueManager: DialogueManager;
  playMusic: PlayMusicUseCase;
  playFavoriteMusic: PlayFavoriteMusicUseCase;
  pauseMusic: PauseMusicUseCase;
  resumeMusic: ResumeMusicUseCase;
  nextTrack: NextTrackUseCase;
  previousTrack: PreviousTrackUseCase;
  nowPlaying: NowPlayingUseCase;
  setVolume: SetVolumeUseCase;
  addFavorite: AddFavoriteUseCase;
  listFavorites: ListFavoritesUseCase;
  addTrackToPlaylist: AddTrackToPlaylistUseCase;
  downloadTrack: DownloadTrackUseCase;
  getDownloadStatus: GetDownloadStatusUseCase;
  listDownloads: ListDownloadsUseCase;
}

export class MusicSkillHandler {
  constructor(private readonly deps: MusicSkillDependencies) {}

  async handle(request: SkillRequest): Promise<SkillResponse> {
    try {
      const intent = routeIntent(request.text);
      const slots = extractSlots(request.text, intent);
      const context = await this.deps.dialogueManager.getOrCreate(request.sessionId, request.userId);

      switch (intent) {
        case IntentTypes.Play: {
          const result = slots.favoriteOnly
            ? await this.deps.playFavoriteMusic.execute({
                userId: request.userId,
                keyword: slots.keyword,
                artistName: slots.artistName,
                context
              })
            : await this.deps.playMusic.execute({
                keyword: slots.keyword,
                artistName: slots.artistName,
                context
              });
          await this.deps.dialogueManager.save(result.context);
          return {
            status: "success",
            intent,
            replyText: buildPlaybackReply(result.playback),
            payload: {
              playbackStatus: result.playback.status,
              trackId: result.playback.track?.id,
              trackTitle: result.playback.track?.title,
              artistName: result.playback.track?.artist
            }
          };
        }

        case IntentTypes.Pause: {
          const playback = await this.deps.pauseMusic.execute();
          return {
            status: "success",
            intent,
            replyText: buildPlaybackReply(playback),
            payload: {
              playbackStatus: playback.status,
              trackId: playback.track?.id,
              trackTitle: playback.track?.title,
              artistName: playback.track?.artist
            }
          };
        }

        case IntentTypes.Resume: {
          const playback = await this.deps.resumeMusic.execute();
          return {
            status: "success",
            intent,
            replyText: buildPlaybackReply(playback),
            payload: {
              playbackStatus: playback.status,
              trackId: playback.track?.id,
              trackTitle: playback.track?.title,
              artistName: playback.track?.artist
            }
          };
        }

        case IntentTypes.Next: {
          const playback = await this.deps.nextTrack.execute();
          return {
            status: "success",
            intent,
            replyText: buildPlaybackReply(playback),
            payload: {
              playbackStatus: playback.status,
              trackId: playback.track?.id,
              trackTitle: playback.track?.title,
              artistName: playback.track?.artist
            }
          };
        }

        case IntentTypes.Previous: {
          const playback = await this.deps.previousTrack.execute();
          return {
            status: "success",
            intent,
            replyText: buildPlaybackReply(playback),
            payload: {
              playbackStatus: playback.status,
              trackId: playback.track?.id,
              trackTitle: playback.track?.title,
              artistName: playback.track?.artist
            }
          };
        }

        case IntentTypes.NowPlaying: {
          const playback = await this.deps.nowPlaying.execute();
          return {
            status: "success",
            intent,
            replyText: buildPlaybackReply(playback),
            payload: {
              playbackStatus: playback.status,
              trackId: playback.track?.id,
              trackTitle: playback.track?.title,
              artistName: playback.track?.artist
            }
          };
        }

        case IntentTypes.VolumeSet: {
          const currentPlayback = await this.deps.nowPlaying.execute();
          const targetVolume =
            slots.volumePercent ??
            (slots.volumeDelta != null
              ? Math.max(0, Math.min(100, currentPlayback.volumePercent + slots.volumeDelta))
              : undefined);
          const playback = await this.deps.setVolume.execute(targetVolume);
          return {
            status: "success",
            intent,
            replyText: buildVolumeReply(playback),
            payload: {
              playbackStatus: playback.status,
              trackId: playback.track?.id,
              trackTitle: playback.track?.title,
              artistName: playback.track?.artist,
              volumePercent: playback.volumePercent
            }
          };
        }

        case IntentTypes.FavoriteAdd: {
          const track = await this.deps.addFavorite.execute({
            userId: request.userId,
            context
          });
          return {
            status: "success",
            intent,
            replyText: buildFavoriteReply(track.title),
            payload: {
              trackId: track.id,
              trackTitle: track.title,
              artistName: track.artist,
              isFavorited: true
            }
          };
        }

        case IntentTypes.FavoriteList: {
          const tracks = await this.deps.listFavorites.execute(request.userId);
          return {
            status: "success",
            intent,
            replyText: buildFavoriteListReply(tracks),
            payload: {
              favoriteCount: tracks.length,
              trackId: tracks[0]?.id,
              trackTitle: tracks[0]?.title,
              artistName: tracks[0]?.artist
            }
          };
        }

        case IntentTypes.PlaylistAddTrack: {
          const playlist = await this.deps.addTrackToPlaylist.execute({
            userId: request.userId,
            playlistName: slots.playlistName,
            context
          });
          return {
            status: "success",
            intent,
            replyText: buildPlaylistReply(context.currentTrack!.title, playlist.name),
            payload: {
              trackId: context.currentTrack?.id,
              trackTitle: context.currentTrack?.title,
              artistName: context.currentTrack?.artist,
              playlistName: playlist.name
            }
          };
        }

        case IntentTypes.DownloadTrack: {
          const task = await this.deps.downloadTrack.execute({
            userId: request.userId,
            context
          });
          return {
            status: "success",
            intent,
            replyText: buildDownloadReply(task.trackTitle, task.filePath),
            payload: {
              trackId: task.trackId,
              trackTitle: task.trackTitle,
              artistName: task.artistName,
              downloadTaskId: task.id,
              filePath: task.filePath
            }
          };
        }

        case IntentTypes.DownloadStatus: {
          const task = await this.deps.getDownloadStatus.execute(request.userId);
          return {
            status: "success",
            intent,
            replyText: buildDownloadStatusReply(task),
            payload: task
              ? {
                  trackId: task.trackId,
                  trackTitle: task.trackTitle,
                  artistName: task.artistName,
                  downloadTaskId: task.id,
                  filePath: task.filePath
                }
              : {}
          };
        }

        case IntentTypes.DownloadList: {
          const tasks = await this.deps.listDownloads.execute(request.userId);
          return {
            status: "success",
            intent,
            replyText: buildDownloadListReply(tasks),
            payload: {
              downloadTaskId: tasks.at(-1)?.id,
              filePath: tasks.at(-1)?.filePath,
              trackTitle: tasks.at(-1)?.trackTitle,
              artistName: tasks.at(-1)?.artistName
            }
          };
        }

        default:
          throw new AppError("This command is not supported yet.", ErrorCodes.IntentNotSupported);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error.";
      return {
        status: "error",
        intent: IntentTypes.Unsupported,
        replyText: message,
        errorCode: error instanceof AppError ? error.code : ErrorCodes.InvalidInput
      };
    }
  }
}
