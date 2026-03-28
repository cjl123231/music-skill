import { ContextManager } from "../agent/dialogue/context-manager.js";
import { MusicAgentService } from "../agent/core/music-agent.service.js";
import { BehaviorMemoryServiceImpl } from "../agent/memory/behavior-memory.service.js";
import { PreferenceMemoryServiceImpl } from "../agent/memory/preference-memory.service.js";
import { SceneMemoryServiceImpl } from "../agent/memory/scene-memory.service.js";
import { ActionPlanner } from "../agent/planning/action-planner.js";
import { RecommendationPlanner } from "../agent/planning/recommendation-planner.js";
import { loadGeneratedAgentProfile } from "../agent/runtime/generated-agent.loader.js";
import { HeadsetSessionManager } from "../agent/voice/headset-session-manager.js";
import { createContainer } from "./container.js";
import { createAgentMemoryRepositories, createStorageRepositories } from "../infrastructure/storage/sqlite/storage-factory.js";

export function createAgentContainer() {
  const base = createContainer();
  const profile = loadGeneratedAgentProfile();
  const storage = createStorageRepositories();
  const { preferenceMemoryRepository, behaviorMemoryRepository, sceneMemoryRepository } = createAgentMemoryRepositories();
  const preferenceMemory = new PreferenceMemoryServiceImpl(preferenceMemoryRepository);
  const behaviorMemory = new BehaviorMemoryServiceImpl(behaviorMemoryRepository);

  return {
    profile,
    provider: base.provider,
    musicAgentService: new MusicAgentService({
      musicSkillHandler: base.musicSkillHandler,
      contextManager: new ContextManager(storage.sessionContextRepository),
      planner: new ActionPlanner(profile),
      recommendationPlanner: new RecommendationPlanner(
        base.provider,
        storage.favoritesRepository,
        preferenceMemory,
        behaviorMemory
      ),
      preferenceMemory,
      behaviorMemory,
      sceneMemory: new SceneMemoryServiceImpl(sceneMemoryRepository),
      profile
    }),
    headsetSessionManager: new HeadsetSessionManager()
  };
}
