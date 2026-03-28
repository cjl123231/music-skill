# Music Agent Framework

## 1. 定位

`Music Skill Local Edition` 的下一阶段不再只是“本地音乐播放器技能”，而是升级为一个可被用户单独对话、单独语音控制、具备长期记忆和偏好理解能力的 `Music Agent`。

它的目标不是替代 OpenClaw，而是作为 OpenClaw 体系中的一个垂直音乐代理：

- 专注音乐相关任务
- 可通过耳机单独唤起和控制
- 具备长期记忆与偏好学习
- 能理解连续上下文，不只响应单条命令

一句话定义：

`Music Agent = 语音入口 + 对话大脑 + 音乐工具层 + 长期记忆层 + 展示反馈层`

## 2. 用户价值

### 2.1 不只是播放器

用户希望的不是“一个能播放歌的按钮集合”，而是：

- 说一句“来点安静的歌”
- Agent 知道用户平时喜欢什么
- 结合时间、场景、历史偏好做合理播放
- 能继续记住“我喜欢这类歌”“这首别再推给我”

### 2.2 耳机单独控制

理想使用方式：

- 用户戴着耳机
- 不必打开面板
- 直接对耳机麦克风说：
  - `音乐控制，播放我收藏的录音`
  - `音乐控制，来点适合写代码的`
  - `音乐控制，这首歌我不喜欢`

这要求 Music Agent 有单独的语音入口、对话状态和执行能力，而不只是页面按钮。

### 2.3 长期记忆

Agent 需要记住：

- 用户喜欢哪些歌手、类型、语速、情绪
- 用户不喜欢哪些歌、哪些时段的某类音乐
- 用户常见场景：
  - 工作
  - 学习
  - 通勤
  - 休息
- 用户高频操作习惯：
  - 更常收藏还是更常下载
  - 更偏向本地收藏播放还是随机听歌

## 3. 目标能力

### 3.1 第一层：已有能力保留

当前已有的 skill 能力继续保留：

- 播放、暂停、继续、上一首、下一首
- 查询当前播放
- 收藏当前歌曲
- 查看收藏
- 播放收藏里的歌曲
- 下载歌曲
- 查询下载状态和下载列表
- 面板文字/语音控制
- Windows 宿主级耳机语音入口

### 3.2 第二层：Agent 新能力

新增的 Agent 能力包括：

- 多轮对话
- 记忆用户偏好
- 识别用户场景
- 基于偏好做推荐和筛选
- 根据历史行为调整响应
- 对模糊命令做澄清

示例：

- `来点适合晚上听的`
- `不要太吵`
- `还是放我昨天收藏的那首`
- `以后少给我推荐这种风格`

## 4. 框架总览

建议采用 5 层结构：

1. Voice Entry Layer
2. Agent Brain Layer
3. Music Capability Layer
4. Memory Layer
5. Feedback Layer

## 5. 分层设计

### 5.1 Voice Entry Layer

职责：

- 接收来自耳机、浏览器、OpenClaw 文本输入的命令
- 统一转成标准化的 agent request

输入来源：

- Windows 宿主级耳机语音监听
- 浏览器语音识别
- OpenClaw 文本对话
- 面板输入框

输出标准：

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

### 5.2 Agent Brain Layer

职责：

- 解析用户意图
- 读取当前会话状态
- 读取长期记忆
- 决定是直接执行、追问澄清，还是调用推荐逻辑

建议拆成 4 个模块：

#### a. Intent Router

处理明确命令：

- `播放录音`
- `收藏这首歌`
- `下载这首歌`

#### b. Dialogue Manager

处理上下文：

- “这首歌”
- “刚才那首”
- “还是上一首”

#### c. Preference Interpreter

处理偏好表达：

- `我喜欢这种风格`
- `别再推荐这种`
- `我晚上想听安静一点的`

#### d. Policy Planner

决定执行策略：

- 直接播放
- 优先从收藏里找
- 先问用户澄清
- 返回推荐结果

### 5.3 Music Capability Layer

职责：

- 承接 agent 的动作决策
- 调用现有播放器、下载、收藏、歌单等能力

建议继续复用现有能力，并在其上层增加 agent-friendly action：

- `playTrack`
- `playFavorite`
- `playByMood`
- `favoriteCurrentTrack`
- `downloadCurrentTrack`
- `listFavorites`
- `skipTrack`
- `adjustVolume`

这一层本质上是：

- 现有 skill use case 的复用层
- Agent 调度友好的工具层

### 5.4 Memory Layer

职责：

- 保存短期会话上下文
- 保存长期偏好和历史行为

建议分成两类：

#### a. Session Memory

短期记忆，解决连续对话：

- 当前播放歌曲
- 最近播放列表
- 最近一次推荐结果
- 最近一次澄清状态

#### b. Long-term Memory

长期记忆，解决个性化：

- 喜欢的歌手
- 喜欢的歌曲风格
- 不喜欢的内容
- 常用场景
- 历史收藏行为
- 历史跳过行为

建议数据结构至少包含：

- `user_preferences`
- `listening_history`
- `skip_history`
- `agent_memory_notes`
- `scene_preferences`

### 5.5 Feedback Layer

职责：

- 让用户看到或听到 agent 的执行结果

输出方式：

- OpenClaw 文本回复
- 面板状态更新
- 收藏列表变化
- 下载进度变化
- 语音 TTS 回复

推荐原则：

- 简短
- 明确
- 可继续追问

示例：

- `已为你播放最近收藏的《录音》。`
- `你更偏爱安静的人声歌曲，我先从收藏里找相近的。`
- `你的收藏里有两首《晴天》，要播放周杰伦还是翻唱版？`

## 6. 长期记忆框架

### 6.1 记忆分类

建议把长期记忆拆成 4 类：

1. Preference Memory
2. Behavior Memory
3. Scene Memory
4. Explicit User Notes

#### Preference Memory

用户明确表达的偏好：

- 喜欢周杰伦
- 喜欢人声
- 不喜欢太吵

#### Behavior Memory

从行为中总结的偏好：

- 收藏次数最多的歌手
- 跳过率高的歌曲类型
- 深夜常听的音乐风格

#### Scene Memory

场景化偏好：

- 写代码时喜欢轻音乐
- 通勤时喜欢节奏快一点
- 睡前喜欢安静人声

#### Explicit User Notes

用户直接告诉 agent 的规则：

- `以后优先放本地收藏`
- `不要自动下载`
- `新歌先别推荐`

### 6.2 记忆更新机制

记忆更新分三种：

#### 显式写入

用户明确说：

- `记住我喜欢这类歌`
- `以后少放这种`

#### 行为归纳

系统根据行为统计：

- 高频收藏
- 高频跳过
- 高频重播

#### 周期总结

按天/周做轻量总结：

- 本周最常听歌手
- 本周新增收藏
- 晚间时段偏好变化

## 7. 耳机单独控制框架

### 7.1 目标

让耳机语音入口成为 Music Agent 的独立入口，而不是面板附属功能。

### 7.2 路径

当前：

- Windows 宿主级语音脚本
- 浏览器语音按钮

下一步：

- 常驻 headset listener
- 独立唤醒词
- 独立 agent session
- 独立反馈策略

### 7.3 建议会话模型

```ts
interface VoiceAgentSession {
  sessionId: string;
  userId: string;
  source: "headset_voice";
  wakeWordEnabled: boolean;
  isListening: boolean;
  lastTranscript?: string;
  lastIntent?: string;
  activeScene?: string;
}
```

### 7.4 耳机模式下的体验原则

- 响应要短
- 操作反馈要明确
- 不依赖屏幕
- 能一轮搞定就不要追问
- 必须追问时问题要非常短

## 8. 从 Skill 到 Agent 的演进路径

### Phase 1：Agent Shell

目标：

- 在现有 skill 外层加一层 agent orchestration
- 不改底层播放器和下载逻辑

要做：

- 新增 `MusicAgentService`
- 新增 memory schema
- 新增 headset session manager

### Phase 2：Preference Memory

目标：

- 能记住用户偏好
- 能做初步个性化播放

要做：

- 收藏/跳过/重播行为入库
- 偏好总结器
- 场景偏好表

### Phase 3：Recommendation & Clarification

目标：

- 能回答模糊命令
- 能做个性化推荐

要做：

- 推荐候选生成
- 歧义澄清策略
- 偏好优先级策略

### Phase 4：True Music Agent

目标：

- 像真正的垂直音乐助手

要做：

- 更好的语音理解
- TTS 回复
- 更丰富的记忆总结
- 可解释推荐

## 9. 推荐代码框架

建议新增目录：

```text
src/agent/
  core/
    music-agent.service.ts
    agent-request.ts
    agent-response.ts
  dialogue/
    context-manager.ts
    clarification-policy.ts
  memory/
    preference-memory.service.ts
    scene-memory.service.ts
    behavior-memory.service.ts
  planning/
    action-planner.ts
    recommendation-planner.ts
  voice/
    headset-session-manager.ts
    wakeword-policy.ts
```

建议现有 `application/use-cases` 保持不动，作为工具层继续复用。

## 10. MVP Agent 版本先做什么

不建议一上来做完整智能体，先做最小版本：

1. 单独的 `MusicAgentService`
2. 长期偏好表
3. 耳机独立 session
4. `播放我的收藏`
5. `记住我喜欢这种`
6. `以后别放这种`
7. 基于收藏和历史的简单推荐

## 11. 对当前项目的建议结论

这版项目下一步不该继续只堆播放器功能，而应该转向：

- 用 agent 包一层现有能力
- 让耳机控制成为独立入口
- 让收藏、跳过、下载和播放行为进入长期记忆
- 逐步把“命令型 skill”升级成“陪伴型音乐 agent”

最合理的下一步开发顺序是：

1. 建 `MusicAgentService` 外壳
2. 建长期记忆表结构
3. 把 headset voice 接到 agent session
4. 补“偏好写入”指令
5. 补“按偏好播放”能力
