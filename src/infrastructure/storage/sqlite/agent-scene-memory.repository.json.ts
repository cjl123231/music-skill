import type { SceneMemoryRepository } from "../../../agent/memory/scene-memory.repository.js";
import type { JsonFileDatabase } from "./db.js";

export class JsonSceneMemoryRepository implements SceneMemoryRepository {
  constructor(private readonly db: JsonFileDatabase) {}

  async getActiveScene(userId: string): Promise<string | undefined> {
    const state = this.db.read();
    return state.agentSceneMemory[userId];
  }

  async setActiveScene(userId: string, scene: string): Promise<void> {
    const state = this.db.read();
    state.agentSceneMemory[userId] = scene;
    this.db.write(state);
  }
}
