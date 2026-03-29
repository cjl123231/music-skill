# Code Architecture

Music-Skill is now organized around three product-facing layers:

## Frontend

Purpose:
- Render the desktop player UI
- Render the embedded panel UI
- Send user actions to the backend
- Display playback, library, favorites, downloads, and lyrics

Primary entrypoints:
- `desktop/main.cjs`
- `desktop/preload.cjs`
- `ui/panel.html`
- `ui/app.js`
- `ui/styles.css`
- `src/frontend/index.ts`

## Backend

Purpose:
- Own the local runtime process
- Start and expose the HTTP surface used by the desktop player
- Bridge UI actions to provider/player/application services
- Return normalized panel state

Primary entrypoints:
- `src/backend/runtime/create-backend-runtime.ts`
- `src/backend/index.ts`
- `src/interfaces/http/server.ts`
- `src/interfaces/http/server-runner.ts`

## Agent

Purpose:
- Interpret natural language
- Apply memory and preference logic
- Delegate concrete music execution to the skill/backend
- Keep XiaoLe as the single “brain”

Primary entrypoints:
- `src/agent/index.ts`
- `src/app/agent-container.ts`
- `src/agent/core/music-agent.service.ts`
- `src/agent/planning/action-planner.ts`

## Supporting Layers

- `src/application`
  - Use cases, dialogue/session logic, intent routing, response builders
- `src/domain`
  - Entity and service contracts
- `src/infrastructure`
  - Storage, providers, downloads, lyrics, playback hosts
- `src/player`
  - Stable player core (`PlayerEngine`)
- `src/plugin`
  - OpenClaw-facing tool entrypoints
- `src/shared`
  - Common errors and cross-cutting helpers

## Runtime Direction

Target product shape:
- Frontend is only the player surface
- Backend is the stable local runtime
- Agent is the single command brain

That means future work should prefer:
- adding UI in `frontend`
- adding orchestration in `backend`
- adding intent/reasoning/memory in `agent`

and avoid mixing these concerns back into one file or one layer.
