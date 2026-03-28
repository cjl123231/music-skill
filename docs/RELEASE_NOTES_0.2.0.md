# Release Notes 0.2.0

## Summary

`0.2.0` is the first release that feels like a local-first product instead of only a scaffold.

The repo now delivers:
- local music control
- local persistence with SQLite by default
- Windows and macOS playback paths
- browser panel
- Windows headset microphone voice control

## Highlights

### Local Edition Positioning

The project is now clearly framed as `Music Skill Local Edition`.

This means:
- no external model API required
- no music platform API required
- local-first installation and usage

### SQLite Default

Storage now defaults to real SQLite:
- `MUSIC_STORAGE_DRIVER=sqlite`
- `MUSIC_DB_PATH=./data/music-skill.db`

JSON remains available as a fallback.

### Voice Experience

Windows users can now:
- start the panel
- start a host-level voice listener
- use headset microphone commands with the wake phrase `音乐控制`

### Cross-Platform Playback

- Windows: PowerShell playback host
- macOS: `afplay`-based MVP playback path

## Recommended User Entry

Windows:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\install-and-run.ps1
```

macOS:

```bash
./scripts/install-and-run.sh
```

## Known Limits

- macOS host-level voice is not implemented yet
- Node built-in SQLite still emits an experimental warning
- online music, cloud sync, and model-backed agent behavior are not part of the local edition
