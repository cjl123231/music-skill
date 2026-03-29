import { applyGeneratedAgentEnvironment } from "../../agent/runtime/generated-agent.env.js";
import { loadGeneratedAgentProfile } from "../../agent/runtime/generated-agent.loader.js";
import { createHttpServer } from "../../interfaces/http/server.js";

export interface BackendRuntime {
  profile: ReturnType<typeof loadGeneratedAgentProfile>;
  server: ReturnType<typeof createHttpServer>;
  start: (preferredPort?: number, maxAttempts?: number) => void;
}

export function createBackendRuntime(): BackendRuntime {
  const profile = loadGeneratedAgentProfile();
  applyGeneratedAgentEnvironment(profile);

  const server = createHttpServer();

  function start(preferredPort = Number(process.env.PORT ?? 3000), maxAttempts = 20): void {
    function listen(port: number, attempt = 0): void {
      server.once("error", (error: NodeJS.ErrnoException) => {
        if (error.code === "EADDRINUSE" && attempt < maxAttempts) {
          listen(port + 1, attempt + 1);
          return;
        }

        throw error;
      });

      server.listen(port, () => {
        console.log(`Music Agent HTTP server listening on http://localhost:${port}`);
        console.log(`Agent: ${profile.persona.displayName}`);
        console.log(`Wake word: ${profile.identity.wakeWord}`);
      });
    }

    listen(preferredPort);
  }

  return {
    profile,
    server,
    start
  };
}
