import { z } from "zod";

export const agentRequestSchema = z.object({
  userId: z.string(),
  sessionId: z.string(),
  inputType: z.enum(["text", "voice"]),
  text: z.string().min(1),
  source: z.enum(["openclaw", "panel", "headset_voice"]).default("openclaw"),
  timestamp: z.string().datetime().optional()
});

export type AgentRequestInput = z.infer<typeof agentRequestSchema>;
