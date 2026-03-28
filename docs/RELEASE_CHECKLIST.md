# Release Checklist

## Before Shipping

- `pnpm install`
- `pnpm check`
- `pnpm test`
- `pnpm pack:plugin`

## Install Validation

- `openclaw plugins install --link <project-path>`
- `openclaw gateway restart`
- `openclaw plugins list`
- `openclaw skills list`

Expected:
- plugin `music-skill`
- skill `music_skill`

## Functional Validation

- play a local song
- pause and resume playback
- query now playing
- favorite current song
- add current song to a playlist
- download current song
- query download status
- list recent downloads

## Panel Validation

- `pnpm start:panel`
- open `/panel`
- verify provider status is visible
- verify command input works
- verify quick buttons work
- verify voice button is visible
- verify download list updates

## Packaging Validation

- tarball contains `ui/`
- tarball contains `scripts/`
- tarball contains `skills/`
- tarball contains `openclaw.plugin.json`

## Delivery Notes

- recommend `scripts/install-openclaw.ps1` for install
- recommend `scripts/install-and-run.ps1` for install plus panel
- tell users to set `MUSIC_LIBRARY_DIR` if they want a real local library
