# Music Agent Persona Architecture

## Goal

After a user installs the Music Skill, OpenClaw should be able to generate a standalone `Music Agent` in a fixed directory.

This agent is not just a playback tool. It should behave like a configurable music assistant with:
- a name
- a role
- a personality
- long-term memory
- tool bindings
- panel and voice entrypoints

The top-level behavior should be editable through Markdown files rather than TypeScript changes.

## Positioning

Use a two-layer model:

1. `Music Skill Installer`
- installed into OpenClaw as the entry package
- responsible for generating and maintaining the agent directory
- responsible for wiring OpenClaw to the generated agent

2. `Generated Music Agent`
- the long-running, user-facing assistant
- owns persona, memory, triggers, runtime config, and logs
- uses the existing music execution layer under the hood

## Fixed Directory

Recommended target directory:

```text
{OPENCLAW_HOME}/agents/music-agent/
```

Resolution order:

1. `OPENCLAW_HOME`
2. Windows: `%USERPROFILE%\\.openclaw`
3. macOS/Linux: `$HOME/.openclaw`

Final generated root:

```text
{resolved_openclaw_home}/agents/music-agent
```

## Generated Structure

```text
music-agent/
  agent.json
  AGENT.md
  PERSONA.md
  MEMORY_POLICY.md
  TRIGGERS.md
  config/
    env.json
  memory/
    .gitkeep
  downloads/
    .gitkeep
  logs/
    .gitkeep
  runtime/
    panel/
      .gitkeep
    voice/
      .gitkeep
    tools/
      .gitkeep
```

## File Responsibilities

### `agent.json`

Machine-readable agent definition.

Suggested fields:
- `id`
- `name`
- `description`
- `version`
- `entryMode`
- `personaFiles`
- `memoryDir`
- `downloadDir`
- `runtime`
- `toolBindings`

### `AGENT.md`

Defines:
- who this agent is
- what it is responsible for
- what it should and should not do
- how it should collaborate with OpenClaw

### `PERSONA.md`

Defines:
- display name
- role
- tone
- personality
- speaking style
- response boundaries

This is the main file users can edit to change character and naming.

### `MEMORY_POLICY.md`

Defines:
- what to remember
- what not to remember
- how preferences evolve
- how long-term memory should influence recommendations

### `TRIGGERS.md`

Defines:
- wake phrase
- command styles
- scenario expressions
- preference-learning triggers

### `config/env.json`

Runtime configuration, for example:
- `musicLibraryDir`
- `downloadDir`
- `storageDriver`
- `panelPort`
- `wakeWord`

## Runtime Model

The generated agent should remain thin at the top and reuse the current execution layer.

Recommended split:

1. Persona Layer
- Markdown-driven behavior
- role, tone, rules, memory policy

2. Agent Brain
- intent understanding
- memory lookup
- recommendation planning
- delegation decisions

3. Capability Layer
- playback
- favorites
- playlists
- downloads
- library scan

4. Feedback Layer
- panel
- voice status
- OpenClaw response

## Editing Model

Goal: allow users to retheme the agent without touching TS code.

Users should be able to modify:
- `PERSONA.md`
- `AGENT.md`
- `TRIGGERS.md`
- `config/env.json`

Typical examples:
- rename the agent from `Music Agent` to `Midnight DJ`
- change tone from `professional` to `warm and playful`
- switch wake word from `音乐控制` to `小乐`

## Installation Lifecycle

Recommended flow:

1. User installs the Music Skill package
2. Installer resolves OpenClaw home
3. Installer checks whether `agents/music-agent` already exists
4. If not, generate the full agent scaffold
5. If yes, preserve user-edited Markdown and only fill missing files
6. OpenClaw routes music requests to the generated agent

## Safety Rules

Generation should:
- never overwrite user-edited persona files by default
- only create missing files unless `force` is explicitly requested
- keep all user memory inside the generated agent directory

## Phase Plan

### Phase 1
- generate agent directory
- generate Markdown persona files
- generate `agent.json`
- generate default config

### Phase 2
- wire OpenClaw install flow to auto-run generator
- route panel and voice startup to generated agent config

### Phase 3
- support multiple persona presets
- support cloning a new agent from a template
- support live reload after Markdown edits

## Success Criteria

- A fresh install generates a complete `music-agent/` directory automatically
- The generated agent can be renamed and rethemed by editing Markdown files
- The current music runtime can read the generated config without breaking playback features
