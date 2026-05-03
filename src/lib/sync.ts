// BroadcastChannel for 0ms sync between Window A (control) and Window B (detail).
import type { Project } from "./mockProjects";

export type SyncMessage =
  | { type: "OPEN_PROJECT"; projectId: string; project?: Project }
  | { type: "CLOSE_PROJECT"; projectId: string }
  | { type: "REQUEST_PROJECT" }
  | { type: "FILTER_CHANGE"; payload: unknown }
  | { type: "PING" }
  | { type: "PONG" }
  | { type: "PROJECT_UPDATE"; project: Project };

export const SYNC_CHANNEL = "design-sync";

export function getSyncChannel(): BroadcastChannel | null {
  if (typeof window === "undefined" || typeof BroadcastChannel === "undefined") {
    return null;
  }
  return new BroadcastChannel(SYNC_CHANNEL);
}

/**
 * Open Window B targeting the right-side monitor when available.
 * Falls back to fullscreen on the current screen.
 */
export async function openDetailWindow(projectId: string): Promise<Window | null> {
  if (typeof window === "undefined") return null;

  const url = `/detail?id=${encodeURIComponent(projectId)}`;

  // Default: maximize on current screen using availWidth/availHeight
  let left = 0;
  let top = 0;
  let width = window.screen.availWidth;
  let height = window.screen.availHeight;

  // Try multi-screen API (Chrome 100+) to find a monitor to the right.
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
        left = right.availLeft;
        top = right.availTop;
        width = right.availWidth;
        height = right.availHeight;
      }
    }
  } catch {
    /* fall back to current-screen maximize */
  }

  const features = `left=${left},top=${top},width=${width},height=${height},menubar=no,toolbar=no,location=no,status=no`;
  // Fixed target name => same Window B is reused for every project click.
  const win = window.open(url, "WindowB_Detail", features);

  if (win) {
    try {
      win.moveTo(left, top);
      win.resizeTo(width, height);
    } catch {
      /* ignore */
    }
  }
  return win;
}
