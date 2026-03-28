# Install OpenClaw

## Goal

Install this repo as an OpenClaw plugin, generate the bundled `music-agent`, and start using it with the smallest possible manual setup.

## Prerequisites

- Node.js 22+
- `pnpm`
- `openclaw` CLI available in `PATH`

Supported platforms:
- Windows
- macOS

## Recommended Install

Windows:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\install-openclaw.ps1
```

macOS:

```bash
./scripts/install-openclaw.sh
```

What it does:
- runs `pnpm install --frozen-lockfile`
- generates the `music-agent` scaffold
- installs the plugin with `openclaw plugins install --link`
- restarts the OpenClaw gateway

## Install With Persona Template

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

Available templates:

```powershell
pnpm generate:agent -- --list-templates
```

## Install And Launch Panel

Windows:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\install-and-run.ps1
```

macOS:

```bash
./scripts/install-and-run.sh
```

This performs the install steps above and then starts the browser panel. On Windows it also starts the host-level voice listener.

## Manual Install

Windows:

```powershell
pnpm install --frozen-lockfile
pnpm generate:agent
openclaw plugins install --link D:\Music-Skill
openclaw gateway restart
```

macOS:

```bash
pnpm install --frozen-lockfile
pnpm generate:agent
openclaw plugins install --link /path/to/Music-Skill
openclaw gateway restart
```

## Install From Tarball

Package first:

```powershell
pnpm pack:plugin
```

Then install:

```powershell
openclaw plugins install D:\Music-Skill\music-skill-0.2.0.tgz
openclaw gateway restart
```

## Verification

```powershell
openclaw plugins list
openclaw skills list
```

Expected results:
- plugin `music-skill`
- skill `music_skill`

## Tool Allowlist

If your OpenClaw runtime restricts tools, allow one of these:

```json
{
  "tools": {
    "allow": ["music_control"]
  }
}
```

or:

```json
{
  "tools": {
    "allow": ["music-skill"]
  }
}
```

## Local Panel

Windows:

```powershell
pnpm start:panel
```

macOS:

```bash
./scripts/start-panel.sh
```

If `PORT` is busy, the server automatically tries the next free port and prints the final address.

Open:

```text
http://localhost:<printed-port>/panel
```

## Local Library

To use a real music folder:

Windows:

```powershell
$env:MUSIC_LIBRARY_DIR = "D:\Your\Music"
pnpm start:panel
```

macOS:

```bash
export MUSIC_LIBRARY_DIR="$HOME/Music"
./scripts/start-panel.sh
```

If `MUSIC_LIBRARY_DIR` is not set, the start script defaults it to the project root.

## What Users Can Do After Install

- play a local song
- pause and resume playback
- ask what is currently playing
- change volume
- favorite the current song
- add the current song to a playlist
- download the current song
- ask for download status
- inspect recent downloads
- use persona-driven recommendations such as `按我的喜好播放`

## Notes

- Real local tracks download as their original audio files.
- Tracks without a real local file path still fall back to a placeholder text file.
- The browser panel is optional. The OpenClaw tool path works without it.
- On macOS, playback uses `afplay` in the MVP implementation.
