// BroadcastChannel for 0ms sync between Window A (control) and Window B (detail).
import type { Project } from "./mockProjects";

export type SyncMessage =
  | { type: "OPEN_PROJECT"; projectId: string; project?: Project }
  | { type: "CLOSE_PROJECT"; projectId: string }
  | { type: "REQUEST_PROJECT" }
  | { type: "FILTER_CHANGE"; payload: unknown }
  | { type: "PING" }
  | { type: "PONG" }
  | { type: "PROJECT_UPDATE"; project: Project }
  | { type: "PROJECT_DELETED"; projectId: string }
  | { type: "MEMBER_RENAME"; oldName: string; newName: string }
  | { type: "MEMBER_UPDATE"; name: string };

export const SYNC_CHANNEL = "design-sync";

export function getSyncChannel(): BroadcastChannel | null {
  if (typeof window === "undefined" || typeof BroadcastChannel === "undefined") {
    return null;
  }
  return new BroadcastChannel(SYNC_CHANNEL);
}

// ---- Multi-screen target cache --------------------------------------------
// We must call window.open() SYNCHRONOUSLY inside the user gesture, otherwise
// browsers detach the popup from the gesture and (on permission prompt close)
// auto-scroll the clicked element into view — causing the page to jump.
//
// To open Window B on the right-side monitor at full size from the very first
// click, we resolve the target screen ONCE (lazily, at the first user gesture)
// and cache it. Subsequent openDetailWindow() calls use the cached features
// and run fully synchronously.

type ScreenRect = { left: number; top: number; width: number; height: number };
let cachedTarget: ScreenRect | null = null;
let resolveInFlight: Promise<void> | null = null;

function currentScreenRect(): ScreenRect {
  return {
    left: 0,
    top: 0,
    width: window.screen.availWidth,
    height: window.screen.availHeight,
  };
}

/**
 * Lazily resolve the right-side monitor (if any) and cache the target rect.
 * Safe to call multiple times — only the first call does work.
 * Triggers the multi-screen permission prompt at most once.
 */
export function ensureScreenDetails(): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  if (cachedTarget) return Promise.resolve();
  if (resolveInFlight) return resolveInFlight;

  resolveInFlight = (async () => {
    // Default fallback: current screen, full size.
    cachedTarget = currentScreenRect();

    try {
      // @ts-expect-error — Window Management API (experimental)
      if (window.getScreenDetails) {
        // @ts-expect-error
        const details = await window.getScreenDetails();
        const current = details.currentScreen;
        const right = details.screens.find(
          (s: any) => s.left >= current.left + current.width,
        );
        if (right) {
          cachedTarget = {
            left: right.availLeft,
            top: right.availTop,
            width: right.availWidth,
            height: right.availHeight,
          };
        }
      }
    } catch {
      /* keep current-screen fallback */
    }
  })();

  return resolveInFlight;
}

/**
 * Open Window B at the cached target rect (right monitor if available,
 * otherwise current screen full size). Fully synchronous so the popup stays
 * attached to the user gesture — no permission prompt, no scroll jump.
 */
export function openDetailWindow(projectId: string): Window | null {
  if (typeof window === "undefined") return null;

  const url = `/detail?id=${encodeURIComponent(projectId)}`;
  const target = cachedTarget ?? currentScreenRect();
  const features = `left=${target.left},top=${target.top},width=${target.width},height=${target.height},menubar=no,toolbar=no,location=no,status=no`;
  const win = window.open(url, "WindowB_Detail", features);

  // Best-effort reposition for browsers that ignore left/top in features.
  if (win && cachedTarget) {
    try {
      win.moveTo(cachedTarget.left, cachedTarget.top);
      win.resizeTo(cachedTarget.width, cachedTarget.height);
    } catch {
      /* ignore */
    }
  }

  // Kick off resolution for NEXT click if we haven't yet.
  if (!cachedTarget) void ensureScreenDetails();

  return win;
}

/**
 * Convenience: open Window B for a project AND broadcast OPEN_PROJECT
 * so an already-open Window B can simply switch project (no duplicate window).
 * Reads the latest project snapshot from localStorage so listeners get fresh data.
 */
export function openProjectWindow(projectId: string): void {
  if (typeof window === "undefined") return;
  let project: Project | undefined;
  try {
    const raw = localStorage.getItem("design-projects-store");
    if (raw) {
      const parsed = JSON.parse(raw) as Project[];
      project = parsed.find((p) => p.id === projectId);
    }
  } catch {
    /* ignore */
  }
  const ch = getSyncChannel();
  ch?.postMessage({ type: "OPEN_PROJECT", projectId, project });
  ch?.close();
  openDetailWindow(projectId);
  if (!cachedTarget) void ensureScreenDetails();
}
