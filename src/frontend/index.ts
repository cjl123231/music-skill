import { resolve } from "node:path";

export const FrontendSurface = {
  PanelHtml: resolve("ui", "panel.html"),
  PanelScript: resolve("ui", "app.js"),
  PanelStyles: resolve("ui", "styles.css"),
  DesktopMain: resolve("desktop", "main.cjs"),
  DesktopPreload: resolve("desktop", "preload.cjs")
} as const;

export type FrontendSurfaceKey = keyof typeof FrontendSurface;
