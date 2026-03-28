# macOS Adaptation Plan

## Goal

Make `music-skill` usable on macOS without rewriting the existing OpenClaw plugin, intent routing, panel, or local library logic.

The adaptation should preserve the current architecture and replace only the Windows-specific edges.

## Current Windows Binding Points

The current repo is Windows-first in three places:

1. Playback runtime
   - [src/infrastructure/playback/windows-playback.controller.ts](/D:/Music-Skill/src/infrastructure/playback/windows-playback.controller.ts)
   - [scripts/player-host.ps1](/D:/Music-Skill/scripts/player-host.ps1)
2. Provider assembly
   - [src/infrastructure/providers/provider-manager.ts](/D:/Music-Skill/src/infrastructure/providers/provider-manager.ts)
   - local provider is hard-wired to `WindowsPlaybackController`
3. Install and startup scripts
   - [scripts/install-openclaw.ps1](/D:/Music-Skill/scripts/install-openclaw.ps1)
   - [scripts/install-and-run.ps1](/D:/Music-Skill/scripts/install-and-run.ps1)
   - [scripts/start-panel.ps1](/D:/Music-Skill/scripts/start-panel.ps1)

Everything else is mostly platform-neutral:

- OpenClaw plugin registration
- intent parsing
- download logic
- local library scanning
- metadata parsing
- HTTP panel
- persistence

## Recommended macOS Strategy

Use a dedicated macOS playback controller based on `afplay` for MVP.

Why this route:

- built into macOS
- no extra app dependency
- works with local audio files directly
- easy to spawn from Node
- enough for play, stop, next, previous, and coarse pause/resume

Avoid using Music.app as the primary backend for MVP:

- it assumes the user works inside Apple Music
- arbitrary local file playback is less predictable
- playback state and queue behavior become app-dependent

## Playback Design

### MVP Choice

Implement:

- `MacOSPlaybackController`
- backend process model: direct `afplay` child process from Node

### Command Mapping

`play(track)`
- kill existing `afplay` process if any
- spawn `afplay <filePath>`
- keep child process handle
- store current track path and volume

`pause()`
- send `SIGSTOP` to the `afplay` process

`resume()`
- send `SIGCONT` to the `afplay` process

`stop()`
- kill the `afplay` process

`setVolume(percent)`
- store the latest volume
- if playing, restart `afplay` with the new `-v` value

Notes:

- `afplay` supports `-v` volume but not rich runtime control
- pause/resume via `SIGSTOP` and `SIGCONT` is workable for MVP
- changing volume mid-playback is the weakest part; restarting playback is acceptable for MVP but not ideal UX

## Alternative Design For Later

If better playback control is required, add a second macOS backend:

- AVFoundation host via `swift`
- or AppleScript + QuickTime / Music.app integration

That would allow:

- more accurate resume
- better volume control
- playback position support
- richer “now playing” synchronization

But it increases maintenance and packaging complexity. It should be phase 2, not phase 1.

## Code Changes

### 1. Add A macOS Playback Controller

New file:

- `src/infrastructure/playback/macos-playback.controller.ts`

Responsibilities:

- manage one `afplay` child process
- implement the existing [PlaybackController](/D:/Music-Skill/src/domain/services/playback-controller.ts) interface
- normalize macOS-specific process behavior

### 2. Introduce Playback Controller Factory

Current problem:

- [provider-manager.ts](/D:/Music-Skill/src/infrastructure/providers/provider-manager.ts) directly imports `WindowsPlaybackController`

Refactor:

- add `src/infrastructure/playback/create-playback-controller.ts`

Proposed behavior:

- `win32` -> `WindowsPlaybackController`
- `darwin` -> `MacOSPlaybackController`
- other platforms -> `undefined` or a no-op controller

Then update provider assembly to depend on the factory, not a concrete class.

### 3. Keep LocalMusicProvider Unchanged

[LocalMusicProvider](/D:/Music-Skill/src/infrastructure/providers/local/local-music.provider.ts) already depends only on the `PlaybackController` interface.

That means:

- no domain changes required
- no use-case changes required
- no handler changes required

This is the right seam. Keep it.

### 4. Add Cross-Platform Startup Scripts

Add:

- `scripts/install-openclaw.sh`
- `scripts/install-and-run.sh`
- `scripts/start-panel.sh`

Responsibilities:

- install dependencies with `pnpm`
- install plugin into OpenClaw
- restart gateway
- set `MUSIC_LIBRARY_DIR` if needed
- launch panel

Keep the `.ps1` scripts for Windows. The repo should expose both.

### 5. Update Documentation

Update:

- [README.md](/D:/Music-Skill/README.md)
- [docs/INSTALL_OPENCLAW.md](/D:/Music-Skill/docs/INSTALL_OPENCLAW.md)
- [docs/FAQ.md](/D:/Music-Skill/docs/FAQ.md)

New guidance should explicitly separate:

- Windows install commands
- macOS install commands
- feature parity limits on macOS

## Feature Parity Matrix

### Can support in macOS MVP

- local library scan
- metadata parsing
- play local file
- pause
- resume
- stop
- next
- previous
- favorites
- playlists
- download real local files
- panel
- voice input in browser

### Partial / imperfect in macOS MVP

- volume changes during active playback
- exact playback progress
- exact “now playing” synchronization after manual OS-level interference

### Not in scope for macOS MVP

- system media key integration
- Apple Music library control
- album artwork extraction and native media session sync

## Risks

### 1. `afplay` process control is coarse

Impact:

- pause/resume is process-signal based
- volume changes are not elegant during active playback

Mitigation:

- document MVP limitation
- keep AVFoundation backend as phase 2

### 2. OpenClaw runtime environment on macOS may differ

Impact:

- shell path assumptions may fail
- `openclaw` CLI location may differ

Mitigation:

- use `/bin/bash` scripts
- check `command -v pnpm`
- check `command -v openclaw`

### 3. Audio codec differences

Impact:

- some files may scan but not play depending on system support

Mitigation:

- keep supported extensions list
- return clear playback errors to the UI

## Delivery Plan

### Phase 1

- add `MacOSPlaybackController`
- add playback factory
- update provider manager
- add `.sh` scripts
- update docs

Exit criteria:

- macOS user can install plugin
- panel can open
- local file can play, pause, resume, next, previous
- local file download creates a real audio copy

### Phase 2

- improve macOS volume handling
- improve playback state tracking
- optional AVFoundation backend

### Phase 3

- unify Windows and macOS startup UX
- optional Linux fallback design

## Recommended Implementation Order

1. playback controller factory
2. `MacOSPlaybackController`
3. macOS shell scripts
4. docs update
5. smoke tests on macOS

## Acceptance Criteria

A macOS user should be able to:

1. clone the repo
2. run the macOS install script
3. install the plugin into OpenClaw
4. point `MUSIC_LIBRARY_DIR` at a local music folder
5. open the panel
6. play a local song
7. pause and resume it
8. download the current song as a real audio file

If these eight steps work, macOS support is good enough for `v0.2` MVP.
