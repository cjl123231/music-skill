# Music Skill 插件原理

> 最后更新：2026-03-27  
> 对应版本：0.2.0

---

## 目录

1. [整体工作流程](#1-整体工作流程)
2. [插件注册机制](#2-插件注册机制)
3. [请求处理管线](#3-请求处理管线)
4. [意图路由引擎](#4-意图路由引擎)
5. [槽位提取](#5-槽位提取)
6. [对话上下文管理](#6-对话上下文管理)
7. [Use Case 层](#7-use-case-层)
8. [Provider 抽象与适配](#8-provider-抽象与适配)
9. [跨平台播放控制](#9-跨平台播放控制)
10. [存储层](#10-存储层)
11. [HTTP 接口与面板](#11-http-接口与面板)
12. [Agent 层（扩展）](#12-agent-层扩展)
13. [依赖注入容器](#13-依赖注入容器)
14. [领域模型](#14-领域模型)
15. [错误处理](#15-错误处理)
16. [架构总图](#16-架构总图)

---

## 1. 整体工作流程

当用户在 OpenClaw 聊天窗口说出"播放周杰伦的晴天"时，完整的处理链路如下：

```
用户输入 "播放周杰伦的晴天"
        │
        ▼
┌──────────────────────────────────┐
│  OpenClaw 平台（LLM 决策层）     │
│  LLM 判断用户意图匹配 SKILL.md   │
│  → 调用 music_control 工具       │
│  → action="play"                 │
│  → text="播放周杰伦的晴天"       │
└──────────┬───────────────────────┘
           │  Tool Call
           ▼
┌──────────────────────────────────┐
│  插件入口 (plugin/index.ts)      │
│  api.registerTool("music_control") │
│  → executeMusicControl(params)   │
└──────────┬───────────────────────┘
           │  buildCommand()
           ▼
┌──────────────────────────────────┐
│  MusicSkillHandler.handle()      │
│  ① routeIntent() → music.play   │
│  ② extractSlots() → {keyword:   │
│     "晴天", artistName: "周杰伦"}│
│  ③ dialogueManager.getOrCreate() │
│  ④ playMusic.execute()           │
│  ⑤ buildPlaybackReply()         │
└──────────┬───────────────────────┘
           │
           ▼
┌──────────────────────────────────┐
│  LocalMusicProvider              │
│  ① searchTracks("晴天","周杰伦") │
│  ② playbackController.play()    │
│  ③ → PlaybackState {            │
│        status: "playing",        │
│        track: { title: "晴天" }  │
│      }                           │
└──────────┬───────────────────────┘
           │
           ▼
┌──────────────────────────────────┐
│  WindowsPlaybackController       │
│  → spawn PowerShell 播放宿主     │
│  → stdin 写入 JSON 指令          │
│  → 读取 stdout 确认 {ok: true}   │
└──────────┬───────────────────────┘
           │
           ▼
  回复用户：正在播放 周杰伦 的《晴天》。
```

---

## 2. 插件注册机制

### 2.1 插件清单文件

Music Skill 通过 `openclaw.plugin.json` 向 OpenClaw 平台声明自己：

```json
{
  "id": "music-skill",
  "name": "Music Skill",
  "description": "Control music playback through an OpenClaw tool and bundled skill.",
  "version": "0.1.0",
  "skills": ["./skills"],
  "configSchema": {
    "type": "object",
    "properties": {
      "defaultProvider": { "type": "string", "default": "stub" },
      "enableDownload": { "type": "boolean", "default": true },
      "enableVoice": { "type": "boolean", "default": true }
    }
  }
}
```

**各字段含义：**

| 字段 | 作用 |
|---|---|
| `id` | 插件唯一标识，OpenClaw 用它来注册/卸载 |
| `skills` | 指向 Skill 目录，OpenClaw 会加载其中的 `SKILL.md` 文件 |
| `configSchema` | 声明可配置项的 JSON Schema，用户可在 OpenClaw 配置中覆盖 |

### 2.2 Tool 注册

插件入口 `src/plugin/index.ts` 导出一个带有 `register(api)` 方法的对象：

```typescript
export default {
  id: "music-skill",
  register(api) {
    api.registerTool({
      name: "music_control",
      description: "Control music playback, favorite, playlist, download...",
      parameters: musicControlParameters,   // TypeBox schema
      async execute(_id, params) {
        return executeMusicControl(params);
      }
    }, { optional: true });
  }
};
```

**注册后效果：** OpenClaw 的 LLM 在其工具列表中多出一个 `music_control` 工具，当用户说出音乐相关指令时，LLM 会自动选择调用此工具。

### 2.3 Skill 指令文件

`skills/music_skill/SKILL.md` 是给 **LLM** 阅读的行为指南，教会 LLM 如何正确地将用户请求映射为 `music_control` 工具调用：

```markdown
## Tool Mapping

- Play requests: action="play", text=用户原话
- Pause requests: action="pause"
- Volume set: action="set_volume", volumePercent=数值
- ...
```

LLM 不需要做 NLU；它只负责判断"这是音乐请求"并选择正确的 `action`。

### 2.4 两层协作

```
┌─────────────────────────────────────────────┐
│  LLM（借助 SKILL.md 指导）                   │
│  职责：判断用户意图属于音乐类                  │
│       → 选择 action 枚举值                    │
│       → 将用户原话传入 text                    │
└───────────────┬─────────────────────────────┘
                │  action + text
                ▼
┌─────────────────────────────────────────────┐
│  Music Skill 内部 NLU（规则引擎）             │
│  职责：从 text 中精确提取 intent + slots      │
│       → 路由到具体 Use Case                   │
└─────────────────────────────────────────────┘
```

LLM 做**粗分类**（12 个 action 枚举），内部规则引擎做**细粒度语义解析**。

---

## 3. 请求处理管线

`music-control.tool.ts` 是 Tool 调用的入口：

```
Tool 被 LLM 调用
    │
    ▼
executeMusicControl(params)
    │
    ├── buildCommand(params)
    │   将结构化的 action/text/volumePercent
    │   转换为自然语言指令字符串
    │   例：action="play" + text="晴天"
    │         → "晴天"
    │   例：action="set_volume" + volumePercent=30
    │         → "set volume to 30%"
    │
    ▼
container.musicSkillHandler.handle({
    userId, sessionId,
    inputType: "text",
    text: 自然语言指令
})
    │
    ▼
返回 { content: [{type:"text", text: replyText}],
       structuredContent: SkillResponse }
```

**`buildCommand` 的设计意图：** 将 OpenClaw 传来的结构化参数重新转为文本，使后端 Handler 统一接收文本输入——无论来自 Tool 调用、HTTP API 还是浏览器面板，处理逻辑完全一致。

---

## 4. 意图路由引擎

`src/application/intents/intent-router.ts` 是语义理解的核心，采用**正则规则匹配**：

### 4.1 意图定义

共定义 14 种意图（13 个有效 + 1 个兜底）：

| 意图 | 枚举值 | 触发示例 |
|---|---|---|
| 播放 | `music.play` | 播放/放一首/来一首/play |
| 暂停 | `music.pause` | 暂停/停一下/pause |
| 继续 | `music.resume` | 继续播放/接着放/resume |
| 下一首 | `music.next` | 下一首/切歌/next |
| 上一首 | `music.previous` | 上一首/切回去/previous |
| 查询当前 | `music.now_playing` | 现在播放的是什么/在放什么 |
| 音量设置 | `music.volume.set` | 音量调到 30%/set volume to |
| 收藏 | `music.favorite.add` | 收藏这首歌/加到我喜欢 |
| 查看收藏 | `music.favorite.list` | 查看收藏/我的收藏 |
| 加入歌单 | `music.playlist.add_track` | 把这首歌加入 XX 歌单 |
| 下载 | `music.download.track` | 下载这首歌/下载当前歌曲 |
| 下载状态 | `music.download.status` | 下载好了没/下载进度 |
| 下载列表 | `music.download.list` | 查看下载列表/我下载了什么 |
| 不支持 | `music.unsupported` | （兜底） |

### 4.2 匹配机制

```typescript
const rules: Array<{ pattern: RegExp; intent: IntentType }> = [
  { pattern: /^(播放|放一首|来一首|给我播放一个|play\b)/i, intent: "music.play" },
  { pattern: /^(暂停|先停一下|停一下|停下|pause\b)/i, intent: "music.pause" },
  // ... 13 条规则
];

function routeIntent(input: string): IntentType {
  const matched = rules.find(rule => rule.pattern.test(input.trim()));
  return matched?.intent ?? "music.unsupported";
}
```

**特点：**

- 按**优先级顺序**匹配（`find` 返回第一个命中）
- 支持**中英文双语**（每条规则同时包含中文和英文 pattern）
- 匹配锚定在**字符串开头**（`^`），避免误匹配
- 匹配失败时返回 `music.unsupported`

---

## 5. 槽位提取

`src/application/slots/slot-extractor.ts` 在意图确定后，从原始文本中提取结构化参数：

### 5.1 播放意图的槽位提取

```typescript
function extractPlaySlots(text: string): SlotMap {
  // 1. 去掉播放指令前缀 → 得到关键词
  "播放周杰伦的晴天" → "周杰伦的晴天"

  // 2. 检测是否为收藏模式
  "播放我收藏的晴天" → favoriteOnly = true, keyword = "晴天"

  // 3. 提取歌手 + 歌名（中文用"的"分隔，英文用" - "分隔）
  "周杰伦的晴天" → { artistName: "周杰伦", keyword: "晴天" }
  "Jay Chou - Qing Tian" → { artistName: "Jay Chou", keyword: "Qing Tian" }
}
```

### 5.2 音量意图的槽位提取

```typescript
// 从文本中提取数字
"音量调到 30%" → { volumePercent: 30 }
```

### 5.3 歌单意图的槽位提取

```typescript
// 中文提取"加入 XX 歌单"中的歌单名
"把这首歌加入学习歌单" → { playlistName: "学习" }
// 英文提取"add this song to XX playlist"
"add this song to workout playlist" → { playlistName: "workout" }
```

---

## 6. 对话上下文管理

`DialogueManager` 维护会话级别的上下文状态：

```typescript
interface SessionContext {
  sessionId: string;        // 会话 ID
  userId: string;           // 用户 ID
  currentTrack: Track | null;  // 当前正在播放的歌曲
  lastSearchResults: Track[];  // 上一次搜索结果
  updatedAt: string;        // 最后更新时间
}
```

**工作方式：**

1. **getOrCreate**：根据 `sessionId` 查询已有上下文；不存在则创建空白上下文
2. **save**：每次播放操作后更新上下文（记录当前播放曲目、搜索结果等）

**用途：** 当用户说"收藏这首歌"时，`currentTrack` 告诉系统"这首歌"是什么；当用户说"下载这首歌"时，同理从上下文获取当前歌曲。

---

## 7. Use Case 层

每个意图对应一个独立的 Use Case 类，遵循**单一职责原则**：

| Use Case | 职责 |
|---|---|
| `PlayMusicUseCase` | 搜索 + 播放 |
| `PlayFavoriteMusicUseCase` | 从收藏列表中搜索 + 播放 |
| `PauseMusicUseCase` | 暂停 |
| `ResumeMusicUseCase` | 恢复播放 |
| `NextTrackUseCase` | 下一首 |
| `PreviousTrackUseCase` | 上一首 |
| `NowPlayingUseCase` | 查询播放状态 |
| `SetVolumeUseCase` | 设置音量 |
| `AddFavoriteUseCase` | 收藏当前歌曲 |
| `ListFavoritesUseCase` | 查看收藏列表 |
| `AddTrackToPlaylistUseCase` | 加入歌单 |
| `DownloadTrackUseCase` | 下载当前歌曲 |
| `GetDownloadStatusUseCase` | 查询下载状态 |
| `ListDownloadsUseCase` | 查看下载列表 |

**Use Case 的依赖关系（以播放为例）：**

```
PlayMusicUseCase
    ├── 依赖 MusicProvider（搜索 + 播放）
    └── 输出 PlaybackState + SessionContext

MusicSkillHandler
    ├── 调用 PlayMusicUseCase.execute()
    ├── 调用 DialogueManager.save(context)  ← 更新上下文
    └── 调用 buildPlaybackReply(state)      ← 生成回复
```

---

## 8. Provider 抽象与适配

### 8.1 MusicProvider 接口

所有音乐源必须实现统一的 `MusicProvider` 接口：

```typescript
interface MusicProvider {
  searchTracks(query: { keyword: string; artistName?: string }): Promise<Track[]>;
  listTracks(): Promise<Track[]>;
  play(track: Track): Promise<PlaybackState>;
  pause(): Promise<PlaybackState>;
  resume(): Promise<PlaybackState>;
  next(): Promise<PlaybackState>;
  previous(): Promise<PlaybackState>;
  setVolume(percent: number): Promise<PlaybackState>;
  getNowPlaying(): Promise<PlaybackState>;
}
```

### 8.2 Provider 选择策略

`provider-manager.ts` 按以下优先级选择 Provider：

```
1. MUSIC_LIBRARY_DIR 环境变量已设置？
   ├── 是 → 目录存在且包含音频文件？
   │   ├── 是 → 使用 LocalMusicProvider ✓
   │   └── 否 → 降级到 StubMusicProvider
   └── 否 → 使用 StubMusicProvider
```

### 8.3 LocalMusicProvider 工作原理

```
初始化时：
  walkFiles(musicDir)
      │  递归扫描目录
      │  过滤 .mp3/.flac/.wav/.m4a/.aac/.ogg
      ▼
  filePaths: string[]
      │
      ▼  （首次 searchTracks/listTracks 时触发）
  Promise.all(filePaths.map(parseAudioMetadata))
      │  使用 music-metadata 库读取 ID3/Vorbis 标签
      │  失败时回退到文件名解析（"歌手 - 歌名.mp3"）
      ▼
  tracks: Track[]  ← 带有完整元数据的曲目列表，缓存在内存中
```

**搜索逻辑：** 对曲目的 `title` 和 `artist` 字段做**大小写不敏感的子串匹配**（`includes`）。

**切歌逻辑（next/previous）：** 在曲目列表中找到当前曲目的索引，通过取模运算实现**循环列表**：

```typescript
const nextTrack = tracks[(currentIndex + 1) % tracks.length];
const prevTrack = tracks[(currentIndex - 1 + tracks.length) % tracks.length];
```

### 8.4 StubMusicProvider

开发/测试用的模拟 Provider，不依赖实际音频文件，返回硬编码的虚拟曲目。

---

## 9. 跨平台播放控制

### 9.1 PlaybackController 接口

```typescript
interface PlaybackController {
  play(track: Track): Promise<void>;
  pause(): Promise<void>;
  resume(): Promise<void>;
  stop(): Promise<void>;
  setVolume(percent: number): Promise<void>;
  getPlaybackState?(): Promise<Pick<PlaybackState, "status" | "volumePercent">>;
}
```

### 9.2 工厂模式分发

```typescript
function createPlaybackController(): PlaybackController | undefined {
  switch (process.platform) {
    case "win32":  return new WindowsPlaybackController();
    case "darwin":  return new MacOSPlaybackController();
    default:       return undefined;  // 无播放能力，静默运行
  }
}
```

### 9.3 Windows 播放控制器

采用**持久化 PowerShell 子进程**作为播放宿主：

```
WindowsPlaybackController
    │
    ├── ensureHost()
    │   └── spawn("powershell", ["scripts/player-host.ps1"])
    │       常驻进程，通过 stdin/stdout 通信
    │
    ├── send({ action: "play", fileUrl, volumePercent })
    │   └── host.stdin.write(JSON.stringify(command) + "\n")
    │
    └── 读取 host.stdout → { ok: true } 或 { ok: false, error: "..." }
```

**为什么用持久化子进程？** 避免每次播放操作都启动新 PowerShell，减少冷启动延迟。宿主进程通过 JSON 行协议与 Node.js 交互，支持 play/pause/resume/stop/set_volume 五种指令。

**文件路径转换：** 使用 `pathToFileURL()` 将本地路径转为 `file://` URL，确保 PowerShell 能正确解析含空格或中文的路径。

### 9.4 macOS 播放控制器

使用系统自带的 `afplay` 命令：

```
MacOSPlaybackController
    │
    ├── play(track)
    │   └── spawn("afplay", ["-v", volume, filePath])
    │       每次播放启动新进程（afplay 不支持动态控制）
    │
    ├── pause()
    │   └── process.kill(pid, "SIGSTOP")  ← Unix 信号暂停
    │
    ├── resume()
    │   └── process.kill(pid, "SIGCONT")  ← Unix 信号恢复
    │
    └── setVolume(percent)
        └── spawn("osascript", ["-e", "set volume output volume N"])
            调用 AppleScript 设置系统音量
```

**macOS 的局限性：**

- `afplay` 不支持运行时音量调整，调音量只能改系统音量
- 没有像 Windows 那样的双向 JSON 协议宿主
- 暂停/恢复依赖 Unix 信号（`SIGSTOP`/`SIGCONT`），较为底层

---

## 10. 存储层

### 10.1 双驱动策略

```
MUSIC_STORAGE_DRIVER 环境变量
    │
    ├── "sqlite"（默认） → BetterSqlite*Repository 系列
    │                       └── better-sqlite3 + 本地 .db 文件
    │
    └── "json"           → Json*Repository 系列
                            └── JSON 文件读写
```

### 10.2 四个 Repository

| Repository | 存储内容 | SQLite 表 |
|---|---|---|
| `SessionContextRepository` | 会话上下文（当前歌曲、搜索结果） | `session_contexts` |
| `DownloadTaskRepository` | 下载任务记录 | `download_tasks` |
| `FavoritesRepository` | 用户收藏 | `favorites` |
| `PlaylistsRepository` | 歌单 | `playlists` |

### 10.3 Agent 记忆存储

除了基础业务存储，还有三个用于 Agent 层的记忆仓库：

| Repository | 存储内容 | 用途 |
|---|---|---|
| `PreferenceMemoryRepository` | 用户偏好 | 记住用户喜欢的歌手/风格 |
| `BehaviorMemoryRepository` | 用户行为 | 记录操作模式和习惯 |
| `SceneMemoryRepository` | 场景记忆 | 记录时间段、场景关联 |

---

## 11. HTTP 接口与面板

### 11.1 路由表

HTTP 服务器提供以下端点：

| 方法 | 路径 | 功能 |
|---|---|---|
| GET | `/panel` | 返回面板 HTML |
| GET | `/panel/styles.css` | 面板样式表 |
| GET | `/panel/app.js` | 面板 JavaScript |
| GET | `/api/panel/state` | 返回面板实时状态（JSON） |
| POST | `/skill/music/handle` | Skill 接口（文本指令处理） |
| POST | `/agent/music/handle` | Agent 接口（智能 Agent 处理） |

### 11.2 面板状态接口

`GET /api/panel/state` 返回面板渲染所需的全部状态：

```json
{
  "currentTrack": { "title": "晴天", "artist": "周杰伦", ... },
  "playbackStatusLabel": "播放中",
  "feedbackText": "最近下载完成：《晴天》",
  "downloads": [...],
  "favorites": [...],
  "favoriteCount": 12,
  "isCurrentTrackFavorited": true,
  "provider": { "type": "local", "trackCount": 150 },
  "debug": false
}
```

### 11.3 两个处理入口

面板和 OpenClaw 最终都汇入相同的 Handler：

```
浏览器面板 ──→ POST /skill/music/handle ──→ container.musicSkillHandler.handle()
OpenClaw   ──→ registerTool execute()   ──→ container.musicSkillHandler.handle()
                                              │
                                              └──→ 同一处理管线
```

---

## 12. Agent 层（扩展）

除了基础 Skill Handler，项目还包含一个 Agent 层（`src/agent/`），提供更智能的交互能力：

```
MusicAgentService
    │
    ├── ContextManager      ← 跨轮对话上下文
    ├── ActionPlanner       ← 行动规划（简单决策树）
    ├── RecommendationPlanner ← 推荐引擎（基于偏好+行为）
    ├── PreferenceMemory    ← 偏好记忆
    ├── BehaviorMemory      ← 行为记忆
    ├── SceneMemory         ← 场景记忆
    └── HeadsetSessionManager ← 耳机语音会话管理
```

Agent 层通过 `POST /agent/music/handle` 端点提供服务，它在 Skill Handler 基础上叠加了记忆和推荐能力。

---

## 13. 依赖注入容器

`src/app/container.ts` 采用**手动依赖注入**（无 IoC 框架），在应用启动时一次性构建完整的依赖图：

```
createContainer()
    │
    ├── createProvider()
    │   └── MusicProvider（Local 或 Stub）
    │
    ├── createStorageRepositories()
    │   └── SessionContext / DownloadTask / Favorites / Playlists Repository
    │
    ├── new FileDownloader()
    │
    ├── new DialogueManager(sessionContextRepo)
    │
    └── new MusicSkillHandler({
            dialogueManager,
            playMusic: new PlayMusicUseCase(provider),
            pauseMusic: new PauseMusicUseCase(provider),
            addFavorite: new AddFavoriteUseCase(favoritesRepo, currentTrackResolver),
            downloadTrack: new DownloadTrackUseCase(downloader, downloadTaskRepo, resolver),
            ... （14 个 Use Case）
        })
```

**优点：**
- 依赖关系一目了然
- 无运行时反射开销
- 测试时可直接替换任意依赖

---

## 14. 领域模型

### 14.1 核心实体

```typescript
// 曲目
interface Track {
  id: string;          // 唯一标识（本地文件为完整路径）
  title: string;       // 歌曲标题
  artist: string;      // 歌手
  album?: string;      // 专辑
  filePath?: string;   // 本地文件路径
  durationMs?: number; // 时长（毫秒）
  source: string;      // 来源（"local"）
  playable: boolean;   // 是否可播放
  downloadable: boolean; // 是否可下载
}

// 播放状态
interface PlaybackState {
  status: "idle" | "playing" | "paused";
  track: Track | null;
  volumePercent: number;  // 0-100
}

// 歌单
interface Playlist {
  id: string;
  userId: string;
  name: string;
  tracks: Track[];
}

// 下载任务
interface DownloadTask {
  id: string;
  userId: string;
  trackId: string;
  trackTitle: string;
  artistName: string;
  filePath: string;
  status: "completed";
  createdAt: string;
}
```

### 14.2 请求/响应 DTO

```typescript
// 技能请求
interface SkillRequest {
  userId: string;
  sessionId: string;
  inputType: "text" | "voice";
  text: string;
}

// 技能响应
interface SkillResponse {
  status: "success" | "error";
  intent: string;            // 命中的意图
  replyText: string;         // 人类可读的回复文本
  errorCode?: string;
  payload?: {                // 结构化数据
    trackId?: string;
    trackTitle?: string;
    artistName?: string;
    volumePercent?: number;
    playbackStatus?: "idle" | "playing" | "paused";
    playlistName?: string;
    downloadTaskId?: string;
    filePath?: string;
    favoriteCount?: number;
    isFavorited?: boolean;
  };
}
```

---

## 15. 错误处理

### 15.1 错误码体系

| 错误码 | 含义 | 触发场景 |
|---|---|---|
| `INVALID_INPUT` | 输入不合法 | 参数缺失、格式错误 |
| `INTENT_NOT_SUPPORTED` | 意图不支持 | 无法识别的指令 |
| `MUSIC_NOT_FOUND` | 找不到歌曲 | 搜索无结果 |
| `MUSIC_NOT_PLAYING` | 当前没有播放 | 暂停/切歌时无在播歌曲 |
| `PLAYLIST_NOT_FOUND` | 找不到歌单 | 查询不存在的歌单 |
| `DOWNLOAD_FAILED` | 下载失败 | 文件复制出错 |

### 15.2 统一错误响应

MusicSkillHandler 使用 `try-catch` 包裹所有操作，任何 `AppError` 都会被转换为统一的错误响应格式：

```typescript
catch (error) {
  return {
    status: "error",
    intent: "music.unsupported",
    replyText: error.message,
    errorCode: error instanceof AppError ? error.code : "INVALID_INPUT"
  };
}
```

---

## 16. 架构总图

```
┌─────────────────────────────────────────────────────────────┐
│                    输入层 (Input Layer)                       │
│                                                             │
│  ┌──────────┐  ┌─────────────┐  ┌──────────┐  ┌──────────┐│
│  │ OpenClaw │  │ 浏览器面板   │  │浏览器语音│  │ 耳机语音 ││
│  │ LLM Tool │  │ POST /skill │  │ 面板 JS  │  │ Win Only ││
│  └────┬─────┘  └─────┬───────┘  └────┬─────┘  └────┬─────┘│
│       │              │               │              │       │
│       └──────────┬───┴───────────────┴──────────────┘       │
│                  │                                           │
│                  ▼                                           │
├──────────────────────────────────────────────────────────────┤
│              MusicSkillHandler.handle()                      │
│                  │                                           │
│        ┌─────────┼───────────┐                               │
│        ▼         ▼           ▼                               │
│  routeIntent  extractSlots  dialogueManager                  │
│  (正则匹配)   (槽位提取)     (上下文管理)                     │
│        │         │           │                               │
│        └────┬────┘           │                               │
│             ▼                │                               │
├──────────────────────────────────────────────────────────────┤
│           Use Case 层 (14 个独立 Use Case)                   │
│                                                             │
│  PlayMusic│PauseMusic│ResumeMusic│NextTrack│PreviousTrack   │
│  NowPlaying│SetVolume│AddFavorite│ListFavorites              │
│  AddTrackToPlaylist│DownloadTrack│GetDownloadStatus│...      │
│                  │                                           │
├──────────────────┼───────────────────────────────────────────┤
│                  ▼                                           │
│         MusicProvider 接口                                   │
│    ┌──────────────────────────┐                              │
│    │    LocalMusicProvider    │                               │
│    │  ┌────────────────────┐ │                               │
│    │  │ PlaybackController │ │                               │
│    │  │ ┌────────┬───────┐ │ │                               │
│    │  │ │Windows │ macOS │ │ │                               │
│    │  │ │PowerSh │afplay │ │ │                               │
│    │  │ └────────┴───────┘ │ │                               │
│    │  └────────────────────┘ │                               │
│    └──────────────────────────┘                              │
│                                                             │
├──────────────────────────────────────────────────────────────┤
│              存储层 (Storage Layer)                           │
│                                                             │
│    ┌─────────────────┐    ┌──────────────────┐              │
│    │     SQLite       │    │      JSON        │              │
│    │  (默认驱动)      │    │   (降级驱动)     │              │
│    └─────────────────┘    └──────────────────┘              │
│                                                             │
│    SessionContext│Favorites│Playlists│DownloadTasks          │
│    PreferenceMemory│BehaviorMemory│SceneMemory               │
├──────────────────────────────────────────────────────────────┤
│              呈现层 (Presentation Layer)                      │
│                                                             │
│    buildPlaybackReply │ buildFavoriteReply │ ...             │
│    → "正在播放 周杰伦 的《晴天》。"                           │
└──────────────────────────────────────────────────────────────┘
```

### 核心设计原则

1. **接口隔离**：业务层只依赖 `MusicProvider` / `PlaybackController` / `*Repository` 接口，不依赖具体实现
2. **输入归一**：所有入口（OpenClaw Tool、HTTP API、面板）最终都汇入 `MusicSkillHandler.handle(SkillRequest)`
3. **平台无感**：Use Case 不知道自己运行在 Windows 还是 macOS，平台差异被封装在 Controller 工厂中
4. **存储可插拔**：SQLite / JSON 通过 Repository 接口抽象，环境变量一键切换
5. **规则优先**：采用确定性的正则规则引擎而非 LLM 做意图识别，保证零延迟和零成本
