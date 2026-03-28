import type { PlaybackState } from "../../../domain/entities/playback-state.js";
import type { Track } from "../../../domain/entities/track.js";
import type { MusicProvider } from "../../../domain/services/music-provider.js";
import { AppError } from "../../../shared/errors/app-error.js";
import { ErrorCodes } from "../../../shared/errors/error-codes.js";

const seedTracks: Track[] = [
  {
    id: "track_qingtian",
    title: "晴天",
    artist: "周杰伦",
    album: "叶惠美",
    source: "stub",
    playable: true,
    downloadable: true
  },
  {
    id: "track_qinghuaci",
    title: "青花瓷",
    artist: "周杰伦",
    album: "我很忙",
    source: "stub",
    playable: true,
    downloadable: true
  }
];

export class StubMusicProvider implements MusicProvider {
  private playback: PlaybackState = {
    status: "idle",
    track: null,
    volumePercent: 50
  };

  async searchTracks(query: { keyword: string; artistName?: string }): Promise<Track[]> {
    return seedTracks.filter((track) => {
      const needle = query.keyword.toLowerCase();
      const keywordMatched =
        track.title.toLowerCase().includes(needle) || track.artist.toLowerCase().includes(needle);
      const artistMatched = query.artistName ? track.artist.toLowerCase().includes(query.artistName.toLowerCase()) : true;
      return keywordMatched && artistMatched;
    });
  }

  async listTracks(): Promise<Track[]> {
    return seedTracks;
  }

  async play(track: Track): Promise<PlaybackState> {
    this.playback = { ...this.playback, status: "playing", track };
    return this.playback;
  }

  async pause(): Promise<PlaybackState> {
    this.ensureTrack();
    this.playback = { ...this.playback, status: "paused" };
    return this.playback;
  }

  async resume(): Promise<PlaybackState> {
    this.ensureTrack();
    this.playback = { ...this.playback, status: "playing" };
    return this.playback;
  }

  async next(): Promise<PlaybackState> {
    const currentIndex = seedTracks.findIndex((track) => track.id === this.playback.track?.id);
    const nextTrack = seedTracks[(currentIndex + 1 + seedTracks.length) % seedTracks.length];
    this.playback = { ...this.playback, status: "playing", track: nextTrack };
    return this.playback;
  }

  async previous(): Promise<PlaybackState> {
    const currentIndex = seedTracks.findIndex((track) => track.id === this.playback.track?.id);
    const prevTrack = seedTracks[(currentIndex - 1 + seedTracks.length) % seedTracks.length];
    this.playback = { ...this.playback, status: "playing", track: prevTrack };
    return this.playback;
  }

  async setVolume(percent: number): Promise<PlaybackState> {
    this.playback = { ...this.playback, volumePercent: percent };
    return this.playback;
  }

  async getNowPlaying(): Promise<PlaybackState> {
    return this.playback;
  }

  private ensureTrack(): void {
    if (!this.playback.track) {
      throw new AppError("There is no track currently playing.", ErrorCodes.MusicNotPlaying);
    }
  }
}
