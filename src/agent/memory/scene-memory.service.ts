import type { SceneMemoryRepository } from "./scene-memory.repository.js";

export interface SceneMemoryService {
  getActiveScene(userId: string): Promise<string | undefined>;
  setActiveScene(userId: string, scene: string): Promise<void>;
}

export class SceneMemoryServiceImpl implements SceneMemoryService {
  constructor(private readonly repository: SceneMemoryRepository) {}

  getActiveScene(userId: string): Promise<string | undefined> {
    return this.repository.getActiveScene(userId);
  }

  setActiveScene(userId: string, scene: string): Promise<void> {
    return this.repository.setActiveScene(userId, scene);
  }
}
