import { AppError } from "../../shared/errors/app-error.js";
import { ErrorCodes } from "../../shared/errors/error-codes.js";
import type { SkillResponse } from "../../interfaces/openclaw/dto.js";
import type { MusicSkillHandler } from "../../interfaces/openclaw/music-skill.handler.js";
import type { ContextManager } from "../dialogue/context-manager.js";
import type { BehaviorMemoryService } from "../memory/behavior-memory.service.js";
import type { PreferenceMemoryService } from "../memory/preference-memory.service.js";
import type { SceneMemoryService } from "../memory/scene-memory.service.js";
import type { ActionPlanner } from "../planning/action-planner.js";
import type { RecommendationPlanner } from "../planning/recommendation-planner.js";
import type { GeneratedAgentProfile } from "../runtime/generated-agent.types.js";
import type { AgentRequest } from "./agent-request.js";
import type { AgentResponse } from "./agent-response.js";

interface MusicAgentDependencies {
  musicSkillHandler: MusicSkillHandler;
  contextManager: ContextManager;
  planner: ActionPlanner;
  recommendationPlanner: RecommendationPlanner;
  preferenceMemory: PreferenceMemoryService;
  behaviorMemory: BehaviorMemoryService;
  sceneMemory: SceneMemoryService;
  profile?: GeneratedAgentProfile;
}

function buildPersonaMetadata(profile?: GeneratedAgentProfile) {
  if (!profile) {
    return undefined;
  }

  return {
    displayName: profile.persona.displayName ?? profile.identity.name,
    templateId: profile.identity.templateId,
    tone: [...profile.persona.tone],
    style: [...profile.persona.style]
  };
}

function formatPersonaReply(replyText: string, profile?: GeneratedAgentProfile): string {
  const base = replyText.trim();
  if (!profile) {
    return base;
  }

  const personaName = profile.persona.displayName || profile.identity.name;
  const tone = new Set(profile.persona.tone.map((item) => item.toLowerCase()));
  const style = new Set(profile.persona.style.map((item) => item.toLowerCase()));

  let text = base.replace(/\s+/g, " ").trim();

  if (tone.has("warm") && !text.startsWith(`${personaName}：`)) {
    text = `${personaName}：${text}`;
  }

  if (tone.has("reflective") || style.has("soft closing lines")) {
    if (!text.endsWith("慢慢听。")) {
      text = `${text} 慢慢听。`;
    }
  } else if (tone.has("supportive") || style.has("gentle suggestions when useful")) {
    if (!text.endsWith("需要的话我可以继续帮你挑。")) {
      text = `${text} 需要的话我可以继续帮你挑。`;
    }
  }

  return text;
}

function buildRecommendationReason(trackTitle: string, scene: string | undefined, profile?: GeneratedAgentProfile): string {
  const tone = new Set(profile?.persona.tone.map((item) => item.toLowerCase()) ?? []);
  const style = new Set(profile?.persona.style.map((item) => item.toLowerCase()) ?? []);

  if (style.has("task-oriented guidance")) {
    if (scene === "coding" || scene === "study" || scene === "focus") {
      return `这首《${trackTitle}》更适合你当前的专注场景。`;
    }

    return `这首《${trackTitle}》更贴近你刚才的使用目标。`;
  }

  if (style.has("atmospheric language") || tone.has("reflective")) {
    if (scene === "calm" || scene === "relax") {
      return `这首《${trackTitle}》的氛围更安静，适合现在听。`;
    }

    return `这首《${trackTitle}》的气质和你现在的状态更合拍。`;
  }

  if (tone.has("supportive")) {
    return `我按你最近的偏好给你挑了《${trackTitle}》。`;
  }

  if (scene) {
    return `这首《${trackTitle}》更贴近你当前的${scene}场景。`;
  }

  return `这首《${trackTitle}》更贴近你最近的偏好。`;
}

function mapSkillResponse(response: SkillResponse, profile?: GeneratedAgentProfile): AgentResponse {
  return {
    status: response.status,
    action: response.intent,
    replyText: formatPersonaReply(response.replyText, profile),
    payload: response.payload ? ({ ...response.payload } as Record<string, unknown>) : undefined,
    agentName: profile?.persona.displayName ?? profile?.identity.name,
    wakeWord: profile?.identity.wakeWord,
    persona: buildPersonaMetadata(profile)
  };
}

export class MusicAgentService {
  constructor(private readonly deps: MusicAgentDependencies) {}

  async handle(request: AgentRequest): Promise<AgentResponse> {
    const preferenceRecords = await this.deps.preferenceMemory.list(request.userId);
    const context = await this.deps.contextManager.load(
      request.userId,
      request.sessionId,
      preferenceRecords
    );
    context.activeScene = await this.deps.sceneMemory.getActiveScene(request.userId);

    const plan = this.deps.planner.plan(request, context);

    if (plan.type === "remember_preference") {
      await this.deps.preferenceMemory.remember(request.userId, plan.note, plan.sentiment);
      await this.deps.behaviorMemory.record({
        userId: request.userId,
        type: "preference.remembered",
        detail: plan.note,
        timestamp: request.timestamp
      });

      return {
        status: "success",
        action: plan.action,
        replyText: formatPersonaReply(plan.replyText, this.deps.profile),
        memoryEffects: [plan.note],
        agentName: this.deps.profile?.persona.displayName ?? this.deps.profile?.identity.name,
        wakeWord: this.deps.profile?.identity.wakeWord,
        persona: buildPersonaMetadata(this.deps.profile)
      };
    }

    if (plan.type === "reject") {
      return {
        status: "error",
        action: plan.action,
        replyText: formatPersonaReply(plan.replyText, this.deps.profile),
        agentName: this.deps.profile?.persona.displayName ?? this.deps.profile?.identity.name,
        wakeWord: this.deps.profile?.identity.wakeWord,
        persona: buildPersonaMetadata(this.deps.profile)
      };
    }

    if (plan.type === "play_recommended") {
      if (plan.scene) {
        await this.deps.sceneMemory.setActiveScene(request.userId, plan.scene);
      }

      const track = await this.deps.recommendationPlanner.pickTrack(request.userId, {
        scene: plan.scene ?? context.activeScene
      });
      if (!track) {
        throw new AppError("还没有可用于推荐播放的歌曲。", ErrorCodes.MusicNotFound);
      }

      const response = await this.deps.musicSkillHandler.handle({
        userId: request.userId,
        sessionId: request.sessionId,
        inputType: request.inputType,
        text: `播放${track.title}`
      });

      await this.deps.behaviorMemory.record({
        userId: request.userId,
        type: "agent.recommendation.played",
        detail: `${track.artist} - ${track.title}`,
        timestamp: request.timestamp
      });

      const reasoning = buildRecommendationReason(track.title, plan.scene ?? context.activeScene, this.deps.profile);
      return {
        ...mapSkillResponse(response, this.deps.profile),
        replyText: formatPersonaReply(`${response.replyText} ${reasoning}`, this.deps.profile),
        reasoning,
        payload: {
          ...(response.payload ? ({ ...response.payload } as Record<string, unknown>) : {}),
          recommendationReason: reasoning,
          recommendationScene: plan.scene ?? context.activeScene
        }
      };
    }

    const response = await this.deps.musicSkillHandler.handle({
      userId: request.userId,
      sessionId: request.sessionId,
      inputType: request.inputType,
      text: plan.commandText
    });

    await this.deps.behaviorMemory.record({
      userId: request.userId,
      type: "agent.delegated",
      detail: plan.commandText,
      timestamp: request.timestamp
    });

    return mapSkillResponse(response, this.deps.profile);
  }
}
