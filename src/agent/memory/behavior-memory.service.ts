import type { BehaviorMemoryEventRecord, BehaviorMemoryRepository } from "./behavior-memory.repository.js";

export interface BehaviorEvent extends BehaviorMemoryEventRecord {}

export interface BehaviorMemoryService {
  record(event: BehaviorEvent): Promise<void>;
  listRecent(userId: string, limit?: number): Promise<BehaviorEvent[]>;
}

export class BehaviorMemoryServiceImpl implements BehaviorMemoryService {
  constructor(private readonly repository: BehaviorMemoryRepository) {}

  record(event: BehaviorEvent): Promise<void> {
    return this.repository.record(event);
  }

  listRecent(userId: string, limit?: number): Promise<BehaviorEvent[]> {
    return this.repository.listRecent(userId, limit);
  }
}
