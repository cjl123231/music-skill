const { app, BrowserWindow, dialog, ipcMain, shell } = require("electron");
const { spawn } = require("node:child_process");
const { existsSync } = require("node:fs");
const { resolve } = require("node:path");
const net = require("node:net");

const repoRoot = resolve(__dirname, "..");
const panelPort = Number(process.env.DESKTOP_PLAYER_PORT ?? 3330);

let backendProcess = null;
let mainWindow = null;

function createPortProbe(port) {
  return new Promise((resolveProbe) => {
    const socket = net.connect({ host: "127.0.0.1", port }, () => {
      socket.end();
      resolveProbe(true);
    });

    socket.on("error", () => resolveProbe(false));
  });
}

async function waitForServer(port, retries = 60, delayMs = 500) {
  for (let index = 0; index < retries; index += 1) {
    if (await createPortProbe(port)) {
      return true;
    }
    await new Promise((resolveDelay) => setTimeout(resolveDelay, delayMs));
  }
  return false;
}

function createBackendProcess() {
  const cliPath = resolve(repoRoot, "node_modules", "tsx", "dist", "cli.mjs");
  if (!existsSync(cliPath)) {
    throw new Error("缺少 tsx 运行时，请先执行 pnpm install。");
  }

  const nodeBinary = process.env.NODE_BINARY || "node";
  const child = spawn(nodeBinary, [cliPath, "src/interfaces/http/server-runner.ts"], {
    cwd: repoRoot,
    stdio: "ignore",
    windowsHide: true,
    detached: false,
    env: {
      ...process.env,
      PORT: String(panelPort),
      DESKTOP_PLAYER_MODE: "1"
    }
  });

  child.once("exit", () => {
    backendProcess = null;
  });

  return child;
}

async function ensureBackend() {
  if (await createPortProbe(panelPort)) {
    return;
  }

  backendProcess = createBackendProcess();
  const ready = await waitForServer(panelPort);
  if (!ready) {
    throw new Error(`播放器后端未能在端口 ${panelPort} 上启动。`);
  }
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1480,
    height: 980,
    minWidth: 1180,
    minHeight: 820,
    backgroundColor: "#07111a",
    autoHideMenuBar: true,
    title: "小乐播放器",
    webPreferences: {
      preload: resolve(__dirname, "preload.cjs"),
      contextIsolation: true,
      sandbox: false
    }
  });

  void mainWindow.loadURL(`http://127.0.0.1:${panelPort}/panel`);

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    void shell.openExternal(url);
    return { action: "deny" };
  });

  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

ipcMain.handle("desktop:get-meta", () => ({
  panelUrl: `http://127.0.0.1:${panelPort}/panel`,
  panelPort
}));

ipcMain.handle("desktop:restart-backend", async () => {
  if (backendProcess && !backendProcess.killed) {
    backendProcess.kill();
    backendProcess = null;
  }

  await ensureBackend();
  if (mainWindow) {
    await mainWindow.loadURL(`http://127.0.0.1:${panelPort}/panel`);
  }

  return { ok: true };
});

app.whenReady().then(async () => {
  try {
    await ensureBackend();
    createWindow();
  } catch (error) {
    const message = error instanceof Error ? error.message : "未知错误";
    dialog.showErrorBox("小乐播放器启动失败", message);
    app.quit();
  }

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("before-quit", () => {
  if (backendProcess && !backendProcess.killed) {
    backendProcess.kill();
    backendProcess = null;
  }
});
