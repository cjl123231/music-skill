import { IntentTypes, type IntentType } from "./intent-types.js";

const CN = {
  play: "\u64ad\u653e",
  playOne: "\u653e\u4e00\u9996",
  favoriteList: "\u67e5\u770b\u6536\u85cf|\u6211\u7684\u6536\u85cf|\u6536\u85cf\u5217\u8868",
  favoriteAdd: "\u6536\u85cf\u8fd9\u9996\u6b4c|\u6536\u85cf\u8fd9\u9996|\u6211\u559c\u6b22\u8fd9\u9996",
  download: "\u4e0b\u8f7d\u8fd9\u9996\u6b4c|\u4e0b\u8f7d\u5f53\u524d\u6b4c\u66f2",
  downloadStatus: "\u4e0b\u8f7d\u597d\u4e86\u6ca1|\u4e0b\u8f7d\u8fdb\u5ea6",
  downloadList: "\u67e5\u770b\u4e0b\u8f7d\u5217\u8868|\u4e0b\u8f7d\u8bb0\u5f55|\u4e0b\u8f7d\u5386\u53f2",
  nowPlaying:
    "\u73b0\u5728\u64ad\u653e\u7684\u662f\u4ec0\u4e48|\u73b0\u5728\u64ad\u653e\u7684\u662f\u5565|\u73b0\u5728\u5728\u653e\u4ec0\u4e48|\u8fd9\u662f\u4ec0\u4e48\u6b4c",
  playlist:
    "\u52a0\u5165.+\u6b4c\u5355|\u52a0\u5230.+\u6b4c\u5355|\u628a\u8fd9\u9996\u6b4c\u52a0\u5165.+\u6b4c\u5355|\u628a\u8fd9\u9996\u52a0\u5165.+\u6b4c\u5355",
  volume:
    "\u97f3\u91cf\u8c03\u5230|\u97f3\u91cf\u8bbe\u4e3a|\u628a\u97f3\u91cf\u8c03\u5230|\u97f3\u91cf\u589e\u52a0|\u97f3\u91cf\u51cf\u5c11|\u5927\u58f0\u4e00\u70b9|\u5c0f\u58f0\u4e00\u70b9|\u5927\u4e00\u70b9|\u5c0f\u4e00\u70b9|\u518d\u5927\u4e00\u70b9|\u518d\u5c0f\u4e00\u70b9|\u51cf\u5c11\u4e00\u70b9|\u589e\u52a0\u4e00\u70b9|\u9759\u97f3|\u53d6\u6d88\u9759\u97f3|\u592a\u5927\u58f0\u4e86|\u58f0\u97f3\u522b\u8fd9\u4e48\u5927",
  resume: "\u7ee7\u7eed\u64ad\u653e|\u7ee7\u7eed|\u6062\u590d\u64ad\u653e",
  pause: "\u6682\u505c|\u505c\u4e00\u4e0b|\u505c\u4e0b|\u505c\u6b62\u64ad\u653e",
  next: "\u4e0b\u4e00\u9996|\u5207\u6b4c|\u4e0b\u4e00\u66f2|\u6362\u4e00\u9996",
  previous: "\u4e0a\u4e00\u9996|\u4e0a\u4e00\u66f2|\u56de\u5230\u4e0a\u4e00\u9996",
  scene:
    "\u6765\u70b9\u9002\u5408\u5199\u4ee3\u7801\u7684|\u6765\u70b9\u5b89\u9759\u7684|\u6765\u70b9\u9002\u5408\u5b66\u4e60\u7684|\u6765\u70b9\u653e\u677e\u7684|\u6765\u70b9\u8fd0\u52a8\u7684",
  preference: "\u6309\u6211\u7684\u559c\u597d\u64ad\u653e|\u6765\u70b9\u6211\u559c\u6b22\u7684",
  rememberPositive: "\u8bb0\u4f4f\u6211\u559c\u6b22|\u6211\u559c\u6b22\u8fd9\u79cd|\u4ee5\u540e\u591a\u653e",
  rememberNegative: "\u4ee5\u540e\u522b\u653e|\u4e0d\u8981\u518d\u653e|\u6211\u4e0d\u559c\u6b22\u8fd9\u79cd"
};

const orderedRules: Array<{ pattern: RegExp; intent: IntentType }> = [
  {
    pattern: new RegExp(`^(?:${CN.play}(?:\\u6211\\u7684\\u6536\\u85cf|\\u6211\\u6536\\u85cf\\u7684)|play my favorites?|play what i like)`, "i"),
    intent: IntentTypes.Play
  },
  {
    pattern: new RegExp(`^(?:${CN.scene}|play something for coding|play something chill|play study music|play workout music|play something relaxing)`, "i"),
    intent: IntentTypes.RecommendScene
  },
  {
    pattern: new RegExp(`^(?:${CN.preference}|based on my taste|play what i like)`, "i"),
    intent: IntentTypes.RecommendPreference
  },
  {
    pattern: new RegExp(`^(?:${CN.rememberPositive}|remember i like|i like this style|more of this)`, "i"),
    intent: IntentTypes.RememberPositive
  },
  {
    pattern: new RegExp(`^(?:${CN.rememberNegative}|dont play this|i dont like this|no more of this)`, "i"),
    intent: IntentTypes.RememberNegative
  },
  {
    pattern: new RegExp(`^(?:${CN.nowPlaying}|what is playing now|what song is this)`, "i"),
    intent: IntentTypes.NowPlaying
  },
  {
    pattern: new RegExp(`^(?:${CN.favoriteList}|show favorites|list favorites|my favorites)`, "i"),
    intent: IntentTypes.FavoriteList
  },
  {
    pattern: new RegExp(`^(?:${CN.playlist}|add this song to .+ playlist|add to playlist)`, "i"),
    intent: IntentTypes.PlaylistAddTrack
  },
  {
    pattern: new RegExp(`^(?:${CN.download}|download this song|download current)`, "i"),
    intent: IntentTypes.DownloadTrack
  },
  {
    pattern: new RegExp(`^(?:${CN.downloadStatus}|download status|is download done)`, "i"),
    intent: IntentTypes.DownloadStatus
  },
  {
    pattern: new RegExp(`^(?:${CN.downloadList}|list downloads|show downloads)`, "i"),
    intent: IntentTypes.DownloadList
  },
  {
    pattern: new RegExp(`^(?:${CN.favoriteAdd}|favorite this|save this song|like this)`, "i"),
    intent: IntentTypes.FavoriteAdd
  },
  {
    pattern: new RegExp(`^(?:${CN.volume}|volume|set volume to|turn up|turn down|louder|quieter|volume down|volume up|lower the volume|raise the volume)\\s*\\d*%?`, "i"),
    intent: IntentTypes.VolumeSet
  },
  {
    pattern: new RegExp(`^(?:${CN.resume}|resume|continue|keep playing|go on|unpause)`, "i"),
    intent: IntentTypes.Resume
  },
  {
    pattern: new RegExp(`^(?:${CN.pause}|pause|stop playing|hold|wait)`, "i"),
    intent: IntentTypes.Pause
  },
  {
    pattern: new RegExp(`^(?:${CN.next}|next|skip|skip this)`, "i"),
    intent: IntentTypes.Next
  },
  {
    pattern: new RegExp(`^(?:${CN.previous}|previous|prev|go back|last track)`, "i"),
    intent: IntentTypes.Previous
  },
  {
    pattern: new RegExp(`^(?:${CN.play}|${CN.playOne}|\\u6765\\u4e00\\u9996|\\u7ed9\\u6211\\u653e|\\u542c\\u4e00\\u9996|\\u70b9\\u9996|play|listen to|start playing|put on|queue|play me|start)`, "i"),
    intent: IntentTypes.Play
  }
];

export function routeIntent(input: string): IntentType {
  const text = input.trim();
  if (!text) {
    return IntentTypes.Unsupported;
  }

  const matched = orderedRules.find((rule) => rule.pattern.test(text));
  return matched?.intent ?? IntentTypes.Unsupported;
}
