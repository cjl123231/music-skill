$ErrorActionPreference = "Stop"

Add-Type -AssemblyName System.Speech

function Get-OpenClawHome {
  if ($env:OPENCLAW_HOME) {
    return $env:OPENCLAW_HOME
  }

  return Join-Path $HOME ".openclaw"
}

function Get-GeneratedWakeWord {
  $agentRoot = Join-Path (Get-OpenClawHome) "agents\\music-agent"
  $triggersPath = Join-Path $agentRoot "TRIGGERS.md"
  $envPath = Join-Path $agentRoot "config\\env.json"

  if (Test-Path $triggersPath) {
    $content = Get-Content -Path $triggersPath -Raw -Encoding UTF8
    $match = [regex]::Match($content, "## Wake Word\s+([^\r\n]+)")
    if ($match.Success -and -not [string]::IsNullOrWhiteSpace($match.Groups[1].Value)) {
      return $match.Groups[1].Value.Trim()
    }
  }

  if (Test-Path $envPath) {
    try {
      $envJson = Get-Content -Path $envPath -Raw -Encoding UTF8 | ConvertFrom-Json
      if ($envJson.wakeWord) {
        return [string]$envJson.wakeWord
      }
    } catch {
    }
  }

  return $null
}

function Get-VoiceCommandHints {
  return @(
    "播放录音",
    "播放晴天",
    "暂停",
    "继续播放",
    "下一首",
    "上一首",
    "现在播放的是什么",
    "收藏这首歌",
    "查看收藏",
    "播放我的收藏",
    "播放我收藏的录音",
    "下载这首歌",
    "下载好了没",
    "查看下载列表",
    "记住我喜欢周杰伦",
    "以后别放这种",
    "按我的喜好播放",
    "来点适合写代码的",
    "来点安静的",
    "来点适合学习的",
    "来点放松的",
    "来点运动的",
    "音量调到30%",
    "音量调到50%"
  )
}

function Get-WakeWordAliases([string]$WakeWord) {
  $aliases = New-Object System.Collections.Generic.List[string]
  if (-not [string]::IsNullOrWhiteSpace($WakeWord)) {
    $aliases.Add($WakeWord)
  }

  switch ($WakeWord) {
    "哈基咪" {
      $aliases.Add("哈基米")
      $aliases.Add("哈吉咪")
      $aliases.Add("哈吉米")
      $aliases.Add("哈基咪咪")
    }
    "音乐控制" {
      $aliases.Add("音乐助手")
    }
  }

  return $aliases | Select-Object -Unique
}

function New-Synthesizer {
  $synth = New-Object System.Speech.Synthesis.SpeechSynthesizer
  $synth.Volume = if ($env:MUSIC_AGENT_TTS_VOLUME) { [int]$env:MUSIC_AGENT_TTS_VOLUME } else { 100 }
  $synth.Rate = if ($env:MUSIC_AGENT_TTS_RATE) { [int]$env:MUSIC_AGENT_TTS_RATE } else { 0 }
  return $synth
}

function Normalize-Transcript([string]$Text) {
  $normalized = $Text
  $normalized = $normalized -replace "[，、。！？；：,.!?;:]", " "
  $normalized = $normalized -replace "\s+", " "
  return $normalized.Trim()
}

function Remove-WakeWord([string]$Text, [string[]]$WakeWords) {
  foreach ($word in $WakeWords) {
    if ([string]::IsNullOrWhiteSpace($word)) {
      continue
    }

    $index = $Text.IndexOf($word, [System.StringComparison]::OrdinalIgnoreCase)
    if ($index -lt 0) {
      continue
    }

    $start = $index + $word.Length
    $command = $Text.Substring($start).Trim(" ", ",", ".", "，", "。", "！", "？", "、", ":")
    if (-not [string]::IsNullOrWhiteSpace($command)) {
      return $command
    }
  }

  return ""
}

function New-CommandGrammar([string]$WakeWord, [string[]]$CommandHints) {
  $builder = New-Object System.Speech.Recognition.GrammarBuilder
  $builder.Culture = [System.Globalization.CultureInfo]"zh-CN"

  $wakeChoices = New-Object System.Speech.Recognition.Choices
  foreach ($alias in (Get-WakeWordAliases $WakeWord)) {
    [void]$wakeChoices.Add($alias)
  }

  $separatorChoices = New-Object System.Speech.Recognition.Choices
  [void]$separatorChoices.Add("")
  [void]$separatorChoices.Add("，")
  [void]$separatorChoices.Add(",")
  [void]$separatorChoices.Add(" ")

  $commandChoices = New-Object System.Speech.Recognition.Choices
  foreach ($command in $CommandHints) {
    [void]$commandChoices.Add($command)
  }

  [void]$builder.Append($wakeChoices)
  [void]$builder.Append($separatorChoices)
  [void]$builder.Append($commandChoices)

  return New-Object System.Speech.Recognition.Grammar($builder)
}

function Get-SpeakableReply([object]$Response, [string]$Mode) {
  if ($null -eq $Response -or [string]::IsNullOrWhiteSpace($Response.replyText)) {
    return $null
  }

  $action = if ($Response.action) { [string]$Response.action } else { "" }
  $replyText = ([string]$Response.replyText).Trim()
  $trackTitle = if ($null -ne $Response.payload -and $Response.payload.trackTitle) { [string]$Response.payload.trackTitle } else { "" }

  switch ($action) {
    "music.pause" { return "好，先暂停一下。" }
    "music.resume" { return "好，继续播放。" }
    "music.next" { return "好，切到下一首。" }
    "music.previous" { return "好，回到上一首。" }
    "music.favorite.add" {
      if ($trackTitle) { return "已经帮你收藏《$trackTitle》。" }
      return "已经帮你收藏了。"
    }
    "music.download.track" {
      if ($trackTitle) { return "好，已经开始下载《$trackTitle》。" }
      return "好，已经开始下载。"
    }
    "music.play" {
      if ($trackTitle) { return "好，给你播放《$trackTitle》。" }
      return "好，开始播放。"
    }
  }

  if ($action -in @("music.download.list", "music.favorite.list")) {
    return $null
  }

  if ($Mode -eq "off") {
    return $null
  }

  if ($Mode -eq "short") {
    if ($replyText.Length -gt 60) {
      return $replyText.Substring(0, 60).TrimEnd() + "。"
    }

    return $replyText
  }

  return $replyText
}

function Speak-AgentReply([object]$Response, [System.Speech.Synthesis.SpeechSynthesizer]$Synth, [bool]$Enabled, [string]$Mode) {
  if (-not $Enabled -or $null -eq $Synth) {
    return
  }

  $text = Get-SpeakableReply $Response $Mode
  if ([string]::IsNullOrWhiteSpace($text)) {
    return
  }

  try {
    $Synth.SpeakAsyncCancelAll()
    $Synth.SpeakAsync($text) | Out-Null
  } catch {
    Write-Host "TTS failed:" $_.Exception.Message
  }
}

$endpoint = if ($env:MUSIC_AGENT_ENDPOINT) {
  $env:MUSIC_AGENT_ENDPOINT
} elseif ($env:MUSIC_SKILL_ENDPOINT) {
  $env:MUSIC_SKILL_ENDPOINT
} else {
  $port = if ($env:PORT) { $env:PORT } else { "3000" }
  "http://localhost:$port/agent/music/handle"
}

$userId = if ($env:MUSIC_VOICE_USER_ID) { $env:MUSIC_VOICE_USER_ID } else { "voice-user" }
$sessionId = if ($env:MUSIC_VOICE_SESSION_ID) { $env:MUSIC_VOICE_SESSION_ID } else { "voice-session" }
$wakeWord = if ($env:MUSIC_VOICE_WAKE_WORD) {
  $env:MUSIC_VOICE_WAKE_WORD
} else {
  $generatedWakeWord = Get-GeneratedWakeWord
  if ($generatedWakeWord) { $generatedWakeWord } else { "哈基咪" }
}
$wakeWordAliases = Get-WakeWordAliases $wakeWord
$confidenceThreshold = if ($env:MUSIC_VOICE_CONFIDENCE) { [double]$env:MUSIC_VOICE_CONFIDENCE } else { 0.58 }
$ttsEnabled = if ($env:MUSIC_AGENT_TTS_ENABLED) { $env:MUSIC_AGENT_TTS_ENABLED -ne "false" } else { $true }
$ttsMode = if ($env:MUSIC_AGENT_TTS_MODE) { $env:MUSIC_AGENT_TTS_MODE } else { "short" }
$synth = if ($ttsEnabled) { New-Synthesizer } else { $null }
$commandHints = Get-VoiceCommandHints

try {
  $culture = [System.Globalization.CultureInfo]"zh-CN"
  $recognizer = New-Object System.Speech.Recognition.SpeechRecognitionEngine($culture)
} catch {
  $recognizer = New-Object System.Speech.Recognition.SpeechRecognitionEngine
}

$recognizer.SetInputToDefaultAudioDevice()
$recognizer.LoadGrammar((New-Object System.Speech.Recognition.DictationGrammar))
try {
  $recognizer.LoadGrammar((New-CommandGrammar $wakeWord $commandHints))
} catch {
  Write-Host "Custom command grammar failed, continuing with dictation only."
}

$script:lastHandledText = ""
$script:lastHandledAt = [datetime]::MinValue

function Invoke-Agent([string]$Text) {
  $body = @{
    userId = $userId
    sessionId = $sessionId
    inputType = "voice"
    text = $Text
    source = "headset_voice"
    timestamp = [datetime]::UtcNow.ToString("o")
  } | ConvertTo-Json

  $response = Invoke-RestMethod -Method Post -Uri $endpoint -ContentType "application/json; charset=utf-8" -Body $body
  Write-Host ">"
  Write-Host "Recognized:" $Text
  Write-Host "Reply:" $response.replyText
  Write-Host ""
  Speak-AgentReply $response $synth $ttsEnabled $ttsMode
}

Register-ObjectEvent -InputObject $recognizer -EventName SpeechRecognized -Action {
  $result = $Event.SourceEventArgs.Result
  if ($null -eq $result) {
    return
  }

  $rawText = if ($result.Text) { [string]$result.Text } else { "" }
  $text = Normalize-Transcript $rawText
  if ([string]::IsNullOrWhiteSpace($text)) {
    return
  }

  $command = Remove-WakeWord $text $wakeWordAliases
  if ([string]::IsNullOrWhiteSpace($command)) {
    return
  }

  if ($result.Confidence -lt $confidenceThreshold) {
    Write-Host "Ignored by confidence:" $rawText "confidence=" $result.Confidence
    return
  }

  $now = Get-Date
  if ($script:lastHandledText -eq $command -and ($now - $script:lastHandledAt).TotalSeconds -lt 3) {
    return
  }

  $script:lastHandledText = $command
  $script:lastHandledAt = $now

  try {
    Invoke-Agent $command
  } catch {
    Write-Host "Recognized:" $command
    Write-Host "Agent request failed:" $_.Exception.Message
    Write-Host ""
  }
} | Out-Null

Register-ObjectEvent -InputObject $recognizer -EventName SpeechRecognitionRejected -Action {
  $result = $Event.SourceEventArgs.Result
  if ($null -ne $result -and -not [string]::IsNullOrWhiteSpace($result.Text)) {
    Write-Host "Rejected speech:" $result.Text
  }
} | Out-Null

Write-Host "Music Agent voice listener started"
Write-Host "Endpoint:" $endpoint
Write-Host "Wake word:" $wakeWord
Write-Host "Wake word aliases:" ($wakeWordAliases -join ", ")
Write-Host "Confidence threshold:" $confidenceThreshold
Write-Host "Loaded command hints:" $commandHints.Count
Write-Host "TTS enabled:" $ttsEnabled
Write-Host "TTS mode:" $ttsMode
Write-Host "Example: $wakeWord，播放录音"
Write-Host "Press Ctrl+C to stop"
Write-Host ""

$recognizer.RecognizeAsync([System.Speech.Recognition.RecognizeMode]::Multiple)

try {
  while ($true) {
    Start-Sleep -Seconds 1
  }
} finally {
  $recognizer.RecognizeAsyncCancel()
  $recognizer.Dispose()
  if ($synth) {
    $synth.SpeakAsyncCancelAll()
    $synth.Dispose()
  }
}
