export type PreferenceSentiment = "positive" | "negative";

export type AgentPlan =
  | {
      type: "delegate_to_skill";
      action: string;
      commandText: string;
    }
  | {
      type: "play_recommended";
      action: string;
      scene?: string;
    }
  | {
      type: "remember_preference";
      action: string;
      sentiment: PreferenceSentiment;
      note: string;
      replyText: string;
    }
  | {
      type: "reject";
      action: string;
      replyText: string;
    };
