import { routeIntent } from "../../application/intents/intent-router.js";
import { IntentTypes } from "../../application/intents/intent-types.js";
import type { AgentContext } from "../core/agent-context.js";
import type { AgentRequest } from "../core/agent-request.js";
import type { GeneratedAgentProfile } from "../runtime/generated-agent.types.js";
import type { AgentPlan } from "./agent-plan.js";

function inferScene(text: string): string | undefined {
  const sceneMap: Array<[RegExp, string]> = [
    [/(?:\u5199\u4ee3\u7801|\u7f16\u7a0b|coding|programming)/i, "coding"],
    [/(?:\u5de5\u4f5c|\u529e\u516c|\u4e13\u6ce8|focus|work)/i, "focus"],
    [/(?:\u5b66\u4e60|\u9605\u8bfb|\u770b\u4e66|study|reading)/i, "study"],
    [/(?:\u8fd0\u52a8|\u5065\u8eab|\u8dd1\u6b65|\u9505\u70bc|workout|exercise|gym|running)/i, "workout"],
    [/(?:\u5b89\u9759|\u8f7b\u4e00\u70b9|calm|quiet|chill)/i, "calm"],
    [/(?:\u653e\u677e|\u4f11\u606f|\u7761\u524d|relax|unwind|bedtime)/i, "relax"],
    [/(?:\u5f00\u8f66|\u901a\u52e4|driving|commute)/i, "commute"]
  ];

  for (const [pattern, scene] of sceneMap) {
    if (pattern.test(text)) {
      return scene;
    }
  }

  return undefined;
}

export class ActionPlanner {
  constructor(private readonly profile?: GeneratedAgentProfile) {}

  private normalizeInput(text: string): string {
    const trimmed = text.trim();
    const wakeWord = this.profile?.identity.wakeWord?.trim();
    if (!wakeWord) {
      return trimmed;
    }

    const escapedWakeWord = wakeWord.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    return trimmed.replace(new RegExp(`^${escapedWakeWord}[，、,.\\s:：]*`, "i"), "").trim();
  }

  plan(request: AgentRequest, context: AgentContext): AgentPlan {
    const text = this.normalizeInput(request.text);

    if (text.length === 0) {
      return {
        type: "reject",
        action: "agent.reject.empty_input",
        replyText: "\u4f60\u8fd8\u6ca1\u6709\u7ed9\u6211\u97f3\u4e50\u6307\u4ee4\u3002"
      };
    }

    const intent = routeIntent(text);

    switch (intent) {
      case IntentTypes.RecommendScene: {
        const scene = inferScene(text) ?? context.activeScene;
        return {
          type: "play_recommended",
          action: "agent.recommend.play",
          scene
        };
      }

      case IntentTypes.RecommendPreference:
        return {
          type: "play_recommended",
          action: "agent.recommend.play",
          scene: context.activeScene
        };

      case IntentTypes.RememberPositive:
        return {
          type: "remember_preference",
          action: "agent.memory.preference.positive",
          sentiment: "positive",
          note: text,
          replyText: `${this.profile?.persona.displayName ?? "\u6211"}\u8bb0\u4f4f\u4e86\uff0c\u540e\u9762\u4f1a\u4f18\u5148\u53c2\u8003\u8fd9\u4e2a\u504f\u597d\u3002`
        };

      case IntentTypes.RememberNegative:
        return {
          type: "remember_preference",
          action: "agent.memory.preference.negative",
          sentiment: "negative",
          note: text,
          replyText: `${this.profile?.persona.displayName ?? "\u6211"}\u8bb0\u4f4f\u4e86\uff0c\u540e\u9762\u4f1a\u5c3d\u91cf\u907f\u5f00\u8fd9\u7c7b\u5185\u5bb9\u3002`
        };

      default:
        return {
          type: "delegate_to_skill",
          action: "agent.delegate.music_skill",
          commandText: text
        };
    }
  }
}
