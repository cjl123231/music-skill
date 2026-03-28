# Music Skill 项目目录初始化方案

## 1. 目标

本方案用于把当前文档阶段的 Music Skill 项目，初始化成一个可以直接开始编码、测试和迭代的代码仓库。

方案目标：

1. 目录结构与 `PRD.md`、`TECH_SPEC.md`、`SKILL_SPEC.md` 保持一致。
2. 第一版就把分层边界划清，避免后续逻辑堆在一个入口文件里。
3. 先支持 MVP 最小闭环，再逐步扩展到下载、歌单、多 Provider。
4. 让 OpenClaw 接入、领域逻辑、基础设施、测试可以并行推进。

## 2. 技术选型建议

如果没有既定技术栈，建议第一版采用：

1. Node.js 20+
2. TypeScript
3. `pnpm`
4. `vitest`
5. `zod`
6. SQLite

选择原因：

1. TypeScript 适合做意图对象、Provider 接口、上下文结构建模。
2. Node.js 方便处理本地文件、HTTP 接口、OpenClaw skill 对接。
3. SQLite 足够支撑 MVP 阶段的收藏、歌单、上下文、下载记录。
4. `vitest` 启动快，适合先写大量意图与 use case 单测。

## 3. 初始化后的目录结构

建议目录如下：

```text
music-skill/
  docs/
    PRD.md
    TECH_SPEC.md
    SKILL_SPEC.md
    PROJECT_INIT_PLAN.md
  src/
    app/
      bootstrap.ts
      container.ts
      config.ts
    interfaces/
      openclaw/
        music-skill.handler.ts
        dto.ts
      http/
        server.ts
        routes.ts
        dto.ts
    application/
      intents/
        intent-router.ts
        intent-types.ts
        intent-result.ts
      slots/
        slot-extractor.ts
        slot-types.ts
      dialogue/
        dialogue-manager.ts
        context-resolver.ts
      responders/
        response-builder.ts
        clarification-builder.ts
      use-cases/
        play-music.use-case.ts
        pause-music.use-case.ts
        resume-music.use-case.ts
        next-track.use-case.ts
        previous-track.use-case.ts
        now-playing.use-case.ts
        set-volume.use-case.ts
        add-favorite.use-case.ts
        download-track.use-case.ts
        add-track-to-playlist.use-case.ts
    domain/
      entities/
        track.ts
        album.ts
        artist.ts
        playlist.ts
        playback-state.ts
        download-task.ts
        session-context.ts
      repositories/
        favorites.repository.ts
        playlists.repository.ts
        session-context.repository.ts
        download-task.repository.ts
      services/
        music-provider.ts
        playback-controller.ts
        downloader.ts
      value-objects/
        intent.ts
        slot-map.ts
    infrastructure/
      providers/
        local/
          local-music.provider.ts
        stub/
          stub-music.provider.ts
        provider-manager.ts
      storage/
        sqlite/
          db.ts
          migrations/
          favorites.repository.json.ts
          playlists.repository.json.ts
          session-context.repository.json.ts
          download-task.repository.json.ts
      playback/
        system-playback.controller.ts
      downloads/
        file-downloader.ts
      logging/
        logger.ts
    shared/
      errors/
        app-error.ts
        error-codes.ts
      types/
        common.ts
      utils/
        id.ts
        time.ts
        text-normalizer.ts
  tests/
    unit/
      application/
      domain/
      infrastructure/
    integration/
      openclaw/
      http/
  data/
    .gitkeep
  downloads/
    .gitkeep
  scripts/
    init-db.ts
    seed-dev.ts
  .env.example
  .gitignore
  package.json
  pnpm-lock.yaml
  tsconfig.json
  vitest.config.ts
  README.md
```

## 4. 目录职责说明

### 4.1 `docs/`
放产品和设计文档，不和源码混放。

建议把现有文档移动到这里：
1. `PRD.md`
2. `TECH_SPEC.md`
3. `SKILL_SPEC.md`
4. `PROJECT_INIT_PLAN.md`

### 4.2 `src/app/`
应用启动层，负责：
1. 读取配置
2. 初始化依赖
3. 组装容器
4. 导出应用入口

这个目录不写业务逻辑，只做装配。

### 4.3 `src/interfaces/`
对外接口层。

其中：
1. `openclaw/` 负责接入 OpenClaw skill 调用协议
2. `http/` 负责本地调试或服务化部署时的 HTTP 入口

这样后面即使 OpenClaw 接口变化，也不会污染领域逻辑。

### 4.4 `src/application/`
应用编排层，负责：
1. intent 路由
2. slot 提取
3. dialogue 管理
4. use case 调用
5. 响应组装

这里是整个 skill 的主流程层。

### 4.5 `src/domain/`
领域层，负责描述“音乐业务是什么”，不关心 OpenClaw、不关心 SQLite、不关心具体 Provider。

这一层只放：
1. 实体
2. 仓储接口
3. 领域服务接口
4. 值对象

### 4.6 `src/infrastructure/`
基础设施层，负责实现 domain 中声明的接口。

包括：
1. 本地音乐源 Provider
2. Stub Provider
3. SQLite 仓储实现
4. 播放器控制适配
5. 文件下载器
6. 日志

### 4.7 `src/shared/`
放跨层通用能力。

只放低耦合、纯工具类内容：
1. 错误码
2. 通用类型
3. 字符串规范化
4. 时间和 ID 工具

### 4.8 `tests/`
拆成：
1. `unit/` 单元测试
2. `integration/` 集成测试

建议不要把测试和源码同目录混放，MVP 阶段更容易统一管理。

### 4.9 `data/`
本地数据库、缓存、开发期索引文件。

### 4.10 `downloads/`
音乐下载目录。只保留目录，不把下载内容提交到仓库。

### 4.11 `scripts/`
放项目脚本，例如：
1. 初始化数据库
2. 本地插入测试数据
3. 迁移脚本

## 5. 第一版最小目录

如果一开始不想把目录铺太大，可以先初始化最小可用版本：

```text
music-skill/
  docs/
  src/
    app/
    interfaces/
      openclaw/
    application/
      intents/
      dialogue/
      use-cases/
      responders/
    domain/
      entities/
      repositories/
      services/
    infrastructure/
      providers/
      storage/
    shared/
      errors/
      utils/
  tests/
  data/
  downloads/
```

这样足够支持 MVP 第一阶段。

## 6. 第一批必须创建的文件

建议第一天先把以下文件创建出来：

### 6.1 根目录文件
1. `package.json`
2. `tsconfig.json`
3. `vitest.config.ts`
4. `.gitignore`
5. `.env.example`
6. `README.md`

### 6.2 应用入口文件
1. `src/app/bootstrap.ts`
2. `src/app/container.ts`
3. `src/app/config.ts`

### 6.3 OpenClaw 接口文件
1. `src/interfaces/openclaw/music-skill.handler.ts`
2. `src/interfaces/openclaw/dto.ts`

### 6.4 意图和对话文件
1. `src/application/intents/intent-router.ts`
2. `src/application/intents/intent-types.ts`
3. `src/application/slots/slot-extractor.ts`
4. `src/application/dialogue/dialogue-manager.ts`
5. `src/application/responders/response-builder.ts`

### 6.5 首批 use case 文件
1. `src/application/use-cases/play-music.use-case.ts`
2. `src/application/use-cases/pause-music.use-case.ts`
3. `src/application/use-cases/resume-music.use-case.ts`
4. `src/application/use-cases/next-track.use-case.ts`
5. `src/application/use-cases/previous-track.use-case.ts`
6. `src/application/use-cases/now-playing.use-case.ts`
7. `src/application/use-cases/set-volume.use-case.ts`

### 6.6 领域文件
1. `src/domain/entities/track.ts`
2. `src/domain/entities/playback-state.ts`
3. `src/domain/entities/session-context.ts`
4. `src/domain/services/music-provider.ts`
5. `src/domain/repositories/session-context.repository.ts`

### 6.7 基础设施文件
1. `src/infrastructure/providers/stub/stub-music.provider.ts`
2. `src/infrastructure/providers/provider-manager.ts`
3. `src/infrastructure/storage/sqlite/db.ts`
4. `src/infrastructure/storage/sqlite/session-context.repository.json.ts`
5. `src/infrastructure/logging/logger.ts`

### 6.8 测试文件
1. `tests/unit/application/intents/intent-router.test.ts`
2. `tests/unit/application/dialogue/dialogue-manager.test.ts`
3. `tests/unit/application/use-cases/play-music.use-case.test.ts`

## 7. 初始化顺序建议

建议按下面顺序初始化，而不是一上来就写完整功能。

### 阶段 1：仓库骨架
1. 建立 `docs/`、`src/`、`tests/`、`data/`、`downloads/`。
2. 初始化 `package.json`、TypeScript、测试配置。
3. 补 `README.md`、`.env.example`、`.gitignore`。

目标：
先让仓库结构稳定。

### 阶段 2：类型与接口
1. 定义 intent 枚举和输入输出 DTO。
2. 定义 `MusicProvider` 接口。
3. 定义 `SessionContext`、`Track`、`PlaybackState`。
4. 定义错误码和统一响应格式。

目标：
先把边界定死，避免后续返工。

### 阶段 3：主流程跑通
1. 写 `music-skill.handler.ts`
2. 写 `intent-router.ts`
3. 写 `dialogue-manager.ts`
4. 写 `response-builder.ts`
5. 写 `Play/Pause/Resume/Next/Previous/NowPlaying/SetVolume` use case
6. 接一个 `stub provider`

目标：
先跑通最小闭环。

### 阶段 4：本地持久化
1. 初始化 SQLite
2. 建立 `session_contexts`
3. 保存最近搜索结果和当前上下文
4. 接入收藏、歌单、下载记录表

目标：
支持上下文、多轮引用和后续扩展。

### 阶段 5：能力扩展
1. 收藏
2. 歌单
3. 下载
4. 歧义澄清
5. 语音入口接入

## 8. 推荐 `.gitignore`

至少应忽略：

```gitignore
node_modules/
dist/
.env
.env.local
data/*.db
data/*.sqlite
downloads/*
!downloads/.gitkeep
coverage/
.DS_Store
Thumbs.db
```

## 9. 推荐 `README` 结构

`README.md` 建议包含：

1. 项目简介
2. 当前阶段和目标
3. 目录说明
4. 本地启动方式
5. 测试命令
6. 环境变量说明
7. 当前已实现能力
8. 后续路线图

## 10. 推荐环境变量

```env
NODE_ENV=development
PORT=3000
MUSIC_SKILL_DEFAULT_PROVIDER=stub
MUSIC_SKILL_ENABLE_DOWNLOAD=true
MUSIC_SKILL_ENABLE_VOICE=true
MUSIC_SKILL_MAX_CANDIDATES=5
MUSIC_SKILL_REQUIRE_CONFIRM_ON_DESTRUCTIVE=true
MUSIC_DB_PATH=./data/music-skill.db.json
MUSIC_DOWNLOAD_DIR=./downloads
```

## 11. 初始化验收标准

目录初始化完成后，至少应满足：

1. 仓库目录清晰，能区分接口层、应用层、领域层、基础设施层。
2. 可以执行一次基础测试命令。
3. 可以通过一个 stub provider 完成一次 `music.play` 请求链路。
4. 可以持久化和读取一份 `SessionContext`。
5. 文档全部进入 `docs/`，根目录只保留工程文件。

## 12. 建议的第一周任务拆分

### 第 1 天
1. 初始化目录和配置文件
2. 建好 TypeScript 和测试环境
3. 补 `README`

### 第 2 天
1. 定义 DTO、Intent、Slot、错误码
2. 定义 Provider 接口和基础实体

### 第 3 天
1. 跑通 OpenClaw handler
2. 跑通 `music.play`
3. 完成 stub provider

### 第 4 天
1. 加入 `pause/resume/next/previous/now_playing/volume`
2. 完成对话上下文保存

### 第 5 天
1. 加入基础测试
2. 修正边界
3. 为收藏和下载预留接口

## 13. 结论

项目初始化阶段最重要的不是“把所有目录建全”，而是先确保三件事：

1. 分层边界明确
2. 最小播放闭环能跑通
3. 后续收藏、下载、多 Provider 能无痛接进来

按这份方案落地，下一步就可以直接开始生成项目骨架代码，而不是继续停留在文档层。
