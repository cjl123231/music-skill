# Music Skill 技术方案

## 1. 目标

本方案用于将 `PRD.md` 中定义的 Music Skill 产品能力落地为可开发、可扩展、可接入 OpenClaw 的技能系统。

技术目标：

1. 支持文字和语音输入统一进入同一条意图处理链路。
2. 支持播放、控制、收藏、歌单、下载等核心能力。
3. 预留多音乐源 Provider 扩展能力。
4. 支持上下文记忆、多轮澄清和结果确认。
5. 支持后续从 MVP 平滑演进到推荐、跨平台同步等增强能力。

## 2. 总体架构

建议采用分层架构：

1. OpenClaw 接入层
2. Music Skill 应用层
3. Domain 领域层
4. Provider 适配层
5. 数据存储层
6. 系统能力层

对应职责如下：

### 2.1 OpenClaw 接入层
负责接收 OpenClaw 传入的消息、语音转写结果、用户标识、会话上下文，并返回结构化响应。

输入：
1. 文本消息
2. 语音转写文本
3. 用户 ID
4. 会话 ID
5. 宿主能力信息

输出：
1. 文本回复
2. 建议动作
3. 可选卡片数据
4. 播放状态变化

### 2.2 Music Skill 应用层
负责整个技能执行流程编排，包括：

1. 意图识别
2. 槽位提取
3. 上下文理解
4. 路由到具体 use case
5. 响应生成

### 2.3 Domain 领域层
负责承载核心业务逻辑，不直接依赖 OpenClaw 或具体音乐平台。

核心领域对象建议包括：
1. Track
2. Artist
3. Album
4. Playlist
5. PlaybackState
6. DownloadTask
7. UserPreference
8. SessionContext

### 2.4 Provider 适配层
负责将统一的音乐操作接口映射到具体平台或数据源。

可接入的 Provider 类型：
1. 本地音乐库
2. 在线音乐平台 API
3. 系统媒体播放器控制接口
4. 下载源接口

### 2.5 数据存储层
负责持久化用户相关数据和运行态数据。

建议存储内容：
1. 用户收藏记录
2. 歌单元数据
3. 下载记录
4. 播放历史
5. 最近搜索候选
6. 会话上下文快照

### 2.6 系统能力层
负责非业务能力：
1. 日志
2. 配置
3. 缓存
4. 任务调度
5. 文件下载
6. 音频播放控制

## 3. 请求处理流程

### 3.1 文本请求流程
1. OpenClaw 将用户文本发送给 Music Skill。
2. Skill 做输入标准化。
3. 意图识别模块判断用户意图。
4. 槽位提取模块提取实体，如歌曲名、歌手名、专辑名、歌单名、音量值。
5. 对话管理模块结合历史上下文补全省略信息。
6. 路由到对应 use case。
7. use case 调用一个或多个 Provider。
8. 将执行结果封装为自然语言响应。
9. 更新会话上下文与用户历史。

### 3.2 语音请求流程
1. OpenClaw 完成语音识别或提供语音输入接口。
2. 语音文本进入与文本相同的处理流程。
3. 对高风险动作增加二次确认。

### 3.3 多轮澄清流程
适用于搜索结果歧义、用户表达不完整等情况。

1. 系统发现结果不唯一或缺少必要槽位。
2. 生成澄清问题，并缓存候选上下文。
3. 用户回复“第一个”“就这个”“下载它”等。
4. 系统从候选缓存中恢复并继续执行。

## 4. 核心模块设计

## 4.1 Intent Router

职责：
1. 将用户输入映射为标准化 intent。
2. 输出置信度。
3. 标记是否需要澄清。

建议 MVP 支持的 intent：
1. `music.play`
2. `music.search`
3. `music.pause`
4. `music.resume`
5. `music.stop`
6. `music.next`
7. `music.previous`
8. `music.volume.set`
9. `music.volume.up`
10. `music.volume.down`
11. `music.volume.mute`
12. `music.favorite.add`
13. `music.favorite.remove`
14. `music.favorite.list`
15. `music.playlist.create`
16. `music.playlist.add_track`
17. `music.playlist.play`
18. `music.download.track`
19. `music.download.album`
20. `music.download.status`
21. `music.queue.add`
22. `music.queue.play_next`
23. `music.queue.clear`
24. `music.now_playing`

## 4.2 Slot Extractor

负责提取参数，建议支持：

1. `track_name`
2. `artist_name`
3. `album_name`
4. `playlist_name`
5. `genre`
6. `language`
7. `ordinal`
8. `volume_percent`
9. `target_scope`
10. `download_target`
11. `play_mode`

示例：

用户输入：
`播放周杰伦的晴天`

提取结果：
```json
{
  "intent": "music.play",
  "slots": {
    "track_name": "晴天",
    "artist_name": "周杰伦"
  }
}
```

## 4.3 Dialogue Manager

职责：
1. 维护上下文。
2. 处理代词引用。
3. 管理澄清状态。
4. 处理确认和取消。

建议维护的上下文字段：

```json
{
  "current_track": {},
  "current_album": {},
  "current_playlist": {},
  "last_search_results": [],
  "last_download_target": {},
  "pending_action": null,
  "pending_candidates": []
}
```

## 4.4 Use Case 层

每个 intent 对应独立 use case，建议至少包括：

1. `PlayMusicUseCase`
2. `SearchMusicUseCase`
3. `PauseMusicUseCase`
4. `ResumeMusicUseCase`
5. `SkipTrackUseCase`
6. `AdjustVolumeUseCase`
7. `AddFavoriteUseCase`
8. `RemoveFavoriteUseCase`
9. `CreatePlaylistUseCase`
10. `AddTrackToPlaylistUseCase`
11. `DownloadTrackUseCase`
12. `GetDownloadStatusUseCase`
13. `GetNowPlayingUseCase`

## 4.5 Provider Manager

为了支持多音乐源，建议定义统一 Provider 接口。

核心原则：
1. 业务层只依赖统一接口，不依赖具体平台实现。
2. 支持多个 Provider 按优先级回退。
3. 搜索、播放、下载能力可以来自不同 Provider。

接口建议：

```ts
interface MusicProvider {
  searchTracks(query: SearchTrackQuery): Promise<Track[]>;
  searchAlbums(query: SearchAlbumQuery): Promise<Album[]>;
  searchArtists(query: SearchArtistQuery): Promise<Artist[]>;
  getTrack(id: string): Promise<Track | null>;
  play(input: PlayInput): Promise<PlaybackResult>;
  pause(): Promise<void>;
  resume(): Promise<void>;
  stop(): Promise<void>;
  next(): Promise<void>;
  previous(): Promise<void>;
  setVolume(percent: number): Promise<void>;
  getNowPlaying(): Promise<PlaybackState | null>;
  addFavorite(trackId: string, userId: string): Promise<void>;
  removeFavorite(trackId: string, userId: string): Promise<void>;
  createPlaylist(name: string, userId: string): Promise<Playlist>;
  addTrackToPlaylist(playlistId: string, trackId: string, userId: string): Promise<void>;
  downloadTrack(trackId: string, userId: string): Promise<DownloadTask>;
  getDownloadStatus(taskId: string, userId: string): Promise<DownloadTask>;
}
```

## 5. 数据模型建议

### 5.1 Track

```json
{
  "id": "track_xxx",
  "title": "晴天",
  "artist": "周杰伦",
  "album": "叶惠美",
  "duration_ms": 269000,
  "source": "provider_a",
  "playable": true,
  "downloadable": true
}
```

### 5.2 PlaybackState

```json
{
  "status": "playing",
  "track_id": "track_xxx",
  "position_ms": 32100,
  "volume_percent": 60,
  "mode": "shuffle"
}
```

### 5.3 DownloadTask

```json
{
  "id": "download_xxx",
  "target_type": "track",
  "target_id": "track_xxx",
  "status": "running",
  "progress": 45,
  "file_path": null,
  "error_message": null
}
```

### 5.4 SessionContext

```json
{
  "session_id": "session_xxx",
  "user_id": "user_xxx",
  "current_track_id": "track_xxx",
  "last_search_result_ids": ["track_1", "track_2"],
  "pending_intent": "music.play",
  "pending_slot": "track_selection",
  "updated_at": "2026-03-25T21:00:00Z"
}
```

## 6. 存储方案建议

MVP 阶段可采用轻量存储：

1. SQLite
2. JSON 文件缓存
3. 下载目录本地文件索引

建议拆分：
1. `users`
2. `favorites`
3. `playlists`
4. `playlist_tracks`
5. `download_tasks`
6. `play_history`
7. `session_contexts`

如果后续用户量增长，可迁移至：
1. PostgreSQL
2. Redis 缓存上下文和候选集

## 7. API 与内部接口建议

如果 Music Skill 以独立服务实现，可定义内部接口：

### 7.1 Skill 入口

`POST /skill/music/handle`

请求示例：
```json
{
  "user_id": "u_001",
  "session_id": "s_001",
  "input_type": "text",
  "text": "播放周杰伦的晴天",
  "metadata": {
    "locale": "zh-CN"
  }
}
```

响应示例：
```json
{
  "reply_text": "正在播放周杰伦的《晴天》。",
  "intent": "music.play",
  "status": "success",
  "payload": {
    "track_id": "track_xxx",
    "action": "play"
  }
}
```

### 7.2 下载状态查询

`GET /skill/music/downloads/:taskId`

### 7.3 收藏列表查询

`GET /skill/music/favorites`

## 8. 错误处理设计

建议定义统一错误码：

1. `MUSIC_NOT_FOUND`
2. `MUSIC_AMBIGUOUS_RESULT`
3. `MUSIC_PROVIDER_UNAVAILABLE`
4. `MUSIC_NOT_PLAYING`
5. `MUSIC_ACTION_NOT_SUPPORTED`
6. `MUSIC_DOWNLOAD_FORBIDDEN`
7. `MUSIC_PLAYLIST_NOT_FOUND`
8. `MUSIC_CONFIRMATION_REQUIRED`

错误返回应包含：
1. 错误码
2. 用户可理解的提示
3. 是否可重试
4. 是否需要继续澄清

## 9. 安全与约束

1. 下载能力必须受配置开关控制。
2. 删除、清空、批量下载操作应支持确认机制。
3. 不在日志中泄露用户隐私数据和访问凭证。
4. 用户数据应按用户 ID 隔离。
5. 第三方 Provider 的凭证需通过环境变量或安全配置管理。

## 10. 配置项建议

```env
MUSIC_SKILL_DEFAULT_PROVIDER=local
MUSIC_SKILL_ENABLE_VOICE=true
MUSIC_SKILL_ENABLE_DOWNLOAD=true
MUSIC_SKILL_MAX_CANDIDATES=5
MUSIC_SKILL_REQUIRE_CONFIRM_ON_DESTRUCTIVE=true
MUSIC_DOWNLOAD_DIR=./downloads
MUSIC_DB_PATH=./data/music-skill.db.json
```

## 11. 日志与观测

建议记录：
1. 请求 ID
2. 用户 ID
3. intent
4. 执行耗时
5. Provider 命中情况
6. 错误码
7. 澄清轮次

建议指标：
1. 请求成功率
2. Intent 命中率
3. 平均响应时间
4. Provider 错误率
5. 下载成功率

## 12. 推荐目录结构

```text
music-skill/
  docs/
  src/
    application/
      intents/
      use-cases/
      responders/
    domain/
      entities/
      repositories/
      services/
    infrastructure/
      providers/
      storage/
      playback/
      downloads/
    interfaces/
      openclaw/
      http/
    shared/
      errors/
      types/
      utils/
  data/
  downloads/
  tests/
```

## 13. MVP 开发顺序建议

第一阶段：
1. 搭建 Skill 入口
2. 完成文本输入链路
3. 支持 `play/pause/resume/next/previous/now_playing`
4. 支持本地上下文管理

第二阶段：
1. 支持收藏和歌单
2. 支持下载
3. 支持多结果澄清
4. 接入语音输入

第三阶段：
1. 多 Provider 扩展
2. 推荐和历史偏好
3. 更复杂自然语言解析

## 14. 结论

Music Skill 的技术实现关键，不在于单个播放命令，而在于建立一套可扩展的“输入理解 + 上下文管理 + Provider 抽象 + 统一响应”架构。MVP 应优先验证高频控制链路，避免过早做复杂推荐和多平台能力。
