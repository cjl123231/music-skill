# XiaoLe Music Agent

An installable OpenClaw plugin that boots a **desktop-first local music player** with a generated XiaoLe agent.

## Before You Start

This project does **not** ship with music files.

Users must prepare their own local music library first.

- `MUSIC_LIBRARY_DIR`
  - points to the folder that stores the user's own music files
  - XiaoLe scans this folder and treats it as the playback source
- `MUSIC_DOWNLOAD_DIR`
  - points to the download output folder
  - downloaded tracks or generated download outputs are written here

If a user asks where songs should be placed, the correct answer is:

- put the songs into any folder they control
- point `MUSIC_LIBRARY_DIR` to that folder
- then let XiaoLe use that folder as the local library

## Product Shape

This repo now behaves in two layers:

1. `Music Skill`
- installed into OpenClaw as the plugin entry
- exposes XiaoLe to the OpenClaw runtime

2. `Music Agent`
- generated automatically during install
- created in a fixed OpenClaw agent directory
- owns persona, memory policy, triggers, and runtime config

Default generated directory:

```text
{OPENCLAW_HOME}/agents/music-agent
```

Fallback when `OPENCLAW_HOME` is not set:

```text
Windows: %USERPROFILE%\.openclaw\agents\music-agent
macOS:   $HOME/.openclaw/agents/music-agent
```

The generated agent includes editable files such as:

- `AGENT.md`
- `PERSONA.md`
- `MEMORY_POLICY.md`
- `TRIGGERS.md`
- `config/env.json`

That means users can change:

- agent name
- role
- personality
- tone
- wake word

without editing TypeScript code.

## Local Edition

This repo is currently a local-first edition:

- no external model API is required
- no online music platform API is required
- users can install it locally and control local music immediately

The local edition focuses on:

- local music library scanning
- local playback
- local favorites and playlists
- local download records
- local voice control
- local persistence with SQLite
- desktop player runtime as the primary user experience

## Requirements

- Node.js 22+
- `pnpm`
- `openclaw` CLI

Supported platforms:

- Windows: supported now
- macOS: MVP supported for local playback with `afplay` and system volume control via `osascript`

## Quick Install

Windows:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\install-openclaw.ps1
```

macOS:

```bash
chmod +x ./scripts/install-openclaw.sh
./scripts/install-openclaw.sh
```

What it does:

- installs project dependencies
- generates the `music-agent` scaffold
- installs the plugin into OpenClaw with `--link`
- restarts the OpenClaw gateway

## Install And Run

Windows:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\install-and-run.ps1
```

macOS:

```bash
chmod +x ./scripts/install-and-run.sh
./scripts/install-and-run.sh
```

Windows behavior:

- installs the plugin
- generates the music agent
- starts the XiaoLe desktop player

macOS behavior:

- installs the plugin
- generates the music agent
- starts the panel

## Desktop Player

Primary startup path on Windows:

```powershell
pnpm desktop:start
```

This launches XiaoLe as a desktop player window and starts the local backend automatically.

The browser panel remains available as a runtime surface, but it is no longer the preferred user entry.

Other startup commands:

```powershell
pnpm start:panel
pnpm start:voice
pnpm start:assistant
pnpm start:tray
```

## Generate Agent Only

```powershell
pnpm generate:agent
```

Example with custom persona:

```powershell
pnpm generate:agent -- --name "Midnight DJ" --persona "夜航电台" --wake-word "小乐"
```

Template examples:

```powershell
pnpm generate:agent -- --list-templates
pnpm generate:agent -- --template midnight_dj --force
pnpm generate:agent -- --template study_buddy --force
```

You can also choose the template during install.

Windows:

```powershell
$env:MUSIC_AGENT_TEMPLATE="midnight_dj"
powershell -ExecutionPolicy Bypass -File .\scripts\install-openclaw.ps1
```

macOS:

```bash
export MUSIC_AGENT_TEMPLATE=study_buddy
./scripts/install-openclaw.sh
```

The generator is non-destructive by default. Existing persona Markdown files are kept unless `--force` is passed.

## Local Music Library

To scan a real local library:

Windows:

```powershell
$env:MUSIC_LIBRARY_DIR = "D:\Your\Music"
pnpm desktop:start
```

macOS:

```bash
export MUSIC_LIBRARY_DIR="$HOME/Music"
./scripts/start-panel.sh
```

Supported file types:

- `.mp3`
- `.flac`
- `.wav`
- `.m4a`
- `.aac`
- `.ogg`

The scanner reads audio metadata when available and falls back to the filename.

## Storage Driver

Default:

```text
MUSIC_STORAGE_DRIVER=sqlite
MUSIC_DB_PATH=./data/music-skill.db
```

Agent memory retention defaults:

```text
MUSIC_AGENT_PREFERENCE_MEMORY_LIMIT=50
MUSIC_AGENT_BEHAVIOR_MEMORY_LIMIT=200
MUSIC_AGENT_BEHAVIOR_WINDOW=20
```

These control:

- how many preference notes are kept per user
- how many behavior events are retained per user
- how many recent behavior events are used during recommendation scoring

JSON fallback is still available:

```text
MUSIC_STORAGE_DRIVER=json
MUSIC_DB_PATH=./data/music-skill.db.json
```

To migrate existing JSON data into SQLite:

```powershell
pnpm migrate:sqlite
```

## OpenClaw Usage

Users can type or say:

- `播放录音`
- `暂停`
- `继续播放`
- `现在播放的是什么`
- `收藏这首歌`
- `把这首歌加入学习歌单`
- `下载这首歌`
- `下载好了没`
- `查看下载列表`
- `按我的喜好播放`
- `来点安静的`

For Windows host-level voice mode, common phrases are:

- `小乐，播放录音`
- `小乐，收藏这首歌`
- `小乐，下载这首歌`
- `小乐，按我的喜好播放`

If your OpenClaw runtime uses a tool allowlist, allow either:

- `music_control`
- `music-skill`

## Packaging

Build a distributable plugin package:

```powershell
pnpm pack:plugin
```

The output tarball is created in the project root.

## Development

```powershell
pnpm install
pnpm check
pnpm test
pnpm dev:http
pnpm desktop:start
```

## Important Files

- [openclaw.plugin.json](/D:/Music-Skill/openclaw.plugin.json)
- [skills/music_skill/SKILL.md](/D:/Music-Skill/skills/music_skill/SKILL.md)
- [src/plugin/index.ts](/D:/Music-Skill/src/plugin/index.ts)
- [src/plugin/music-control.tool.ts](/D:/Music-Skill/src/plugin/music-control.tool.ts)
- [src/player/core/player-engine.ts](/D:/Music-Skill/src/player/core/player-engine.ts)
- [desktop/main.cjs](/D:/Music-Skill/desktop/main.cjs)
- [desktop/preload.cjs](/D:/Music-Skill/desktop/preload.cjs)
- [src/agent/core/music-agent.service.ts](/D:/Music-Skill/src/agent/core/music-agent.service.ts)
- [src/agent/generator/music-agent-generator.ts](/D:/Music-Skill/src/agent/generator/music-agent-generator.ts)
- [src/application/intents/intent-router.ts](/D:/Music-Skill/src/application/intents/intent-router.ts)
- [scripts/generate-music-agent.ts](/D:/Music-Skill/scripts/generate-music-agent.ts)
- [docs/DESKTOP_PLAYER_PLAN.md](/D:/Music-Skill/docs/DESKTOP_PLAYER_PLAN.md)
- [docs/PLAYER_AGENT_REFACTOR_PLAN.md](/D:/Music-Skill/docs/PLAYER_AGENT_REFACTOR_PLAN.md)
