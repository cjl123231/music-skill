import { applyGeneratedAgentEnvironment } from "../../agent/runtime/generated-agent.env.js";
import { loadGeneratedAgentProfile } from "../../agent/runtime/generated-agent.loader.js";

const profile = loadGeneratedAgentProfile();
applyGeneratedAgentEnvironment(profile);

const { createHttpServer } = await import("./server.js");

const server = createHttpServer();
const preferredPort = Number(process.env.PORT ?? 3000);
const maxAttempts = 20;

function listen(port: number, attempt = 0) {
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
