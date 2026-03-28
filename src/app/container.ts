import { AddFavoriteUseCase } from "../application/use-cases/add-favorite.use-case.js";
import { AddTrackToPlaylistUseCase } from "../application/use-cases/add-track-to-playlist.use-case.js";
import { DialogueManager } from "../application/dialogue/dialogue-manager.js";
import { CurrentTrackResolver } from "../application/use-cases/current-track-resolver.js";
import { DownloadTrackUseCase } from "../application/use-cases/download-track.use-case.js";
import { GetDownloadStatusUseCase } from "../application/use-cases/get-download-status.use-case.js";
import { ListFavoritesUseCase } from "../application/use-cases/list-favorites.use-case.js";
import { ListDownloadsUseCase } from "../application/use-cases/list-downloads.use-case.js";
import { NextTrackUseCase } from "../application/use-cases/next-track.use-case.js";
import { NowPlayingUseCase } from "../application/use-cases/now-playing.use-case.js";
import { PauseMusicUseCase } from "../application/use-cases/pause-music.use-case.js";
import { PlayFavoriteMusicUseCase } from "../application/use-cases/play-favorite-music.use-case.js";
import { PlayMusicUseCase } from "../application/use-cases/play-music.use-case.js";
import { PreviousTrackUseCase } from "../application/use-cases/previous-track.use-case.js";
import { ResumeMusicUseCase } from "../application/use-cases/resume-music.use-case.js";
import { SetVolumeUseCase } from "../application/use-cases/set-volume.use-case.js";
import { FileDownloader } from "../infrastructure/downloads/file-downloader.js";
import { createProvider } from "../infrastructure/providers/provider-manager.js";
import { createStorageRepositories } from "../infrastructure/storage/sqlite/storage-factory.js";
import { MusicSkillHandler } from "../interfaces/openclaw/music-skill.handler.js";

export function createContainer() {
  const provider = createProvider();
  const currentTrackResolver = new CurrentTrackResolver(provider);
  const { sessionContextRepository, downloadTaskRepository, favoritesRepository, playlistsRepository } =
    createStorageRepositories();
  const downloader = new FileDownloader();
  const dialogueManager = new DialogueManager(sessionContextRepository);

  return {
    provider,
    musicSkillHandler: new MusicSkillHandler({
      dialogueManager,
      playMusic: new PlayMusicUseCase(provider),
      playFavoriteMusic: new PlayFavoriteMusicUseCase(favoritesRepository, provider),
      pauseMusic: new PauseMusicUseCase(provider),
      resumeMusic: new ResumeMusicUseCase(provider),
      nextTrack: new NextTrackUseCase(provider),
      previousTrack: new PreviousTrackUseCase(provider),
      nowPlaying: new NowPlayingUseCase(provider),
      setVolume: new SetVolumeUseCase(provider),
      addFavorite: new AddFavoriteUseCase(favoritesRepository, currentTrackResolver),
      listFavorites: new ListFavoritesUseCase(favoritesRepository),
      addTrackToPlaylist: new AddTrackToPlaylistUseCase(playlistsRepository, currentTrackResolver),
      downloadTrack: new DownloadTrackUseCase(downloader, downloadTaskRepository, currentTrackResolver),
      getDownloadStatus: new GetDownloadStatusUseCase(downloadTaskRepository),
      listDownloads: new ListDownloadsUseCase(downloadTaskRepository)
    })
  };
}
