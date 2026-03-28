export interface BehaviorMemoryEventRecord {
  userId: string;
  type: string;
  detail: string;
  timestamp: string;
}

export interface BehaviorMemoryRepository {
  record(event: BehaviorMemoryEventRecord): Promise<void>;
  listRecent(userId: string, limit?: number): Promise<BehaviorMemoryEventRecord[]>;
}
