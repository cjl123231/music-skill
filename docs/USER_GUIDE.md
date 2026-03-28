# Music Skill 用户手册

版本：0.2.0 Local Edition  
最后更新：2026-03-28

## 简介

Music Skill 是一个可安装到 OpenClaw 的本地音乐助手插件。安装后，用户可以通过聊天、面板或语音控制本地音乐播放、收藏、歌单和下载。

当前版本定位是本地版：
- 不依赖外部模型 API
- 不依赖在线音乐平台 API
- 以本地音乐库、本地播放和本地持久化为主

## 环境要求

- Node.js 22+
- `pnpm`
- 已安装并可用的 `openclaw` CLI

支持平台：
- Windows：完整支持
- macOS：MVP 支持，使用 `afplay` 播放本地音频

## 安装

Windows：

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\install-openclaw.ps1
```

macOS：

```bash
./scripts/install-openclaw.sh
```

安装并直接启动：

Windows：

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\install-and-run.ps1
```

macOS：

```bash
./scripts/install-and-run.sh
```

## 启动方式

Windows：

```powershell
pnpm start:panel
pnpm start:voice
pnpm start:assistant
```

macOS：

```bash
./scripts/start-panel.sh
./scripts/start-assistant.sh
```

说明：
- `start:panel` 启动浏览器面板
- `start:voice` 启动 Windows 宿主级语音监听
- `start:assistant` 同时启动面板和语音

## 配置本地音乐库

设置 `MUSIC_LIBRARY_DIR` 指向你的音乐文件夹。

Windows：

```powershell
$env:MUSIC_LIBRARY_DIR = "D:\Your\Music"
pnpm start:assistant
```

macOS：

```bash
export MUSIC_LIBRARY_DIR="$HOME/Music"
./scripts/start-panel.sh
```

支持格式：
- `.mp3`
- `.flac`
- `.wav`
- `.m4a`
- `.aac`
- `.ogg`

## 常用指令

播放控制：
- `播放录音`
- `播放周杰伦的晴天`
- `暂停`
- `继续播放`
- `下一首`
- `上一首`
- `现在播放的是什么`

收藏与歌单：
- `收藏这首歌`
- `查看收藏`
- `播放我的收藏`
- `播放我收藏的晴天`
- `把这首歌加入学习歌单`

下载：
- `下载这首歌`
- `下载好了没`
- `查看下载列表`

Agent 记忆与偏好：
- `记住我喜欢周杰伦`
- `以后别放这种`
- `按我的喜好播放`

场景化推荐：
- `来点适合写代码的`
- `来点安静的`
- `来点适合学习的`
- `来点放松的`
- `来点运动的`

## 面板说明

面板地址通常为：

```text
http://localhost:3000/panel
```

如果端口被占用，服务会自动切换到下一个可用端口。

面板提供：
- 当前播放状态
- 播放控制按钮
- 收藏列表
- 下载任务列表
- 文本输入
- 浏览器语音输入
- 当前人格模板和唤醒词展示
- Agent 推荐理由展示
- 常用语音命令清单

## 语音控制

浏览器语音：
- 在面板中点击“开始语音”
- 允许浏览器使用麦克风
- 说出音乐指令

Windows 宿主级语音：

```powershell
pnpm start:voice
```

默认唤醒词会跟随当前 `music-agent` 配置。  
例如当前人格模板是 `midnight_dj` 时，唤醒词可能是：
- `小乐`

推荐语音命令：
- `小乐，记住我喜欢周杰伦`
- `小乐，以后别放这种`
- `小乐，按我的喜好播放`
- `小乐，来点适合写代码的`
- `小乐，来点安静的`
- `小乐，来点适合学习的`
- `小乐，来点放松的`
- `小乐，来点运动的`

说明：
- Windows 支持宿主级耳机语音监听
- macOS 当前主要使用浏览器内语音

## 存储

默认使用 SQLite：

```text
MUSIC_STORAGE_DRIVER=sqlite
MUSIC_DB_PATH=./data/music-skill.db
```

JSON fallback 仍可用：

```text
MUSIC_STORAGE_DRIVER=json
MUSIC_DB_PATH=./data/music-skill.db.json
```

SQLite 中保存的数据包括：
- 收藏
- 歌单
- 下载记录
- 会话上下文
- Agent 偏好记忆
- Agent 行为事件
- Agent 场景记忆

## 常见问题

### 面板打不开

- 先看终端输出的实际端口
- 如果 `3000` 被占用，程序会自动换端口

### 本地曲库未连接

检查：
- 是否设置了 `MUSIC_LIBRARY_DIR`
- 路径是否存在
- 文件夹里是否有受支持的音频文件

### 下载得到的是 `.txt`

只有当前歌曲没有真实本地文件路径时，才会回退为占位 `.txt`。  
如果是本地音频文件，下载会复制原始音频文件。

### SQLite 警告

Node 内建 `node:sqlite` 目前会打印 `ExperimentalWarning`。  
这不会影响当前功能。

## 快速参考

启动：

```powershell
pnpm start:assistant
```

常用语音：
- `小乐，播放录音`
- `小乐，暂停`
- `小乐，收藏这首歌`
- `小乐，按我的喜好播放`
- `小乐，来点适合学习的`

常用文本：
- `查看收藏`
- `查看下载列表`
- `来点安静的`
