# Changelog

## 0.2.0

This release turns the project into a stronger local-first OpenClaw music assistant.

### Added

- local edition positioning and planning
- real SQLite storage path using Node built-in `node:sqlite`
- JSON to SQLite migration script
- macOS playback controller and platform-based playback factory
- Windows host-level voice listener for headset microphone control
- combined assistant startup scripts
- browser voice improvements with continuous listening mode

### Improved

- local panel startup flow
- install-and-run scripts
- panel state display
- local storage naming and structure
- cross-platform documentation

### Default Changes

- default storage driver is now `sqlite`
- default database path is now `./data/music-skill.db`
- Windows install-and-run now starts both the panel and the host-level voice listener

### Notes

- macOS host-level voice is still not implemented in this MVP
- Node built-in SQLite currently emits an experimental warning at runtime
