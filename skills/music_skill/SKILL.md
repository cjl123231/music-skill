---
name: music-skill
description: Use the music_control tool to control music through the generated agent `小乐`, and guide OpenClaw to install and run this package on Windows or macOS when asked.
metadata:
  openclaw:
    requires:
      bins: []
      config: []
---

# Music Skill

Use this skill when the user wants to:

- control music playback
- ask about the current song
- manage favorites or downloads
- install this package into OpenClaw
- generate and run the bundled music agent `小乐`

This skill should treat `小乐` as the user-facing entry for music control. The underlying `music_control` tool is the execution layer.

## Local Library Rule

`小乐` is local-library-first.

That means:

- playback depends on the user's local music files
- favorites, playlists, downloads, and recommendations all build on the local library
- if no local library is configured, the runtime may fall back to demo/stub data

When OpenClaw explains setup to the user, it should clearly distinguish:

1. local library source
- controlled by `MUSIC_LIBRARY_DIR`
- this is where the user's own music files should live

2. download output directory
- controlled by `MUSIC_DOWNLOAD_DIR`
- this is where `小乐` saves downloaded tracks or generated download outputs

Recommended explanation to users:

- put your own music files into a dedicated folder
- point `MUSIC_LIBRARY_DIR` to that folder
- then let `小乐` scan and use it as the local library

Examples:

Windows:

```powershell
$env:MUSIC_LIBRARY_DIR="D:\Your\Music"
```

macOS:

```bash
export MUSIC_LIBRARY_DIR="$HOME/Music"
```

Default download output:

- `./downloads`

If the user asks “where should I put my songs?”, answer:

- put them in any folder they control
- then set `MUSIC_LIBRARY_DIR` to that folder
- `小乐` will treat that folder as the music source

## Agent-First Rule

All user-facing music control should be framed as being handled by `小乐`.

- Do not describe the experience as “calling a low-level music tool” unless the user explicitly asks about implementation.
- Prefer wording like “让小乐播放” or “由小乐处理”.
- Keep the technical term `music_control` only for tool invocation.

## Install Rule

If the user asks OpenClaw to install this package, OpenClaw should prefer the bundled repo install flow instead of inventing a custom sequence.

### Windows

Expected behavior:

1. enter the repo directory
2. run the bundled Windows install script
3. if the user also wants to launch the panel or assistant, run the bundled install-and-run script

Preferred Windows commands:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\install-openclaw.ps1
```

If the user also wants install + launch:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\install-and-run.ps1
```

### macOS

Expected behavior:

1. enter the repo directory
2. ensure install scripts are executable
3. run the bundled macOS install script
4. if the user also wants to launch the panel, run the bundled install-and-run script

Preferred macOS commands:

```bash
chmod +x ./scripts/install-openclaw.sh
./scripts/install-openclaw.sh
```

If the user also wants the panel started:

```bash
chmod +x ./scripts/install-and-run.sh
./scripts/install-and-run.sh
```

If OpenClaw only has the packaged tarball and not the repo scripts, fallback to:

```bash
openclaw plugins install /path/to/music-skill-0.2.0.tgz
openclaw gateway restart
```

Windows notes:

- panel is supported
- local playback is supported
- host-level headset voice control is supported
- host-level TTS replies are optional and off by default

macOS notes:

- local playback is supported
- panel is supported
- text control is supported
- browser voice can be used
- Windows-only host-level headset voice features are not available on macOS

## Scenario Matrix

| Scenario | Trigger Examples (ZH) | Trigger Examples (EN) | Action | Required Fields |
|----------|----------------------|----------------------|--------|-----------------|
| 播放指定歌曲 | “播放晴天”“放一首周杰伦的歌” | “play Sunny” “play some Jay Chou” | `action="play"` | `text` = 用户原话 |
| 模糊播放 | “来点音乐”“随便放首歌”“听听歌” | “play something” “play me a song” | `action="play"` | `text` = 用户原话 |
| 播放收藏 | “播放我的收藏”“播放我收藏的录音” | “play my favorites” | `action="play"` | `text` = 用户原话 |
| 暂停播放 | “暂停”“先停一下”“别放了” | “pause” “stop playing” | `action="pause"` | 无 |
| 继续播放 | “继续”“接着放”“恢复播放” | “resume” “continue” “keep playing” | `action="resume"` | 无 |
| 下一首 | “下一首”“切歌”“换一首” | “next” “skip” “next track” | `action="next"` | 无 |
| 上一首 | “上一首”“切回去” | “previous” “go back” | `action="previous"` | 无 |
| 查看当前播放 | “现在放的是什么”“这是什么歌” | “what's playing” “what song is this” | `action="now_playing"` | 无 |
| 设置音量 | “音量调到 30%”“大声一点” | “set volume to 30” “turn up” | `action="set_volume"` | `volumePercent` |
| 收藏歌曲 | “收藏这首歌”“喜欢这首” | “favorite this” “like this song” | `action="favorite_current"` | 无 |
| 加入歌单 | “加入学习歌单”“添加到运动歌单” | “add to workout playlist” | `action="add_current_to_playlist"` | `playlistName` |
| 下载歌曲 | “下载这首歌”“保存这首” | “download this song” | `action="download_current"` | 无 |
| 下载状态 | “下载好了没”“下载进度” | “is download done” | `action="download_status"` | 无 |
| 下载列表 | “查看下载列表”“下载记录” | “show downloads” | `action="list_downloads"` | 无 |
| 按喜好播放 | “按我的喜好播放” | “play what I like” | `action="play_by_preference"` | 无 |
| 不确定 | 不确定是否是音乐请求 | unclear music intent | 不调用 `music_control` | 无 |

## Tool Mapping

| Action | Description | Extra Fields |
|--------|-------------|-------------|
| `play` | 播放歌曲 | `text` = 用户原始请求文本 |
| `pause` | 暂停播放 | 无 |
| `resume` | 恢复播放 | 无 |
| `next` | 下一首 | 无 |
| `previous` | 上一首 | 无 |
| `now_playing` | 查询当前播放 | 无 |
| `set_volume` | 设置音量 | `volumePercent` = 0-100 的整数 |
| `favorite_current` | 收藏当前歌曲 | 无 |
| `add_current_to_playlist` | 加入歌单 | `playlistName` = 歌单名称 |
| `download_current` | 下载当前歌曲 | 无 |
| `download_status` | 查询下载状态 | 无 |
| `list_downloads` | 查看下载列表 | 无 |
| `play_by_preference` | 按用户喜好播放 | 无 |

Always pass `userId` and `sessionId` when the runtime exposes them.

## Behavior Rules

1. 保留原话：`play` 请求必须把用户原话完整传入 `text`。
2. 单步操作：每次只调用一次 `music_control`。
3. 不确定时不调用：如果用户话语可能不是音乐请求，宁可不触发。
4. 结果即回复：直接使用 tool 返回的 `replyText` 作为主体回复。
5. 音量推断：用户说“大声一点”但没给数值时，设 `volumePercent=70`；“小声一点”设 `volumePercent=30`。
6. 歌单名提取：从“加入 XX 歌单”中提取 `playlistName`。
7. 安装时先走仓库脚本：Windows 上优先执行 `.\\scripts\\install-openclaw.ps1` 或 `.\\scripts\\install-and-run.ps1`；macOS 上优先执行 `./scripts/install-openclaw.sh` 或 `./scripts/install-and-run.sh`。

## Error Recovery

| Error Code | Meaning | Guidance |
|------------|---------|----------|
| `MUSIC_NOT_FOUND` | 找不到歌曲 | 建议用户换关键词或换歌曲名称 |
| `MUSIC_NOT_PLAYING` | 当前没有播放 | 提醒用户先播放一首歌 |
| `INTENT_NOT_SUPPORTED` | 指令不支持 | 简短列出支持的音乐操作 |
| `INVALID_INPUT` | 输入不合法 | 给出正确示例 |
| `DOWNLOAD_FAILED` | 下载失败 | 建议稍后重试 |

Do not expose internal error codes verbatim to end users.

## Response Checklist

- 播放类回复包含歌曲名，能带歌手更好
- 找不到歌时给用户替代建议
- 不暴露内部报错细节
- 不重复调用同一个 action
- 回复简洁
- 如果是安装说明，优先给出可直接执行的命令

## Examples

User: 播放周杰伦的晴天  
Action: `music_control` with `action="play"` and `text="播放周杰伦的晴天"`

User: 来点音乐  
Action: `music_control` with `action="play"` and `text="来点音乐"`

User: 暂停  
Action: `music_control` with `action="pause"`

User: 这首歌叫什么  
Action: `music_control` with `action="now_playing"`

User: 音量调到 30%  
Action: `music_control` with `action="set_volume"` and `volumePercent=30`

User: 收藏这首歌  
Action: `music_control` with `action="favorite_current"`

User: 把这首歌加入运动歌单  
Action: `music_control` with `action="add_current_to_playlist"` and `playlistName="运动"`

User: 下载这首歌  
Action: `music_control` with `action="download_current"`

User: 下载好了没  
Action: `music_control` with `action="download_status"`

User: 查看下载列表  
Action: `music_control` with `action="list_downloads"`

User: 在 Mac 上安装这个技能  
Action: instruct OpenClaw to run:

```bash
chmod +x ./scripts/install-openclaw.sh
./scripts/install-openclaw.sh
```

User: 在 Mac 上安装并启动  
Action: instruct OpenClaw to run:

```bash
chmod +x ./scripts/install-and-run.sh
./scripts/install-and-run.sh
```

User: 在 Windows 上安装这个技能  
Action: instruct OpenClaw to run:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\install-openclaw.ps1
```

User: 在 Windows 上安装并启动  
Action: instruct OpenClaw to run:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\install-and-run.ps1
```

## Non-Triggers

These phrases should not trigger `music_control`:

- “放假了”
- “听说今天会下雨”
- “停车”
- “下一步该做什么”
- “收藏这个网页”
