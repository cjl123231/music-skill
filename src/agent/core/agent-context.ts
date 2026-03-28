export interface PreferenceContextSummary {
  positiveCount: number;
  negativeCount: number;
  recentPositiveNotes: string[];
  recentNegativeNotes: string[];
}

export interface AgentContext {
  userId: string;
  sessionId: string;
  currentTrackTitle?: string;
  recentIntent?: string;
  preferences: PreferenceContextSummary;
  activeScene?: string;
}
