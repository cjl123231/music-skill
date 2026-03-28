# Agent-First Refactor Plan

## 1. 目标

把当前项目从：

- `skill-first`

改造成：

- `agent-first`

也就是：

- 所有音乐相关请求先进入 `MusicAgentService`
- `MusicSkillHandler` 和现有 use case 不再作为用户层主入口
- `MusicSkillHandler` 下沉为执行层适配器

一句话定义：

`Music Agent 负责理解和决策，Music Skill 负责执行。`

## 2. 为什么要改成 Agent-First

### 当前问题

当前系统实际存在两层入口：

1. 基础命令入口
   - `intent-router.ts`
   - `music-skill.handler.ts`

2. agent 语义入口
   - `action-planner.ts`
   - `music-agent.service.ts`

这样会带来：

- 命令理解分裂
- 关键词维护重复
- 用户行为只被 agent 部分看到
- 偏好和记忆无法覆盖全部动作
- 语音入口难统一

### Agent-First 的价值

如果入口统一到 agent：

- 用户体验统一
- 耳机语音只对接一个入口
- 所有播放/收藏/下载行为都能进记忆系统
- 推荐和偏好建模更完整
- skill 层可以保持稳定，不需要暴露给用户

## 3. 目标架构

### 改造前

```text
User
  -> MusicSkillHandler
  -> Use Cases
  -> Provider / Storage

User
  -> MusicAgentService
  -> 部分走 Skill，部分走 Memory
```

### 改造后

```text
User
  -> MusicAgentService
  -> Planner / Memory / Context
  -> Skill Adapter / Use Cases
  -> Provider / Storage
```

## 4. 角色边界

### MusicAgentService

作为唯一用户入口，负责：

- 理解请求
- 判断意图
- 读写记忆
- 做推荐/偏好/场景决策
- 决定调用哪个执行动作

### Skill Adapter

作为执行层适配器，负责：

- 调用现有 skill handler
- 或直接调用 use case

推荐定位：

- 用户不直接感知 Skill Adapter
- 它只是 agent 的工具层

### Use Cases / Provider / Storage

继续保持现有职责：

- 播放
- 暂停
- 收藏
- 下载
- 会话上下文
- 曲库访问

## 5. 推荐的改造方式

不要直接删掉 `MusicSkillHandler`，而是按三步走。

### Phase 1：入口统一

目标：

- 所有外部入口都改到 agent

需要改：

- HTTP `/skill/music/handle` 改成内部转发 agent
- panel 按钮改走 `/agent/music/handle`
- 宿主级耳机语音继续走 agent
- OpenClaw 插件工具优先走 agent

此阶段不删 skill handler。

### Phase 2：规划统一

目标：

- 基础命令也交给 agent planner

需要改：

- 播放/暂停/继续/收藏/下载 等基础命令进入 agent planner
- `intent-router.ts` 不再作为用户层主入口
- agent planner 成为统一命令理解层

此阶段 skill handler 可以保留为 adapter。

### Phase 3：执行层收口

目标：

- Skill handler 从“入口层”彻底变成“执行层”

需要改：

- 把 `music-skill.handler.ts` 改名或重构成 `skill-adapter`
- 或者直接把其中 switch-case 拆成更细的 action executor

## 6. 推荐代码结构

### 当前

```text
src/
  application/
  interfaces/
  plugin/
  agent/
```

### 改造后建议

```text
src/
  agent/
    core/
    planning/
    dialogue/
    memory/
    actions/
  application/
    use-cases/
  interfaces/
    http/
    openclaw/
  plugin/
```

新增建议：

```text
src/agent/actions/
  skill-adapter.ts
  playback-action.ts
  favorite-action.ts
  download-action.ts
```

## 7. 命令理解怎么统一

### 当前问题

- `intent-router.ts` 一套
- `action-planner.ts` 一套

### 改造后建议

统一成：

- `agent command understanding layer`

具体可以分成两层：

#### 基础动作意图

- 播放
- 暂停
- 继续
- 收藏
- 下载

#### 高层 agent 意图

- 记住偏好
- 场景推荐
- 按我的喜好播放
- 负向偏好

也就是说：

- 不再区分“skill 意图”和“agent 意图”
- 改成“统一音乐 agent 意图”

## 8. HTTP 与 OpenClaw 接入改造

### 8.1 HTTP

当前：

- `/skill/music/handle`
- `/agent/music/handle`

建议：

- 对外主入口统一用 `/agent/music/handle`
- `/skill/music/handle` 暂时保留兼容
- 兼容期内内部直接转发到 agent

### 8.2 Panel

当前 panel 的按钮和输入应该都改成：

- 发到 `/agent/music/handle`

这样页面中的：

- 播放
- 收藏
- 下载
- 收藏播放

都会走 agent。

### 8.3 OpenClaw Plugin

当前插件工具层建议逐步改成：

- 工具入口调用 agent
- agent 再调用 skill/use cases

## 9. 记忆系统收益

改成 agent-first 后，以下行为都能进记忆：

- 播放了什么
- 暂停了什么
- 收藏了什么
- 下载了什么
- 哪些歌常被跳过
- 哪些场景下说了哪些话

这会让：

- 偏好建模更真实
- 场景推荐更稳定
- 耳机语音更像真正助手

## 10. 风险

### 风险 1：回归现有功能

如果一步硬切，容易导致：

- 面板按钮失效
- OpenClaw 插件行为变化
- 旧命令不兼容

应对：

- 兼容期保留 `/skill/music/handle`
- 先转发，不直接删除

### 风险 2：planner 变复杂

基础命令和高层语义都进 planner 后，逻辑会变大。

应对：

- 拆成基础命令 planner + agent planner
- 最后统一到一个 orchestrator

### 风险 3：职责混乱

如果 agent 既理解又直接操作底层 provider，容易变乱。

应对：

- agent 只做 orchestration
- 执行层继续复用 use case / skill adapter

## 11. 推荐实施顺序

### Step 1

先改 panel 和 HTTP 默认入口到 agent。

### Step 2

让基础命令也先进入 agent planner。

### Step 3

把 `MusicSkillHandler` 变成内部 adapter。

### Step 4

补全 agent 行为记录：

- play
- pause
- favorite
- download
- skip

### Step 5

再做更强的推荐和偏好系统。

## 12. 结论

你的产品如果要真往“音乐 agent”走，最终一定要改成 `agent-first`。

推荐结论：

- 可以保留 skill
- 但不该继续让 skill 和 agent 并列做用户入口
- 应该让 agent 成为唯一上层入口
- skill 下沉为执行层

这会让：

- 用户体验统一
- 耳机语音统一
- 记忆完整
- 后续推荐与偏好系统更自然
