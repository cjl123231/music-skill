# Music Skill 请求示例

## 1. 播放歌曲

```json
{
  "userId": "u_001",
  "sessionId": "s_001",
  "inputType": "text",
  "text": "播放周杰伦的晴天"
}
```

```json
{
  "status": "success",
  "intent": "music.play",
  "replyText": "正在播放周杰伦的《晴天》。"
}
```

## 2. 暂停播放

```json
{
  "userId": "u_001",
  "sessionId": "s_001",
  "inputType": "text",
  "text": "暂停"
}
```

## 3. 继续播放

```json
{
  "userId": "u_001",
  "sessionId": "s_001",
  "inputType": "text",
  "text": "继续播放"
}
```

## 4. 查询当前播放

```json
{
  "userId": "u_001",
  "sessionId": "s_001",
  "inputType": "text",
  "text": "现在播放的是什么"
}
```

## 5. 调整音量

```json
{
  "userId": "u_001",
  "sessionId": "s_001",
  "inputType": "text",
  "text": "音量调到 30%"
}
```
