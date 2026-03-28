# Music Skill 指令与意图规格

## 1. 文档目标

本文件定义 Music Skill 在 OpenClaw 中的基础交互规格，用于指导：

1. 意图设计
2. 提示词设计
3. NLU 规则设计
4. API 入参与出参设计
5. 后续测试用例编写

## 2. Skill 定位

Music Skill 是一个面向音乐播放与管理场景的对话技能。用户通过自然语言输入，驱动播放器能力完成搜索、播放、暂停、收藏、下载、歌单管理等任务。

## 3. 设计原则

1. 用户优先说自然语言，不要求背命令。
2. 相同意图允许多种表达。
3. 能直接执行时不多问。
4. 有歧义时先澄清。
5. 高风险动作需确认。
6. 响应尽量简洁，可继续对话。

## 4. 意图清单

### 4.1 播放相关

#### `music.play`
含义：
播放指定歌曲、歌手、专辑、歌单或某类音乐。

示例表达：
1. 播放晴天
2. 放一首周杰伦的歌
3. 播放 Taylor Swift 的 1989
4. 来点轻音乐
5. 播放我的跑步歌单

主要槽位：
1. `track_name`
2. `artist_name`
3. `album_name`
4. `playlist_name`
5. `genre`
6. `mood`

#### `music.search`
含义：
搜索音乐但不一定立即播放。

示例表达：
1. 搜索晴天
2. 找周杰伦的专辑
3. 有什么适合睡前听的歌

### 4.2 播放控制

#### `music.pause`
示例表达：
1. 暂停
2. 先停一下

#### `music.resume`
示例表达：
1. 继续播放
2. 接着放

#### `music.stop`
示例表达：
1. 停止播放
2. 别放了

#### `music.next`
示例表达：
1. 下一首
2. 切歌

#### `music.previous`
示例表达：
1. 上一首
2. 切回去

#### `music.now_playing`
示例表达：
1. 现在播放的是什么
2. 当前是哪首歌

#### `music.play_mode.set`
示例表达：
1. 开随机播放
2. 切成单曲循环
3. 列表循环

槽位：
1. `play_mode`

## 4.3 音量控制

#### `music.volume.up`
示例表达：
1. 声音大一点
2. 音量加大

#### `music.volume.down`
示例表达：
1. 声音小一点
2. 音量降低

#### `music.volume.set`
示例表达：
1. 音量调到 30
2. 调到 50%

槽位：
1. `volume_percent`

#### `music.volume.mute`
示例表达：
1. 静音
2. 关声音

#### `music.volume.unmute`
示例表达：
1. 取消静音
2. 打开声音

## 4.4 收藏相关

#### `music.favorite.add`
示例表达：
1. 收藏这首歌
2. 加到我喜欢

#### `music.favorite.remove`
示例表达：
1. 取消收藏
2. 从我喜欢里删掉

#### `music.favorite.list`
示例表达：
1. 看看我喜欢的歌
2. 播放我收藏的音乐

## 4.5 队列相关

#### `music.queue.add`
示例表达：
1. 把青花瓷加入队列
2. 稍后播放这首

#### `music.queue.play_next`
示例表达：
1. 这首下一首播
2. 插到下一首

#### `music.queue.show`
示例表达：
1. 看下待播放列表
2. 队列里还有什么

#### `music.queue.remove`
示例表达：
1. 把队列里的第三首删掉
2. 删除这首待播放

#### `music.queue.clear`
示例表达：
1. 清空队列
2. 把待播放清掉

## 4.6 歌单相关

#### `music.playlist.create`
示例表达：
1. 创建一个深夜歌单
2. 新建歌单叫通勤

槽位：
1. `playlist_name`

#### `music.playlist.rename`
示例表达：
1. 把这个歌单改名叫跑步
2. 重命名歌单为健身

#### `music.playlist.add_track`
示例表达：
1. 把这首歌加入深夜歌单
2. 加到我的收藏歌单里

#### `music.playlist.remove_track`
示例表达：
1. 从深夜歌单删掉这首歌
2. 把这首从歌单里移除

#### `music.playlist.play`
示例表达：
1. 播放深夜歌单
2. 放我的健身歌单

#### `music.playlist.show`
示例表达：
1. 看看深夜歌单里有什么
2. 打开我的跑步歌单

## 4.7 下载相关

#### `music.download.track`
示例表达：
1. 下载这首歌
2. 把当前歌曲下载下来

#### `music.download.album`
示例表达：
1. 下载这张专辑
2. 把这个专辑存下来

#### `music.download.playlist`
示例表达：
1. 下载这个歌单
2. 把这个歌单都下了

#### `music.download.status`
示例表达：
1. 下载好了没
2. 看下下载进度
3. 刚才那首下载成功了吗

#### `music.download.list`
示例表达：
1. 看下我下载了什么
2. 打开下载列表

## 4.8 查询相关

#### `music.history.list`
示例表达：
1. 最近听了什么
2. 我的播放历史

#### `music.recent.searches`
示例表达：
1. 最近搜过什么
2. 我刚才搜的歌呢

## 5. 槽位定义

建议统一槽位集合：

1. `track_name`
2. `artist_name`
3. `album_name`
4. `playlist_name`
5. `genre`
6. `mood`
7. `language`
8. `ordinal`
9. `volume_percent`
10. `play_mode`
11. `target_scope`
12. `confirm`

说明：
1. `ordinal` 用于“第一个”“第二首”“最后一个”。
2. `target_scope` 用于“这首歌”“这张专辑”“这个歌单”。
3. `confirm` 用于“确定”“取消”“就这个”。

## 6. 上下文引用规则

系统需要支持以下引用对象：

1. 当前播放歌曲
2. 当前播放专辑
3. 当前歌单
4. 最近搜索结果
5. 最近一次下载对象
6. 最近一次澄清候选集

常见映射：
1. “这首歌” -> `current_track`
2. “这张专辑” -> `current_album`
3. “这个歌单” -> `current_playlist`
4. “第一个” -> `last_search_results[0]`
5. “就这个” -> `pending_candidates[selected]`

## 7. 响应规范

### 7.1 成功响应
要求：
1. 明确告诉用户执行了什么。
2. 尽量包含对象名。
3. 避免模板味太强。

示例：
1. 正在播放周杰伦的《晴天》。
2. 已把《晴天》加入你的“深夜歌单”。
3. 《叶惠美》已经开始下载。

### 7.2 澄清响应
要求：
1. 候选数量控制在 3 到 5 个。
2. 候选描述尽量带歌手、专辑等关键信息。

示例：
找到了 3 个结果，你想播放哪一个？
1. 周杰伦《晴天》
2. 钢琴版《晴天》
3. 纯音乐《晴天》

### 7.3 失败响应
要求：
1. 说明失败原因。
2. 给出下一步建议。

示例：
1. 没找到《晴田》，要不要我帮你搜《晴天》？
2. 当前没有正在播放的歌曲，所以还不能收藏。
3. 这张专辑暂时不支持下载，可能受版权限制。

## 8. 确认机制

下列动作建议默认确认：

1. 清空队列
2. 删除歌单内容
3. 批量下载
4. 覆盖重名歌单

确认示例：
1. 要清空当前播放队列吗？
2. 这个歌单里有 86 首歌，确认全部下载吗？

## 9. NLU 输出格式建议

```json
{
  "intent": "music.play",
  "confidence": 0.96,
  "slots": {
    "track_name": "晴天",
    "artist_name": "周杰伦"
  },
  "context_refs": [],
  "needs_clarification": false
}
```

多轮选择示例：

```json
{
  "intent": "music.play",
  "confidence": 0.91,
  "slots": {
    "ordinal": 1
  },
  "context_refs": [
    "last_search_results"
  ],
  "needs_clarification": false
}
```

## 10. 测试语料建议

### 10.1 播放类
1. 播放晴天
2. 来一首周杰伦的歌
3. 播放第一首
4. 给我放点英文歌

### 10.2 控制类
1. 暂停一下
2. 继续
3. 下一首
4. 当前在放什么

### 10.3 收藏类
1. 收藏这首
2. 加到我喜欢
3. 把它从收藏删掉

### 10.4 歌单类
1. 创建歌单叫学习
2. 把这首加到学习歌单
3. 播放学习歌单

### 10.5 下载类
1. 下载这首歌
2. 下载这张专辑
3. 看看下载进度

## 11. MVP 最小意图集合

如果第一版需要进一步收敛，建议先只做：

1. `music.play`
2. `music.pause`
3. `music.resume`
4. `music.next`
5. `music.previous`
6. `music.now_playing`
7. `music.favorite.add`
8. `music.download.track`
9. `music.playlist.add_track`
10. `music.volume.set`

## 12. 结论

这份规格的目标，是先把 Music Skill 的语言接口标准化。只要意图、槽位、上下文和响应规范稳定，底层接哪个音乐源、怎么控制播放器，都可以在后续实现中逐步替换和增强。
