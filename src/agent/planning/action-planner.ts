import { routeIntent } from "../../application/intents/intent-router.js";
import { IntentTypes } from "../../application/intents/intent-types.js";
import type { AgentContext } from "../core/agent-context.js";
import type { AgentRequest } from "../core/agent-request.js";
import type { GeneratedAgentProfile } from "../runtime/generated-agent.types.js";
import type { AgentPlan } from "./agent-plan.js";

function inferScene(text: string): string | undefined {
  const sceneMap: Array<[RegExp, string]> = [
    [/(写代码|编程|coding|programming)/i, "coding"],
    [/(工作|办公|专注|focus|work)/i, "focus"],
    [/(学习|阅读|看书|study|reading)/i, "study"],
    [/(运动|健身|跑步|锻炼|workout|exercise|gym|running)/i, "workout"],
    [/(安静|轻一点|calm|quiet|chill)/i, "calm"],
    [/(放松|休息|睡前|relax|unwind|bedtime)/i, "relax"],
    [/(开车|通勤|driving|commute)/i, "commute"]
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
    return trimmed.replace(new RegExp(`^${escapedWakeWord}[，。\\s]*`, "i"), "").trim();
  }

  plan(request: AgentRequest, context: AgentContext): AgentPlan {
    const text = this.normalizeInput(request.text);

    if (text.length === 0) {
      return {
        type: "reject",
        action: "agent.reject.empty_input",
        replyText: "你还没有给我音乐指令。"
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
          replyText: `${this.profile?.persona.displayName ?? "我"}记住了，后面会优先参考这个偏好。`
        };

      case IntentTypes.RememberNegative:
        return {
          type: "remember_preference",
          action: "agent.memory.preference.negative",
          sentiment: "negative",
          note: text,
          replyText: `${this.profile?.persona.displayName ?? "我"}记住了，后面会尽量避开这类内容。`
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
