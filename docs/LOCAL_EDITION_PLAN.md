# Local Edition Plan

## Positioning

`Music Skill Local Edition` is a local-first music assistant for OpenClaw.

Its core promise is simple:
- no external model API required
- no online music platform API required
- install locally and use immediately

The product focuses on local music playback, local data persistence, and local voice control.

## Goal

Let users install the skill and then control local music by:
- chat
- typing
- browser voice input
- headset microphone voice input on Windows

without depending on cloud APIs.

## Product Boundary

### In Scope

- local music library scanning
- local audio metadata parsing
- local playback control
- local favorites
- local playlists
- local download records
- local download of real local files
- browser panel
- browser voice control
- Windows host-level voice control
- local persistence with SQLite

### Out Of Scope

- online music search
- online lyrics API
- cloud sync
- cross-device sync
- online recommendation
- third-party music account connection
- large-model-based agent reasoning
- general assistant capabilities outside music

## Architecture

The local edition should stay split into five layers.

### 1. Input Layer

Receives user commands from:
- OpenClaw chat
- panel text input
- panel voice input
- Windows host-level voice listener

### 2. Understanding Layer

Turns natural language into structured actions using local logic only:
- intent routing
- slot extraction
- dialogue context
- synonym and colloquial phrase normalization

This layer should remain deterministic and lightweight.

### 3. Capability Layer

Executes local actions:
- play local track
- pause and resume
- next and previous
- now playing
- set volume
- favorite current track
- add current track to playlist
- download current track
- query downloads

### 4. Storage Layer

Uses local persistence only.

Default:
- SQLite

Stores:
- favorites
- playlists
- download tasks
- session context

### 5. Presentation Layer

Shows the current state to the user via:
- OpenClaw text replies
- browser panel
- playback status
- download list
- recent action feedback

## MVP Requirements

The local edition MVP is considered complete when all of these are usable:

1. Play a local song by title or artist keyword
2. Pause, resume, next, previous
3. Ask what is currently playing
4. Favorite the current song
5. Add the current song to a playlist
6. Download a local song as a real audio file copy
7. Query latest download status
8. Show recent downloads in the panel
9. Use browser voice input for core commands
10. Use Windows headset microphone voice input for core commands

## Core User Flows

### Flow 1: Local Playback

1. User says or types `播放录音`
2. Skill searches the local library
3. Matching local track is resolved
4. Playback starts
5. Panel and text reply update

### Flow 2: Favorite

1. User says `收藏这首歌`
2. Skill resolves current track from session context
3. Track is stored in local favorites
4. User receives confirmation

### Flow 3: Download

1. User says `下载这首歌`
2. Skill resolves current track
3. If the track is a real local file, copy it to the download directory
4. Record the task in local storage
5. Panel shows the task

### Flow 4: Headset Voice Control

1. User runs the host-level voice listener on Windows
2. User says `音乐控制，播放录音`
3. Speech is recognized locally through the microphone path
4. Command is sent to the local skill endpoint
5. Playback result is returned

## Advantages

- no API key required
- no cloud cost
- local privacy
- simpler deployment
- strong offline behavior
- predictable runtime behavior

## Limitations

- language understanding is weaker than a model-backed assistant
- colloquial command coverage must be expanded manually
- no online music content
- no cloud sync
- no deep recommendation or discovery features
- host-level voice is currently strongest on Windows

## Recommended Messaging

Use this wording externally:

`Music Skill Local Edition is a local-first music assistant for OpenClaw that lets users play, favorite, download, and manage local music without external APIs.`

Avoid saying:
- full music agent
- universal voice assistant
- cloud music platform replacement

## Upgrade Path

The local edition is the correct base layer.

Later upgrades can branch into:

### Phase 2

- better local lyrics support
- stronger local colloquial understanding
- better headset voice UX
- macOS host-level voice support

### Phase 3

- optional model API for smarter natural language understanding
- optional music platform APIs
- optional multi-step agent behavior

## Decision Rule

If a feature requires cloud dependency, ask this first:

`Can the local edition still deliver the main user value without it?`

If yes, keep it out of MVP.
