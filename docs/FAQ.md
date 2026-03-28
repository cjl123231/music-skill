# FAQ

## Why does the panel not open on port 3000?

Another process is already using that port. The panel now automatically tries the next free port and prints the final address in the console.

## Why is the library shown as not connected?

`MUSIC_LIBRARY_DIR` is not set, the folder does not exist, or no supported audio files were found.

## Why did download create a `.txt` file instead of audio?

That happens only when the current track does not resolve to a real local audio file path. Real local tracks are downloaded as their original audio files.

## Why does voice input not work?

The browser must support `SpeechRecognition` or `webkitSpeechRecognition`, and microphone permission must be granted.

## What audio formats are supported for local scanning?

`.mp3`, `.flac`, `.wav`, `.m4a`, `.aac`, and `.ogg`.

## Do users need the panel to use the plugin?

No. The panel is optional. OpenClaw can use the plugin tool path directly.

## Does the project use real SQLite now?

It can. Set:

```text
MUSIC_STORAGE_DRIVER=sqlite
```

and use a SQLite file path such as:

```text
MUSIC_DB_PATH=./data/music-skill.db
```

This is now the default. JSON remains available as a fallback with:

```text
MUSIC_STORAGE_DRIVER=json
MUSIC_DB_PATH=./data/music-skill.db.json
```

## How should users install it?

Windows:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\install-openclaw.ps1
```

macOS:

```bash
./scripts/install-openclaw.sh
```

Or install and launch the panel.

Windows:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\install-and-run.ps1
```

macOS:

```bash
./scripts/install-and-run.sh
```

## Does macOS work?

Yes, for the MVP path. macOS playback uses `afplay`, so local file playback works, but advanced runtime control is less polished than the Windows implementation.

## Can users wear headphones and control music by voice?

Yes.

- In the browser panel, users can click the voice button and speak through the headset microphone.
- On Windows, users can also run:

```powershell
pnpm start:voice
```

This is a host-level voice entry that listens to the default microphone and sends commands to the local skill endpoint.

The default wake phrase is:

```text
音乐控制
```
