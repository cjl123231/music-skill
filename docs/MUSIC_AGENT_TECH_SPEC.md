# Music Agent Tech Spec

## 1. 目标

为现有 `music-skill` 增加一层 `MusicAgentService`，让系统从“命令型音乐 skill”演进为“具备长期记忆和耳机独立入口的音乐 agent”。

技术目标：

- 不破坏现有 `music-skill.handler`
- 复用现有 use case、provider、storage
- 先加 agent orchestration 外壳
- 再逐步把偏好记忆和耳机会话挂进去

## 2. 设计原则

1. 现有 `application/use-cases` 继续作为工具层
2. `src/agent/` 只负责编排，不直接取代既有业务层
3. 长期记忆与短期会话分离
4. 语音入口和文字入口统一成 `AgentRequest`
5. 先支持 rule-based agent，再考虑更强的 planner

## 3. 第一版范围

第一版只做 Agent Shell：

- `MusicAgentService`
- `AgentRequest` / `AgentResponse`
- `ContextManager`
- `PreferenceMemoryService` 接口骨架
- `BehaviorMemoryService` 接口骨架
- `HeadsetSessionManager` 骨架
- `ActionPlanner` 骨架

暂不做：

- 真正自动推荐
- TTS
- 复杂多轮澄清
- LLM planner

## 4. 核心流程

```text
Voice/Text Input
  -> AgentRequest
  -> MusicAgentService
  -> ContextManager.load()
  -> Memory services summarize()
  -> ActionPlanner.plan()
  -> Existing Use Case / Handler
  -> Memory services record()
  -> AgentResponse
```

## 5. 核心类型

### AgentRequest

```ts
interface AgentRequest {
  userId: string;
  sessionId: string;
  inputType: "text" | "voice";
  text: string;
  source: "openclaw" | "panel" | "headset_voice";
  timestamp: string;
}
```

### AgentResponse

```ts
interface AgentResponse {
  status: "success" | "error";
  replyText: string;
  action: string;
  payload?: Record<string, unknown>;
  memoryEffects?: string[];
}
```

### AgentContext

```ts
interface AgentContext {
  userId: string;
  sessionId: string;
  currentTrackTitle?: string;
  recentIntent?: string;
  rememberedPreferences: string[];
  activeScene?: string;
}
```

## 6. 模块职责

### music-agent.service.ts

职责：

- Agent 主入口
- 统一装配 context、planner、memory、skill handler
- 对外提供 `handle(request)`

### context-manager.ts

职责：

- 聚合 session context
- 返回最小 agent 上下文

### action-planner.ts

职责：

- 根据输入和 context 返回 `AgentPlan`
- 第一版只做轻量 rule planning

### preference-memory.service.ts

职责：

- 写入显式偏好
- 读取偏好摘要

### behavior-memory.service.ts

职责：

- 记录收藏、跳过、播放、下载行为
- 给后续推荐做数据基础

### scene-memory.service.ts

职责：

- 存储“学习/工作/夜间”等场景偏好

### headset-session-manager.ts

职责：

- 为耳机语音模式管理独立 session
- 提供 wake word、last transcript、状态持有

## 7. 第一版计划模型

```ts
type AgentPlan =
  | { type: "delegate_to_skill"; commandText: string }
  | { type: "remember_preference"; note: string; replyText: string }
  | { type: "reject"; replyText: string };
```

规则：

- 明确音乐控制命令：直接委托给 skill
- `记住我喜欢...`：写入 preference memory
- `以后别放...`：写入 negative preference

## 8. 与现有代码的集成方式

建议通过 `createAgentContainer()` 装配：

- 复用 `createContainer()` 里的 `musicSkillHandler`
- agent service 直接依赖 `musicSkillHandler`
- 后续再逐步把某些 action 直接下沉到 use case

这样做的好处：

- 第一版接入成本低
- skill 与 agent 可同时存在
- 便于回归测试

## 9. 第一版存储策略

第一版先不新建复杂 memory 表，先用接口和 in-memory/轻量存储占位。

建议后续新增 SQLite 表：

- `agent_preference_memory`
- `agent_behavior_events`
- `agent_scene_memory`
- `agent_session_meta`

## 10. 开发顺序

1. 新增 `src/agent/` 基础目录
2. 新增 request/response/context 类型
3. 实现 `MusicAgentService`
4. 实现 `ActionPlanner`
5. 实现三类 memory service 骨架
6. 新增 `createAgentContainer()`
7. 补一组 agent 单测

## 11. 验收标准

第一版完成时，应满足：

- 能创建 `MusicAgentService`
- 能接受 `AgentRequest`
- 能把普通音乐命令委托给现有 skill
- 能接受显式偏好写入命令
- 能返回结构化 `AgentResponse`
- 不影响现有 panel、plugin、skill handler 测试
