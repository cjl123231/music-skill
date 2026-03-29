# macOS Voice Control Plan

## Goal

Add host-level voice control for macOS so a user can speak through a headset microphone and control the local music agent without typing.

This should reuse the existing music agent, HTTP API, local playback, and persistence stack as much as possible.

## Non-Goals

- redesign the current music skill architecture
- replace the existing HTTP or agent execution flow
- build a fully offline wake-word engine in the first version
- add a complex device management UI in the first version

## Existing Reusable Pieces

The current repo already provides most of the command execution path:

- HTTP server: `src/interfaces/http/server.ts`
- agent orchestration: `src/agent/core/music-agent.service.ts`
- generated persona and wake word loading: `src/agent/runtime/generated-agent.loader.ts`
- macOS playback control: `src/infrastructure/playback/macos-playback.controller.ts`
- local panel startup flow: `scripts/start-panel.sh`

That means macOS voice support mainly needs a new voice-input layer.

## Proposed Architecture

Split the feature into two processes:

1. native macOS speech bridge
- owns microphone access
- owns speech recognition session
- outputs recognized text as JSON lines to stdout

2. TypeScript voice listener
- launches the native bridge
- reads recognition events
- checks wake word
- sends commands to the existing local agent HTTP endpoint
- optionally speaks short replies with `say`

## High-Level Flow

```text
Headset microphone
-> macOS speech bridge
-> stdout JSONL
-> macOS voice listener
-> wake-word matching
-> POST /agent/music/handle
-> agent response
-> optional TTS via say
```

## Why This Shape

This keeps platform-specific code small and isolated.

- Node/TypeScript remains the orchestration layer
- macOS-native APIs stay in a focused bridge process
- the current music skill logic stays unchanged
- future STT replacements become easier

## Proposed Files

New files:

- `docs/MACOS_VOICE_CONTROL_PLAN.md`
- `scripts/start-voice.sh`
- `src/agent/voice/macos-voice-listener.ts`
- `src/agent/voice/macos-speech-bridge.swift`

Possible future helpers:

- `src/agent/voice/voice-tts.ts`
- `src/agent/voice/wake-word.ts`
- `src/agent/voice/voice-logger.ts`

## Component Responsibilities

### `macos-speech-bridge.swift`

Responsibilities:

- request microphone permission
- request speech recognition permission
- attach to the default input device
- run continuous or chunked recognition
- emit partial and final transcript events
- surface recoverable and fatal errors clearly

Output format recommendation:

```json
{"type":"partial","text":"音乐控制"}
{"type":"final","text":"音乐控制 播放晴天"}
{"type":"error","message":"Speech authorization denied"}
```

Recommended frameworks:

- `AVFoundation`
- `Speech`

### `macos-voice-listener.ts`

Responsibilities:

- spawn the bridge process
- parse JSONL messages from stdout safely
- ignore `partial` events for command execution
- use `final` events to detect wake word
- normalize recognized text into command text
- POST the command to the local agent HTTP endpoint
- optionally run `say` for short spoken replies
- restart the bridge when recoverable failures happen

### `scripts/start-voice.sh`

Responsibilities:

- load project defaults
- ensure the HTTP panel/agent server is available
- start the macOS voice listener
- print clear local usage instructions

## Agent Integration

Use the existing endpoint:

- `POST /agent/music/handle`

Suggested request body:

```json
{
  "userId": "local-macos-user",
  "sessionId": "local-macos-voice",
  "inputType": "text",
  "text": "播放周杰伦的晴天",
  "source": "openclaw"
}
```

The voice listener should strip the wake word before sending the final command when possible.

Example:

- recognized text: `音乐控制 播放晴天`
- command sent to agent: `播放晴天`

## Wake Word Strategy

For MVP, use text-level wake-word matching instead of a dedicated wake-word model.

Wake word source priority:

1. generated agent profile wake word
2. environment override if added later
3. fallback default: `音乐控制`

Matching rules:

- prefix match
- common punctuation-tolerant match
- simple contains match as fallback

Examples:

- `音乐控制，播放晴天`
- `小乐，下一首`
- `音乐控制 帮我暂停`

Normalization rules:

- trim whitespace
- remove punctuation around wake word
- remove the wake word prefix before forwarding

## TTS Strategy

For macOS MVP, use the built-in `say` command.

Suggested env vars:

- `MUSIC_AGENT_TTS_ENABLED`
- `MUSIC_AGENT_TTS_VOICE`
- `MUSIC_AGENT_TTS_RATE`

Behavior:

- default TTS off
- when enabled, only speak short success/error replies
- suppress recognition while TTS is playing to avoid feedback loops

Example:

```bash
say -v Ting-Ting "正在播放周杰伦的晴天"
```

## State Machine

The TypeScript voice listener should maintain a simple runtime state:

- `idle`
- `listening`
- `processing`
- `speaking`
- `error`

Recommended rules:

- do not dispatch a second command while one is processing
- pause or ignore recognition events while speaking
- restart the bridge after recoverable errors
- log transitions for debugging

## Permissions

macOS requires clear handling for:

- microphone permission
- speech recognition permission

Expected UX:

- if permission is missing, print a clear message
- explain which system settings the user needs to open
- do not silently fail

## Failure Handling

Expected failure cases:

- permission denied
- default audio input changes
- speech session stops unexpectedly
- bridge process exits
- HTTP server unavailable
- TTS command fails

Recommended behavior:

- retry bridge startup with backoff
- emit actionable logs
- keep the listener process alive unless failure is fatal

## MVP Scope

Implement in the first version:

- default microphone only
- Chinese short command recognition
- wake-word text matching
- agent HTTP dispatch
- optional TTS with `say`
- simple restart-on-failure behavior

Do not implement in the first version:

- custom device picker UI
- offline wake-word engine
- advanced VAD tuning
- multilingual routing
- rich desktop notifications

## Suggested Rollout

### Phase 1: Push-to-test bridge

Build the native bridge and verify:

- permissions can be requested
- speech text is emitted reliably
- short phrases are recognized

### Phase 2: End-to-end command path

Add the TypeScript listener and verify:

- wake word is detected
- commands are sent to `/agent/music/handle`
- playback actions work on macOS

### Phase 3: TTS and resilience

Add:

- `say` integration
- listener suppression during speech
- automatic bridge restart

### Phase 4: polish

Add:

- better logs
- device change handling
- more robust transcript normalization

## Testing Strategy

Manual tests:

- say `音乐控制，播放晴天`
- say `音乐控制，暂停`
- say `音乐控制，继续播放`
- say `音乐控制，下一首`
- unplug and reconnect headset
- deny permissions and verify error messaging
- enable TTS and verify it does not self-trigger

Automated tests where practical:

- wake-word extraction unit tests
- transcript normalization unit tests
- HTTP dispatch unit tests with mocked fetch
- listener state machine tests

## Open Questions

- Should the MVP use Apple's online recognition path, or require purely local speech?
- Should continuous listening be always on, or user-toggled from the panel?
- Should TTS default to the agent persona name or stay generic?
- Should voice sessions share the same session id as panel interactions?

## Recommendation

The best implementation path for this repo is:

- keep the current music agent and HTTP stack unchanged
- add a small native macOS speech bridge
- let TypeScript own wake-word handling, agent calls, and optional TTS

This gives the project a practical macOS MVP without forcing a rewrite of the existing architecture.
