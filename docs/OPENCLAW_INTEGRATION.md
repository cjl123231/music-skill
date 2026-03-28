# Music Skill OpenClaw 接入文档

## 1. 目标

本文档定义 Music Skill 与 OpenClaw 宿主之间的最小接入约定，包括：

1. Skill manifest
2. 请求结构
3. 响应结构
4. 错误返回
5. 本地调试方式

当前仓库中的 manifest 文件为 [openclaw.skill.json](D:\Music-Skill\openclaw.skill.json)。

## 2. Skill 标识

建议使用以下标识：

1. `id`: `music-skill`
2. `name`: `Music Skill`
3. `version`: `0.1.0`

## 3. 宿主调用方式

建议 OpenClaw 通过 HTTP 调用技能入口：

1. 方法：`POST`
2. 路径：`/skill/music/handle`
3. 内容类型：`application/json`

MVP 阶段也可以由 OpenClaw 直接调用 [music-skill.handler.ts](D:\Music-Skill\src\interfaces\openclaw\music-skill.handler.ts) 中的处理器。

## 4. 请求协议

### 4.1 请求字段

当前定义见 [dto.ts](D:\Music-Skill\src\interfaces\openclaw\dto.ts)。

请求体：

```json
{
  "userId": "u_001",
  "sessionId": "s_001",
  "inputType": "text",
  "text": "播放周杰伦的晴天"
}
```

字段说明：

1. `userId`：用户唯一标识
2. `sessionId`：当前会话唯一标识
3. `inputType`：`text` 或 `voice`
4. `text`：OpenClaw 已清洗后的文本内容

### 4.2 语音约定

MVP 阶段建议由 OpenClaw 先完成语音转写，再将文本结果传给 Music Skill。

因此当前 skill 不直接接收音频二进制流，只接收：

1. `inputType=voice`
2. 对应转写后的 `text`

## 5. 响应协议

当前定义见 [dto.ts](D:\Music-Skill\src\interfaces\openclaw\dto.ts)。

成功响应示例：

```json
{
  "status": "success",
  "intent": "music.play",
  "replyText": "正在播放周杰伦的《晴天》。",
  "payload": {
    "playbackStatus": "playing",
    "trackId": "track_qingtian",
    "trackTitle": "晴天",
    "artistName": "周杰伦"
  }
}
```

失败响应示例：

```json
{
  "status": "error",
  "intent": "music.unsupported",
  "replyText": "This command is not supported yet.",
  "errorCode": "INTENT_NOT_SUPPORTED"
}
```

字段说明：

1. `status`：`success` 或 `error`
2. `intent`：技能识别出的最终意图
3. `replyText`：返回给 OpenClaw 的自然语言回复
4. `payload`：结构化结果，供宿主后续做 UI 或动作联动
5. `errorCode`：失败时的标准错误码

## 6. Manifest 说明

[openclaw.skill.json](D:\Music-Skill\openclaw.skill.json) 提供一版宿主可读的技能元数据。

核心字段：

1. `entry`：声明入口协议、方法和路径
2. `capabilities`：声明支持文字、语音和主要动作
3. `intents`：声明当前已支持或预留的意图集合
4. `config`：声明与环境变量关联的配置项

## 7. 本地调试

当前仓库已经提供一个最小启动入口 [bootstrap.ts](D:\Music-Skill\src\app\bootstrap.ts)。

运行：

```bash
pnpm dev
```

当前默认模拟请求：

```json
{
  "userId": "demo-user",
  "sessionId": "demo-session",
  "inputType": "text",
  "text": "播放周杰伦的晴天"
}
```

返回结果示例：

```json
{
  "status": "success",
  "intent": "music.play",
  "replyText": "正在播放周杰伦的《晴天》。"
}
```

如果需要按 manifest 方式联调 HTTP 接口，运行：

```bash
pnpm dev:http
```

然后请求：

```bash
curl -X POST http://localhost:3000/skill/music/handle ^
  -H "Content-Type: application/json" ^
  -d "{\"userId\":\"u_001\",\"sessionId\":\"s_001\",\"inputType\":\"text\",\"text\":\"播放周杰伦的晴天\"}"
```

## 8. 后续扩展建议

后续接入 OpenClaw 时，建议继续扩展：

1. 增加 `clarification` 状态，支持宿主渲染候选项
2. 增加结构化 `payload`
3. 增加 `requestId` 和 `timestamp`
4. 增加语音反馈和动作建议字段
5. 将 manifest 中的 intents 与代码中的 intent 常量统一生成

## 9. 建议的下一步改造

为了让宿主真正可接，建议下一步补：

1. HTTP server 和 `/skill/music/handle` 路由
2. 请求参数校验
3. 统一错误码映射
4. `clarification` 响应结构
