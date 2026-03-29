import { describe, expect, it } from "vitest";
import { routeIntent } from "../../../../src/application/intents/intent-router.js";
import { IntentTypes } from "../../../../src/application/intents/intent-types.js";

describe("routeIntent", () => {
  it("routes play intent", () => {
    expect(routeIntent("播放周杰伦的晴天")).toBe(IntentTypes.Play);
    expect(routeIntent("播放录音")).toBe(IntentTypes.Play);
  });

  it("routes now playing intent", () => {
    expect(routeIntent("现在播放的是啥")).toBe(IntentTypes.NowPlaying);
  });

  it("routes favorite and download intents", () => {
    expect(routeIntent("查看收藏")).toBe(IntentTypes.FavoriteList);
    expect(routeIntent("下载好了没")).toBe(IntentTypes.DownloadStatus);
    expect(routeIntent("下载这首歌")).toBe(IntentTypes.DownloadTrack);
  });

  it("routes colloquial volume intents", () => {
    expect(routeIntent("音量调到10%")).toBe(IntentTypes.VolumeSet);
    expect(routeIntent("音量减少10%")).toBe(IntentTypes.VolumeSet);
    expect(routeIntent("减少一点")).toBe(IntentTypes.VolumeSet);
    expect(routeIntent("小一点")).toBe(IntentTypes.VolumeSet);
    expect(routeIntent("再小一点")).toBe(IntentTypes.VolumeSet);
    expect(routeIntent("太大声了")).toBe(IntentTypes.VolumeSet);
    expect(routeIntent("静音")).toBe(IntentTypes.VolumeSet);
    expect(routeIntent("取消静音")).toBe(IntentTypes.VolumeSet);
  });

  it("routes playback control intents", () => {
    expect(routeIntent("暂停")).toBe(IntentTypes.Pause);
    expect(routeIntent("继续播放")).toBe(IntentTypes.Resume);
    expect(routeIntent("下一首")).toBe(IntentTypes.Next);
    expect(routeIntent("上一首")).toBe(IntentTypes.Previous);
  });

  it("routes agent intents", () => {
    expect(routeIntent("来点安静的")).toBe(IntentTypes.RecommendScene);
    expect(routeIntent("按我的喜好播放")).toBe(IntentTypes.RecommendPreference);
    expect(routeIntent("记住我喜欢周杰伦")).toBe(IntentTypes.RememberPositive);
    expect(routeIntent("以后别放这种")).toBe(IntentTypes.RememberNegative);
  });

  it("returns unsupported for unrelated input", () => {
    expect(routeIntent("今天天气怎么样")).toBe(IntentTypes.Unsupported);
  });
});
