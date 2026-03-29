const stateUrl = "/api/panel/state";
const actionUrl = "/agent/music/handle";
const launchVoiceUrl = "/api/agent/voice/start";
const stopVoiceUrl = "/api/agent/voice/stop";

const userId = "panel-user";
const sessionId = "panel-session";

const BUTTON_COMMANDS = {
  previous: "previous",
  pause: "pause",
  resume: "continue",
  favorite: "favorite this",
  download: "download this song",
  volumeDown: "volume down 10%",
  volumeUp: "volume up 10%"
};

let activeSection = "library";
let panelState = null;
let refreshRequestId = 0;
let isCommandPending = false;

let playbackClock = {
  trackId: null,
  startedAt: 0,
  elapsedMs: 0,
  status: "idle"
};

function formatDuration(durationMs) {
  if (!durationMs) return "--:--";
  const totalSeconds = Math.floor(durationMs / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function setCommandPending(pending) {
  isCommandPending = pending;

  document
    .querySelectorAll("button[data-command], #command-input, #command-submit, #voice-launch, #voice-stop")
    .forEach((element) => {
      if (!(element instanceof HTMLButtonElement) && !(element instanceof HTMLInputElement)) {
        return;
      }

      if (pending) {
        element.dataset.wasDisabled = element.disabled ? "1" : "0";
        element.disabled = true;
        return;
      }

      if (element.dataset.wasDisabled === "0") {
        element.disabled = false;
      }
      delete element.dataset.wasDisabled;
    });
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

function createTrackButton(track, currentTrackId) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "favorite-item favorite-play-button";
  if (track.id === currentTrackId) {
    button.classList.add("is-active");
  }

  button.innerHTML = `
    <div class="download-title">
      <strong>${track.title}</strong>
      <span class="muted">${track.artist}</span>
    </div>
  `;
  button.addEventListener("click", async () => {
    if (isCommandPending) return;
    await handleCommand(`play ${track.title}`);
  });
  return button;
}

async function sendCommand(text, inputType = "text", source = "panel") {
  const response = await fetch(actionUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      userId,
      sessionId,
      inputType,
      text,
      source,
      timestamp: new Date().toISOString()
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
  document.getElementById("agent-name").textContent = agent?.name ?? "Music Agent";
  document.getElementById("agent-description").textContent = agent?.description ?? "本地音乐助手";
  document.getElementById("agent-wake-word").textContent = `唤醒词：${agent?.wakeWord ?? "小乐"}`;
  document.getElementById("agent-template").textContent = `人格模板：${agent?.templateId ?? "default"}`;
}

function renderResult(replyText) {
  document.getElementById("feedback-text").textContent = replyText;
}

function renderVoiceState(localVoice) {
  const voiceStatus = document.getElementById("voice-status");
  const launchButton = document.getElementById("voice-launch");
  const stopButton = document.getElementById("voice-stop");

  if (!localVoice?.supported) {
    voiceStatus.textContent = localVoice?.label ?? "当前平台暂不支持从桌面播放器管理本地语音。";
    launchButton.textContent = "本地语音不可用";
    launchButton.disabled = true;
    stopButton.disabled = true;
    return;
  }

  voiceStatus.textContent = localVoice.label;
  launchButton.textContent = localVoice.running ? "本地语音已启动" : "启动本地语音";
  launchButton.disabled = Boolean(localVoice.running || isCommandPending);
  stopButton.disabled = Boolean(!localVoice.running || isCommandPending);
}

function setActiveSection(section) {
  activeSection = section;
  document.querySelectorAll("[data-section-target]").forEach((element) => {
    element.classList.toggle("is-active", element.getAttribute("data-section-target") === section);
  });
  document.querySelectorAll("[data-section-panel]").forEach((element) => {
    element.classList.toggle("is-visible", element.getAttribute("data-section-panel") === section);
  });
  if (section === "command") {
    document.getElementById("command-input")?.focus();
  }
}

function renderFavorites(state) {
  const favoriteButton = document.getElementById("favorite-button");
  const favoriteCount = document.getElementById("favorite-count");
  const favoriteList = document.getElementById("favorite-list");

  favoriteButton.textContent = state.isCurrentTrackFavorited ? "已收藏" : "收藏";
  favoriteButton.disabled = Boolean(state.isCurrentTrackFavorited || !state.currentTrack || isCommandPending);

  favoriteCount.textContent = `${state.favoriteCount ?? 0} 首`;
  favoriteList.innerHTML = "";

  if (!state.favorites?.length) {
    const empty = document.createElement("p");
    empty.className = "muted";
    empty.textContent = "还没有收藏歌曲。";
    favoriteList.appendChild(empty);
    return;
  }

  state.favorites.forEach((track) => {
    favoriteList.appendChild(createTrackButton(track, state.currentTrack?.id ?? null));
  });
}

function renderLibraryTracks(state) {
  const libraryCount = document.getElementById("library-count");
  const libraryList = document.getElementById("library-list");
  const currentTrackId = state.currentTrack?.id ?? null;

  libraryCount.textContent = `${state.libraryTracks?.length ?? 0} 首`;
  libraryList.innerHTML = "";

  if (!state.libraryTracks?.length) {
    const empty = document.createElement("p");
    empty.className = "muted";
    empty.textContent = "当前曲库里没有可播放的歌曲。";
    libraryList.appendChild(empty);
    return;
  }

  state.libraryTracks.forEach((track) => {
    libraryList.appendChild(createTrackButton(track, currentTrackId));
  });
}

function renderDownloads(state) {
  document.getElementById("download-count").textContent = `${state.downloads.length} 项`;
  const downloadList = document.getElementById("download-list");
  downloadList.innerHTML = "";

  if (!state.downloads.length) {
    const empty = document.createElement("p");
    empty.className = "muted";
    empty.textContent = "暂无下载任务。";
    downloadList.appendChild(empty);
    return;
  }

  state.downloads.forEach((task) => {
    downloadList.appendChild(createDownloadItem(task));
  });
}

function syncPlaybackClock(state) {
  const trackId = state.currentTrack?.id ?? null;
  const status = state.playbackStatus ?? "idle";
  const now = Date.now();

  if (!trackId) {
    playbackClock = { trackId: null, startedAt: 0, elapsedMs: 0, status: "idle" };
    return;
  }

  if (playbackClock.trackId !== trackId) {
    playbackClock = {
      trackId,
      startedAt: status === "playing" ? now : 0,
      elapsedMs: 0,
      status
    };
    return;
  }

  if (playbackClock.status !== status) {
    if (status === "playing") {
      playbackClock.startedAt = now;
    } else if (playbackClock.status === "playing") {
      playbackClock.elapsedMs += Math.max(0, now - playbackClock.startedAt);
      playbackClock.startedAt = 0;
    }
    playbackClock.status = status;
  }
}

function getEstimatedElapsedMs(state) {
  if (!state.currentTrack) return 0;
  const now = Date.now();
  if (playbackClock.status === "playing" && playbackClock.startedAt) {
    return playbackClock.elapsedMs + Math.max(0, now - playbackClock.startedAt);
  }
  return playbackClock.elapsedMs;
}

function renderPlayer(state) {
  syncPlaybackClock(state);

  const elapsedMs = getEstimatedElapsedMs(state);
  const durationMs = state.currentTrack?.durationMs ?? 0;
  const progressPercent = durationMs ? Math.min(100, (elapsedMs / durationMs) * 100) : 0;

  document.getElementById("track-title").textContent = state.currentTrack?.title ?? "暂无歌曲";
  document.getElementById("track-artist").textContent = state.currentTrack?.artist ?? "等待命令";
  document.getElementById("track-album").textContent = state.currentTrack?.album
    ? `专辑：${state.currentTrack.album}`
    : "专辑信息待更新";
  document.getElementById("playback-status").textContent = state.playbackStatusLabel;
  document.getElementById("playback-duration").textContent = formatDuration(durationMs);
  document.getElementById("volume-value").textContent = `${state.volumePercent ?? 50}%`;
  document.getElementById("playback-progress").style.width = `${progressPercent}%`;
  document.getElementById("volume-progress").style.width = `${state.volumePercent ?? 50}%`;
  document.getElementById("mini-track-title").textContent = state.currentTrack?.title ?? "未在播放";
  document.getElementById("mini-track-artist").textContent = state.currentTrack?.artist ?? "等待命令";

  const hasTrack = Boolean(state.currentTrack);
  const isPlaying = state.playbackStatus === "playing";
  const isPaused = state.playbackStatus === "paused";

  const toggleButton = document.getElementById("toggle-playback");
  if (isPlaying) {
    toggleButton.innerHTML = '<span aria-hidden="true">&#10074;&#10074;</span>';
    toggleButton.setAttribute("data-command", BUTTON_COMMANDS.pause);
    toggleButton.title = "暂停";
    toggleButton.setAttribute("aria-label", "暂停");
    toggleButton.disabled = isCommandPending;
  } else if (isPaused) {
    toggleButton.innerHTML = '<span aria-hidden="true">&#9654;</span>';
    toggleButton.setAttribute("data-command", BUTTON_COMMANDS.resume);
    toggleButton.title = "继续播放";
    toggleButton.setAttribute("aria-label", "继续播放");
    toggleButton.disabled = isCommandPending;
  } else {
    toggleButton.innerHTML = '<span aria-hidden="true">&#9654;</span>';
    toggleButton.setAttribute("data-command", BUTTON_COMMANDS.resume);
    toggleButton.title = "继续播放";
    toggleButton.setAttribute("aria-label", "继续播放");
    toggleButton.disabled = true;
  }

  document.querySelectorAll("[data-requires-track='true']").forEach((button) => {
    if (!(button instanceof HTMLButtonElement)) return;
    if (button.id === "toggle-playback") return;
    const command = button.getAttribute("data-command");
    if (!hasTrack || isCommandPending) {
      button.disabled = true;
      return;
    }
    if (command === BUTTON_COMMANDS.pause) {
      button.disabled = !isPlaying;
      return;
    }
    if (command === BUTTON_COMMANDS.resume) {
      button.disabled = !isPaused;
      return;
    }
    button.disabled = false;
  });
}

function renderLyrics(state) {
  const lyricsBody = document.getElementById("lyrics-body");
  const lyricsMeta = document.getElementById("lyrics-meta");
  lyricsBody.innerHTML = "";

  if (!state.currentTrack) {
    lyricsMeta.textContent = "空闲";
    const line = document.createElement("p");
    line.className = "lyric-line active";
    line.textContent = "播放一首歌后，这里会显示歌词。";
    lyricsBody.appendChild(line);
    return;
  }

  if (!state.lyrics?.found || !state.lyrics.lines?.length) {
    lyricsMeta.textContent = "未找到歌词";
    const line = document.createElement("p");
    line.className = "lyric-line active";
    line.textContent = "没有找到这首歌的本地歌词文件。";
    lyricsBody.appendChild(line);

    const hint = document.createElement("p");
    hint.className = "lyric-line";
    hint.textContent = "请把同名 .lrc 或 .txt 放在音频文件旁边。";
    lyricsBody.appendChild(hint);
    return;
  }

  lyricsMeta.textContent = state.lyrics.format ? state.lyrics.format.toUpperCase() : "歌词";
  const elapsedMs = getEstimatedElapsedMs(state);
  let activeIndex = -1;
  state.lyrics.lines.forEach((line, index) => {
    if (typeof line.timestampMs === "number" && line.timestampMs <= elapsedMs) {
      activeIndex = index;
    }
  });

  state.lyrics.lines.slice(0, 160).forEach((line, index) => {
    const row = document.createElement("p");
    row.className = `lyric-line${index === activeIndex ? " active is-current" : ""}`;
    row.textContent = line.text;
    lyricsBody.appendChild(row);
  });
}

function renderDebug(state) {
  document.getElementById("debug-source").textContent = state.currentTrack?.source ?? "-";
  document.getElementById("debug-track-id").textContent = state.currentTrack?.id ?? "-";
  document.getElementById("debug-file-path").textContent = state.currentTrack?.filePath ?? "-";
  document.getElementById("debug-card").hidden = !state.debug;
}

async function refreshPanel() {
  const requestId = ++refreshRequestId;
  const response = await fetch(stateUrl, { cache: "no-store" });
  const state = await response.json();
  if (requestId !== refreshRequestId) return;

  panelState = state;
  renderAgentState(state.agent);
  renderProviderStatus(state.provider);
  renderVoiceState(state.localVoice);
  renderPlayer(state);
  renderFavorites(state);
  renderLibraryTracks(state);
  renderDownloads(state);
  renderLyrics(state);
  renderDebug(state);
  renderResult(state.feedbackText);
}

async function handleCommand(text) {
  if (isCommandPending) {
    renderResult("上一条命令还在处理中，请稍等。");
    return null;
  }

  setCommandPending(true);
  try {
    const result = await sendCommand(text, "text", "panel");
    renderResult(result.replyText);
    await refreshPanel();
    return result;
  } catch (error) {
    renderResult(error instanceof Error ? error.message : "命令执行失败。");
    return null;
  } finally {
    setCommandPending(false);
    if (panelState) {
      renderPlayer(panelState);
      renderFavorites(panelState);
      renderVoiceState(panelState.localVoice);
    }
  }
}

async function postVoiceAction(url) {
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" }
  });
  return response.json();
}

async function launchLocalVoice() {
  if (isCommandPending) return;
  setCommandPending(true);
  try {
    const result = await postVoiceAction(launchVoiceUrl);
    document.getElementById("voice-status").textContent = result.replyText ?? "本地语音已启动。";
    renderResult(result.replyText ?? "本地语音已启动。");
    await refreshPanel();
  } catch (error) {
    const message = error instanceof Error ? error.message : "启动本地语音失败。";
    document.getElementById("voice-status").textContent = message;
    renderResult(message);
  } finally {
    setCommandPending(false);
    if (panelState) {
      renderVoiceState(panelState.localVoice);
    }
  }
}

async function stopLocalVoice() {
  if (isCommandPending) return;
  setCommandPending(true);
  try {
    const result = await postVoiceAction(stopVoiceUrl);
    document.getElementById("voice-status").textContent = result.replyText ?? "本地语音已停止。";
    renderResult(result.replyText ?? "本地语音已停止。");
    await refreshPanel();
  } catch (error) {
    const message = error instanceof Error ? error.message : "停止本地语音失败。";
    document.getElementById("voice-status").textContent = message;
    renderResult(message);
  } finally {
    setCommandPending(false);
    if (panelState) {
      renderVoiceState(panelState.localVoice);
    }
  }
}

function bindLocalVoiceControls() {
  document.getElementById("voice-launch").addEventListener("click", () => {
    void launchLocalVoice();
  });

  document.getElementById("voice-stop").addEventListener("click", () => {
    void stopLocalVoice();
  });
}

document.getElementById("command-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  if (isCommandPending) return;
  const input = document.getElementById("command-input");
  const text = input.value.trim();
  if (!text) return;
  await handleCommand(text);
  input.value = "";
});

document.querySelectorAll("[data-command]").forEach((button) => {
  button.addEventListener("click", async () => {
    if (!(button instanceof HTMLButtonElement)) return;
    if (button.disabled || isCommandPending) return;
    const text = button.getAttribute("data-command");
    if (!text) return;
    await handleCommand(text);
  });
});

document.querySelectorAll("[data-section-target]").forEach((button) => {
  button.addEventListener("click", () => {
    const section = button.getAttribute("data-section-target");
    if (!section) return;
    setActiveSection(section);
  });
});

refreshPanel().then(() => {
  setActiveSection(activeSection);
  bindLocalVoiceControls();
  setInterval(() => {
    if (!isCommandPending) {
      void refreshPanel();
    }
  }, 1000);
});
