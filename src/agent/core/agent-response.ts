export interface AgentResponse {
  status: "success" | "error";
  action: string;
  replyText: string;
  payload?: Record<string, unknown>;
  memoryEffects?: string[];
  agentName?: string;
  wakeWord?: string;
  reasoning?: string;
  persona?: {
    displayName: string;
    templateId?: string;
    tone: string[];
    style: string[];
  };
}
