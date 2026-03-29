# Music Player + XiaoLe Agent 重构方案

## 目标

把当前以 `panel + scripts + agent` 为主的控制链，重构成：

1. 本地完整音乐播放器作为稳定底盘
2. `小乐` 作为播放器内置音乐 Agent
3. OpenClaw 作为唤起和外部控制入口之一

一句话：

- 播放器负责稳定播放
- 小乐负责理解、记忆、推荐和语音交互

---

## 为什么要重构

当前架构的问题不是功能少，而是链路过长：

- OpenClaw / panel / 本地语音 / HTTP / 播放 host 分散
- UI 状态、播放状态、语音状态容易不同步
- 轮询和外部进程控制让“暂停/继续/音量/切歌”更容易抖

更稳的方案应该是：

- 一个进程统一维护播放器状态
- Agent 只操作播放器内核
- Web UI 只是播放器界面，不再承担核心状态协调

---

## 目标架构

### 1. Player Core

本地播放器核心，统一负责：

- 曲库扫描
- 播放队列
- 当前播放
- 暂停 / 继续 / 上一首 / 下一首
- 音量
- 歌词时间轴
- 收藏 / 下载 / 歌单

建议模块：

- `src/player/core/player-engine.ts`
- `src/player/core/queue-manager.ts`
- `src/player/core/library-index.ts`
- `src/player/core/lyrics-engine.ts`

### 2. XiaoLe Agent

Agent 不再直接驱动脚本，而是调用 Player Core 的标准接口。

负责：

- 意图理解
- 偏好记忆
- 场景推荐
- 语音命令解释
- OpenClaw 指令适配

建议模块：

- `src/agent/core/music-agent.service.ts`
- `src/agent/planning/action-planner.ts`
- `src/agent/planning/recommendation-planner.ts`

### 3. Voice Runtime

本地语音进程只做：

- 唤醒词
- 语音转文字
- 把文本送给 XiaoLe Agent

不再直接控制播放器。

建议模块：

- `scripts/start-voice.ps1`
- 后续可替换为 `python/voice-daemon/`

### 4. UI Layer

Web UI 或桌面 UI 只负责：

- 显示播放器状态
- 展示歌词
- 展示曲库 / 收藏 / 下载
- 提供辅助按钮控制

不再做浏览器语音识别，不再猜测播放状态。

### 5. OpenClaw Integration

OpenClaw 只做入口：

- `/music`
- 文字对话
- agent 调用

实际执行统一落到 XiaoLe Agent。

---

## 新的控制链

### 文字

1. 用户在 OpenClaw 输入命令
2. OpenClaw 调 XiaoLe Agent
3. XiaoLe Agent 生成标准播放器动作
4. Player Core 执行动作
5. UI 实时显示结果

### 语音

1. 用户对麦克风说话
2. 本地语音进程识别文本
3. 文本发给 XiaoLe Agent
4. XiaoLe Agent 调 Player Core
5. UI 和托盘同步更新

### UI 按钮

1. 用户点按钮
2. UI 调本地播放器控制接口
3. Player Core 更新状态
4. XiaoLe Agent 从统一状态读取

---

## 关键设计原则

### 单一事实来源

播放器状态只能有一份，统一由 Player Core 持有：

- 当前曲目
- 播放状态
- 音量
- 进度
- 播放队列

面板不自己推断，Agent 不自己缓存真实播放状态。

### Agent 不直接操作脚本

Agent 只调用标准播放器接口，比如：

- `play(query)`
- `pause()`
- `resume()`
- `next()`
- `previous()`
- `setVolume(percent)`
- `favoriteCurrent()`

### UI 不负责核心逻辑

UI 只读状态、发动作，不判断播放完成、不自己切歌。

### 语音不放在浏览器里

浏览器语音只适合演示，不适合长期产品形态。

---

## 推荐的标准动作协议

```json
{
  "type": "music.command",
  "action": "play",
  "payload": {
    "query": "普通朋友"
  }
}
```

```json
{
  "type": "music.command",
  "action": "set_volume",
  "payload": {
    "mode": "relative",
    "value": -10
  }
}
```

```json
{
  "type": "music.command",
  "action": "favorite_current",
  "payload": {}
}
```

---

## 实施阶段

### Phase 1：抽出 Player Core

先把当前已有能力从“UI / provider / host 分散实现”收成统一播放器内核。

要完成：

- 统一播放状态模型
- 统一队列
- 统一音量
- 统一歌词时间轴
- 统一自动下一首

阶段目标：

- 不管是按钮、Agent 还是语音，最终都调同一套核心接口

### Phase 2：Agent 改成只调 Player Core

要完成：

- XiaoLe Agent 输出标准动作
- 不再直接依赖旧的零散 handler 分支
- 记忆与推荐逻辑保留，但执行层改成 Player Core

阶段目标：

- Agent 成为稳定的大脑
- 播放器成为稳定的底盘

### Phase 3：UI 改成纯播放器界面

要完成：

- 页面只显示状态
- 所有按钮只发标准播放器动作
- 删除浏览器语音逻辑
- 歌词、列表、收藏、下载都以播放器状态为准

阶段目标：

- UI 不再是状态协调器

### Phase 4：语音改成本地常驻

要完成：

- 本地语音进程常驻
- 托盘状态同步
- 唤醒词稳定
- 后续可换 Python ASR

阶段目标：

- 关掉网页也能用小乐

---

## 目录建议

```text
src/
  player/
    core/
      player-engine.ts
      queue-manager.ts
      playback-state-store.ts
      lyrics-engine.ts
    adapters/
      windows-audio-adapter.ts
      macos-audio-adapter.ts
    api/
      player-controller.ts
  agent/
    core/
    planning/
    memory/
  interfaces/
    http/
    openclaw/
    tray/
```

---

## 对现有项目的保留与替换

### 保留

- XiaoLe Agent 人格与记忆体系
- 本地曲库扫描
- 收藏 / 下载 / 歌单 / SQLite
- OpenClaw skill 安装与接入

### 逐步替换

- 分散的播放状态推断
- 浏览器语音识别
- 由 UI 驱动的切歌逻辑
- PowerShell host 的默认主路径

---

## 最终产品形态

最终交付给用户的应该是：

- 一个本地完整音乐播放器
- 一个内置的音乐 Agent：`小乐`
- OpenClaw 只是进入这个播放器 Agent 的入口之一

用户感知应该是：

- 我安装了一个会说话、会记住喜好、会管理本地曲库的音乐助手

而不是：

- 我安装了一堆脚本和一个网页面板

---

## 下一步建议

直接进入 Phase 1，优先做这 3 件事：

1. 抽出统一的 `PlayerEngine`
2. 把 `播放 / 暂停 / 下一首 / 音量 / 自动下一首` 全部收进 Player Core
3. 让 panel 改成只读 Player Core 状态
