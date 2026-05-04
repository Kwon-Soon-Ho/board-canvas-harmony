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

  // Default: maximize on current screen
  let left = 0;
  let top = 0;
  let width = window.screen.availWidth;
  let height = window.screen.availHeight;

  // CRITICAL: open the window FIRST, synchronously inside the user gesture.
  // Awaiting getScreenDetails() before window.open() detaches it from the
  // gesture, triggers a permission prompt, and on prompt-close the browser
  // restores focus to the clicked element via scrollIntoView — which causes
  // the page to jump to the bottom or to the next card row.
  const features = `left=${left},top=${top},width=${width},height=${height},menubar=no,toolbar=no,location=no,status=no`;
  const win = window.open(url, "WindowB_Detail", features);

  // Best-effort multi-screen positioning AFTER the window is open.
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
        if (win) {
          try {
            win.moveTo(left, top);
            win.resizeTo(width, height);
          } catch {
            /* ignore */
          }
        }
      }
    }
  } catch {
    /* fall back to current-screen maximize */
  }

  return win;
}
