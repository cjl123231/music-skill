# Voice Response MVP

## Goal

Let the generated `music-agent` speak short replies back to the user after headset voice commands.

## Scope

Current MVP:

- platform: Windows
- transport: local PowerShell host listener
- synthesis: `System.Speech.Synthesis.SpeechSynthesizer`
- trigger point: after `/agent/music/handle` returns an `AgentResponse`

Not included yet:

- macOS host-level TTS
- browser-side TTS
- persona-specific voice selection
- long-form spoken summaries

## Runtime Flow

```text
Headset microphone
  -> SpeechRecognitionEngine
  -> wake word stripping
  -> POST /agent/music/handle
  -> AgentResponse.replyText
  -> local TTS speaks concise reply
```

## Default Behavior

- TTS is enabled by default in `start-assistant.ps1`
- default mode is `short`
- list-style responses such as favorite lists and download lists are not spoken

## Configuration

```text
MUSIC_AGENT_TTS_ENABLED=true
MUSIC_AGENT_TTS_MODE=short
MUSIC_AGENT_TTS_RATE=0
MUSIC_AGENT_TTS_VOLUME=100
```

`MUSIC_AGENT_TTS_MODE`:

- `short`: speak concise replies only
- `full`: speak the full reply text
- `off`: disable spoken replies

## Design Notes

- The spoken layer reuses `AgentResponse.replyText` instead of inventing a second response channel.
- Short mode avoids noisy playback for lists and long reasoning text.
- This keeps the local edition offline and dependency-light.
