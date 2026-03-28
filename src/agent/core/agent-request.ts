export type AgentInputType = "text" | "voice";
export type AgentSource = "openclaw" | "panel" | "headset_voice";

export interface AgentRequest {
  userId: string;
  sessionId: string;
  inputType: AgentInputType;
  text: string;
  source: AgentSource;
  timestamp: string;
}
