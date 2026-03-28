const stateUrl = "/api/panel/state";
const actionUrl = "/agent/music/handle";

const userId = "panel-user";
const sessionId = "panel-session";
const SpeechRecognitionCtor = window.SpeechRecognition || window.webkitSpeechRecognition;

let recognition = null;
let isRecording = false;
let isHandlingVoiceCommand = false;
let lastTranscript = "";
let lastFinalTranscript = "";
let lastFinalAt = 0;
let shouldContinueListening = false;
let restartTimer = null;
let latestReasoning = "";

function formatDuration(durationMs) {
  if (!durationMs) return "--:--";
  const totalSeconds = Math.floor(durationMs / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function normalizeTranscript(text) {
  return text.replace(/[，。！？,.!?]/g, " ").replace(/\s+/g, " ").trim();
}

function shouldIgnoreDuplicate(transcript) {
  const now = Date.now();
  return transcript === lastFinalTranscript && now - lastFinalAt < 3000;
}

function createDownloadItem(task) {
  const item = document.createElement("article");
  item.className = "download-item";
  const statusText = task.status === "completed" ? "已完成" : task.status;
  item.innerHTML = `
    <div class="download-title">
      <strong>${task.trackTitle}</strong>
      <span class="muted">${statusText}</span>
    </div>
    <div class="progress-track">
      <div class="progress-fill" style="width: 100%"></div>
    </div>
    <p class="download-path">${task.filePath ?? "暂无路径"}</p>
  `;
  return item;
}

function createFavoriteItem(track) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "favorite-item favorite-play-button";
  button.innerHTML = `
    <div class="download-title">
      <strong>${track.title}</strong>
      <span class="muted">${track.artist}</span>
    </div>
  `;
  button.addEventListener("click", async () => {
    await handleCommand(`播放我收藏的${track.title}`);
  });
  return button;
}

async function sendCommand(text, inputType = "text") {
  const response = await fetch(actionUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      userId,
      sessionId,
      inputType,
      text,
      source: "panel"
    })
  });

  return response.json();
}

function renderProviderStatus(provider) {
  const chip = document.getElementById("library-status");
  chip.textContent = provider.connected ? `${provider.label} · ${provider.trackCount ?? 0} 首` : provider.label;
  chip.title = provider.detail || "";
  chip.classList.toggle("connected", Boolean(provider.connected));
}

function renderAgentState(agent) {
  const wakeWord = agent?.wakeWord ?? "小乐";
  const templateId = agent?.templateId ?? "default";
  document.getElementById("agent-name").textContent = agent?.name ?? "Music Agent Panel";
  document.getElementById("agent-description").textContent =
    agent?.description ?? "查看播放状态、下载任务和收藏列表，并通过文字或语音控制音乐 Agent。";
  document.getElementById("agent-wake-word").textContent = `唤醒词：${wakeWord}`;
  document.getElementById("agent-template").textContent = `人格模板：${templateId}`;
  document.getElementById("voice-example").textContent = `建议说法：${wakeWord}，播放录音。也可以说：${wakeWord}，来点安静的。`;
}

function renderResult(replyText) {
  document.getElementById("feedback-text").textContent = replyText;
}

function renderReasoning(reasoning) {
  document.getElementById("agent-reasoning").textContent = reasoning || "等待 Agent 推荐理由";
}

function renderFavorites(state) {
  const favoriteButton = document.getElementById("favorite-button");
  const favoriteCount = document.getElementById("favorite-count");
  const favoriteList = document.getElementById("favorite-list");

  favoriteButton.textContent = state.isCurrentTrackFavorited ? "已收藏" : "收藏";
  favoriteButton.disabled = Boolean(state.isCurrentTrackFavorited);

  favoriteCount.textContent = `${state.favoriteCount ?? 0} 首`;
  favoriteList.innerHTML = "";

  if (!state.favorites?.length) {
    const empty = document.createElement("p");
    empty.className = "muted";
    empty.textContent = "你还没有收藏任何歌曲";
    favoriteList.appendChild(empty);
    return;
  }

  state.favorites.forEach((track) => favoriteList.appendChild(createFavoriteItem(track)));
}

async function refreshPanel() {
  const response = await fetch(stateUrl);
  const state = await response.json();

  renderAgentState(state.agent);
  renderReasoning(latestReasoning);

  document.getElementById("track-title").textContent = state.currentTrack?.title ?? "当前没有播放内容";
  document.getElementById("track-artist").textContent = state.currentTrack?.artist ?? "等待音乐指令";
  document.getElementById("track-album").textContent = state.currentTrack?.album
    ? `专辑：${state.currentTrack.album}`
    : "专辑信息待更新";
  document.getElementById("playback-status").textContent = state.playbackStatusLabel;
  document.getElementById("playback-duration").textContent = formatDuration(state.currentTrack?.durationMs);
  document.getElementById("debug-source").textContent = state.currentTrack?.source ?? "-";
  document.getElementById("debug-track-id").textContent = state.currentTrack?.id ?? "-";
  document.getElementById("debug-file-path").textContent = state.currentTrack?.filePath ?? "-";
  document.getElementById("debug-card").hidden = !state.debug;

  renderProviderStatus(state.provider);
  renderFavorites(state);

  if (!isHandlingVoiceCommand) {
    renderResult(state.feedbackText);
  }

  const toggleButton = document.getElementById("toggle-playback");
  if (state.playbackStatusLabel === "播放中") {
    toggleButton.textContent = "暂停";
    toggleButton.setAttribute("data-command", "暂停");
  } else if (state.currentTrack) {
    toggleButton.textContent = "继续播放";
    toggleButton.setAttribute("data-command", "继续播放");
  } else {
    toggleButton.textContent = "暂停";
    toggleButton.setAttribute("data-command", "暂停");
  }

  document.getElementById("playback-progress").style.width = state.currentTrack ? "38%" : "0%";
  document.getElementById("download-count").textContent = `${state.downloads.length} 项`;

  const downloadList = document.getElementById("download-list");
  downloadList.innerHTML = "";
  if (!state.downloads.length) {
    const empty = document.createElement("p");
    empty.className = "muted";
    empty.textContent = "当前没有下载任务";
    downloadList.appendChild(empty);
  } else {
    state.downloads.forEach((task) => downloadList.appendChild(createDownloadItem(task)));
  }
}

async function handleCommand(text, inputType = "text") {
  const result = await sendCommand(text, inputType);
  latestReasoning = result.reasoning ?? result.payload?.recommendationReason ?? "";
  renderResult(result.replyText);
  renderReasoning(latestReasoning);
  await refreshPanel();
  return result;
}

function setVoiceStatus(text, recording = false, retryable = false) {
  const button = document.getElementById("voice-toggle");
  const status = document.getElementById("voice-status");
  const retryButton = document.getElementById("voice-retry");

  status.textContent = text;
  button.textContent = recording ? "停止语音" : "开始语音";
  button.classList.toggle("recording", recording);
  retryButton.hidden = !retryable;
}

function clearRestartTimer() {
  if (restartTimer) {
    clearTimeout(restartTimer);
    restartTimer = null;
  }
}

function scheduleRestart() {
  clearRestartTimer();
  if (!shouldContinueListening || !recognition || isRecording || isHandlingVoiceCommand) {
    return;
  }

  restartTimer = setTimeout(() => {
    if (!shouldContinueListening || !recognition || isRecording || isHandlingVoiceCommand) {
      return;
    }

    try {
      recognition.start();
    } catch {
      setVoiceStatus("语音重新启动失败，可点击重试", false, true);
    }
  }, 800);
}

function setupVoiceRecognition() {
  if (!SpeechRecognitionCtor) {
    setVoiceStatus("当前浏览器不支持原生语音识别", false, false);
    document.getElementById("voice-toggle").disabled = true;
    return;
  }

  const continuousToggle = document.getElementById("voice-continuous");
  continuousToggle.addEventListener("change", () => {
    shouldContinueListening = continuousToggle.checked;
    if (shouldContinueListening && !isRecording && recognition && !isHandlingVoiceCommand) {
      scheduleRestart();
    }
  });

  recognition = new SpeechRecognitionCtor();
  recognition.lang = "zh-CN";
  recognition.interimResults = true;
  recognition.maxAlternatives = 1;
  recognition.continuous = false;

  recognition.onstart = () => {
    isRecording = true;
    setVoiceStatus(shouldContinueListening ? "连续监听中，请开始说话" : "正在听，请开始说话", true, false);
  };

  recognition.onend = () => {
    isRecording = false;
    if (!lastTranscript) {
      setVoiceStatus("语音识别已停止，没有拿到结果", false, true);
      scheduleRestart();
      return;
    }

    setVoiceStatus(`识别结果：${lastTranscript}`, false, true);
    scheduleRestart();
  };

  recognition.onerror = (event) => {
    isRecording = false;
    setVoiceStatus(`语音识别失败：${event.error}，可以点击重试`, false, true);
    scheduleRestart();
  };

  recognition.onresult = async (event) => {
    const transcript = normalizeTranscript(
      Array.from(event.results)
        .map((result) => result[0]?.transcript ?? "")
        .join(" ")
    );

    if (!transcript) return;

    lastTranscript = transcript;
    document.getElementById("command-input").value = transcript;

    const latestResult = event.results[event.results.length - 1];
    if (!latestResult?.isFinal) {
      setVoiceStatus(`识别中：${transcript}`, true, false);
      return;
    }

    if (shouldIgnoreDuplicate(transcript)) {
      setVoiceStatus(`已忽略重复语音：${transcript}`, false, true);
      scheduleRestart();
      return;
    }

    lastFinalTranscript = transcript;
    lastFinalAt = Date.now();
    isHandlingVoiceCommand = true;
    setVoiceStatus(`识别结果：${transcript}`, false, true);
    renderResult(`识别结果：${transcript}`);

    try {
      await handleCommand(transcript, "voice");
    } finally {
      isHandlingVoiceCommand = false;
      scheduleRestart();
    }
  };

  document.getElementById("voice-toggle").addEventListener("click", () => {
    if (!recognition) return;

    if (isRecording) {
      shouldContinueListening = false;
      document.getElementById("voice-continuous").checked = false;
      clearRestartTimer();
      recognition.stop();
      return;
    }

    lastTranscript = "";
    clearRestartTimer();
    recognition.start();
  });

  document.getElementById("voice-retry").addEventListener("click", () => {
    if (!recognition) return;
    lastTranscript = "";
    clearRestartTimer();
    recognition.start();
  });
}

document.getElementById("command-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  const input = document.getElementById("command-input");
  const text = input.value.trim();
  if (!text) return;

  await handleCommand(text);
  input.value = "";
});

document.querySelectorAll("[data-command]").forEach((button) => {
  button.addEventListener("click", async () => {
    if (button.id === "favorite-button" && button.disabled) {
      return;
    }

    const text = button.getAttribute("data-command");
    if (!text) return;
    await handleCommand(text);
  });
});

refreshPanel();
setupVoiceRecognition();
setInterval(refreshPanel, 3000);
