import { IntentTypes, type IntentType } from "./intent-types.js";

const orderedRules: Array<{ pattern: RegExp; intent: IntentType }> = [
  {
    pattern: /^(播放(我收藏|我的收藏(的.*)?)|play my favorites?|play what i like)/i,
    intent: IntentTypes.Play
  },
  {
    pattern:
      /^(来点适合写代码的|来点写代码听的|写代码的时候听什么|来点适合编程的|来点适合工作的|来点工作听的|来点适合学习的|来点学习听的|来点适合阅读的|来点运动的|来点运动听的|来点适合跑步的|来点适合健身的|来点安静的|放点安静的|想听安静一点的|来点轻一点的|来点放松的|来点适合放松的|来点适合睡前听的|来点适合开车听的|来点适合通勤的|来点适合冥想的|来点欢快的|来点燃的|play something for coding|play music for work|play something chill|play something for exercise|play workout music|play something relaxing|play study music|play something upbeat)/i,
    intent: IntentTypes.RecommendScene
  },
  {
    pattern: /^(按我的喜好播放|按我的喜好来点|来点我喜欢的|放点我喜欢的|根据我的口味来|推荐点我喜欢的|based on my taste|play what i like)/i,
    intent: IntentTypes.RecommendPreference
  },
  {
    pattern: /^(记住我喜欢|我喜欢这种|以后多放|我喜欢这个风格|多放点这种|我喜欢这个歌手|记住我爱听|remember i like|i like this style|more of this|i love this artist|remember my preference)/i,
    intent: IntentTypes.RememberPositive
  },
  {
    pattern: /^(以后别放|不要再放|我不喜欢这种|别放这类|不要放这种|以后少放|我讨厌这种|不要再推荐这种|dont play this|stop recommending|i dont like this|no more of this|i hate this style)/i,
    intent: IntentTypes.RememberNegative
  },
  {
    pattern:
      /^(现在播放的是(什么|啥)?|当前是哪首歌|现在在放什么|现在放的是啥|这是什么歌|这首歌叫什么|在放什么|what is playing now|what song is this)/i,
    intent: IntentTypes.NowPlaying
  },
  {
    pattern: /^(查看收藏|看看收藏|我的收藏|收藏列表|show favorites|list favorites|my favorites|saved songs|liked songs)/i,
    intent: IntentTypes.FavoriteList
  },
  {
    pattern:
      /^(把这首歌加入.+歌单|把这首加入.+歌单|把这歌加入.+歌单|把.+加入.+歌单|add this song to .+ playlist|add to playlist)/i,
    intent: IntentTypes.PlaylistAddTrack
  },
  {
    pattern: /^(下载这首歌|下载当前歌曲|把这首歌下载下来|下载一个|保存这首歌|download this song|download current)/i,
    intent: IntentTypes.DownloadTrack
  },
  {
    pattern: /^(下载好了没|看下下载进度|下载进度|download status|is download done)/i,
    intent: IntentTypes.DownloadStatus
  },
  {
    pattern: /^(查看下载列表|打开下载列表|看下我下载了什么|我下载了什么|下载记录|下载历史|list downloads|show downloads)/i,
    intent: IntentTypes.DownloadList
  },
  {
    pattern: /^(收藏这首歌|收藏这首|加到我喜欢|标记收藏|喜欢这首|收藏一个|我喜欢这首|favorite this|save this song|like this)/i,
    intent: IntentTypes.FavoriteAdd
  },
  {
    pattern: /^(音量调到|调到|把音量调到|音量设为|声音大小|调大声|调小声|volume|set volume to|turn up|turn down|louder|quieter)\s*\d*%?/i,
    intent: IntentTypes.VolumeSet
  },
  {
    pattern: /^(继续播放|继续|继续放|接着放|接着播放|恢复播放|resume|continue|keep playing|go on|unpause)/i,
    intent: IntentTypes.Resume
  },
  {
    pattern: /^(暂停|停一下|先停|停下|别放了|先暂停|停止播放|pause|stop playing|hold|wait)/i,
    intent: IntentTypes.Pause
  },
  {
    pattern: /^(下一首|切歌|下一曲|跳过|换一首|换首歌|不听这个了|next|skip|skip this)/i,
    intent: IntentTypes.Next
  },
  {
    pattern: /^(上一首|上一曲|切回去|上一个|回到上一首|退回去|前一首|previous|prev|go back|last track)/i,
    intent: IntentTypes.Previous
  },
  {
    pattern: /^(播放|放一首|来一首|给我播放一个|放个|来点音乐|给我放|听一首|我想听|我想听歌|给我来一首|点首|来首|听听|play|listen to|start playing|put on|queue|play me|i want to hear|let me hear|start)/i,
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
