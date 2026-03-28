export interface SceneMemoryRepository {
  getActiveScene(userId: string): Promise<string | undefined>;
  setActiveScene(userId: string, scene: string): Promise<void>;
}
