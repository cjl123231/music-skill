import { describe, expect, it } from "vitest";
import { routeIntent } from "../../../../src/application/intents/intent-router.js";
import { IntentTypes } from "../../../../src/application/intents/intent-types.js";

describe("routeIntent", () => {
  it("routes play intent", () => {
    expect(routeIntent("播放周杰伦的晴天")).toBe(IntentTypes.Play);
  });

  it("routes colloquial play intent", () => {
    expect(routeIntent("播放录音")).toBe(IntentTypes.Play);
  });

  it("routes favorite play intent", () => {
    expect(routeIntent("播放我收藏的录音")).toBe(IntentTypes.Play);
  });

  it("routes now playing intent", () => {
    expect(routeIntent("现在播放的是啥")).toBe(IntentTypes.NowPlaying);
  });

  it("routes download status intent", () => {
    expect(routeIntent("下载好了没")).toBe(IntentTypes.DownloadStatus);
  });

  it("routes favorite list intent", () => {
    expect(routeIntent("查看收藏")).toBe(IntentTypes.FavoriteList);
  });

  describe("extended colloquial expressions", () => {
    it("matches colloquial play variants", () => {
      expect(routeIntent("来点音乐")).toBe(IntentTypes.Play);
      expect(routeIntent("我想听歌")).toBe(IntentTypes.Play);
      expect(routeIntent("给我来一首")).toBe(IntentTypes.Play);
      expect(routeIntent("放个歌")).toBe(IntentTypes.Play);
      expect(routeIntent("听一首周杰伦")).toBe(IntentTypes.Play);
    });

    it("matches colloquial pause variants", () => {
      expect(routeIntent("别放了")).toBe(IntentTypes.Pause);
      expect(routeIntent("先暂停")).toBe(IntentTypes.Pause);
    });

    it("matches colloquial resume variants", () => {
      expect(routeIntent("继续放")).toBe(IntentTypes.Resume);
      expect(routeIntent("接着播放")).toBe(IntentTypes.Resume);
    });

    it("matches colloquial next variants", () => {
      expect(routeIntent("换一首")).toBe(IntentTypes.Next);
      expect(routeIntent("跳过")).toBe(IntentTypes.Next);
      expect(routeIntent("不听这个了")).toBe(IntentTypes.Next);
    });

    it("matches colloquial now-playing variants", () => {
      expect(routeIntent("这是什么歌")).toBe(IntentTypes.NowPlaying);
      expect(routeIntent("这首歌叫什么")).toBe(IntentTypes.NowPlaying);
      expect(routeIntent("在放什么")).toBe(IntentTypes.NowPlaying);
    });

    it("matches colloquial favorite variants", () => {
      expect(routeIntent("喜欢这首")).toBe(IntentTypes.FavoriteAdd);
      expect(routeIntent("收藏一个")).toBe(IntentTypes.FavoriteAdd);
    });

    it("matches colloquial download variants", () => {
      expect(routeIntent("保存这首歌")).toBe(IntentTypes.DownloadTrack);
      expect(routeIntent("下载一个")).toBe(IntentTypes.DownloadTrack);
    });

    it("matches english play variants", () => {
      expect(routeIntent("play me a song")).toBe(IntentTypes.Play);
      expect(routeIntent("i want to hear something")).toBe(IntentTypes.Play);
      expect(routeIntent("listen to Jay Chou")).toBe(IntentTypes.Play);
    });

    it("matches english pause and resume variants", () => {
      expect(routeIntent("stop playing")).toBe(IntentTypes.Pause);
      expect(routeIntent("keep playing")).toBe(IntentTypes.Resume);
    });

    it("matches agent recommendation and memory variants", () => {
      expect(routeIntent("来点安静的")).toBe(IntentTypes.RecommendScene);
      expect(routeIntent("按我的喜好播放")).toBe(IntentTypes.RecommendPreference);
      expect(routeIntent("记住我喜欢周杰伦")).toBe(IntentTypes.RememberPositive);
      expect(routeIntent("以后别放这种")).toBe(IntentTypes.RememberNegative);
    });

    it("matches additional scene recommendation variants", () => {
      expect(routeIntent("来点适合学习的")).toBe(IntentTypes.RecommendScene);
      expect(routeIntent("来点放松的")).toBe(IntentTypes.RecommendScene);
      expect(routeIntent("来点运动的")).toBe(IntentTypes.RecommendScene);
    });
  });

  describe("edge cases", () => {
    it("returns unsupported for empty input", () => {
      expect(routeIntent("")).toBe(IntentTypes.Unsupported);
      expect(routeIntent("   ")).toBe(IntentTypes.Unsupported);
    });

    it("returns unsupported for unrelated input", () => {
      expect(routeIntent("今天天气怎么样")).toBe(IntentTypes.Unsupported);
      expect(routeIntent("帮我写一封邮件")).toBe(IntentTypes.Unsupported);
    });
  });
});
