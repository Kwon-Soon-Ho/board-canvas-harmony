import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getSyncChannel } from "@/lib/sync";
import { loadOrSeedTeamMembers, type TeamMemberRow } from "@/lib/teamSync";

/**
 * Live team_members data with cross-page broadcast sync.
 * Replaces static TEAM_DATA / ALL_MEMBERS / MEMBER_DEPT in feature components.
 */
export function useLiveTeam() {
  const [members, setMembers] = useState<TeamMemberRow[]>([]);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const rows = await loadOrSeedTeamMembers();
      if (!cancelled) setMembers(rows);
    })();
    return () => {
      cancelled = true;
    };
  }, [tick]);

  useEffect(() => {
    const ch = getSyncChannel();
    if (!ch) return;
    const handler = (e: MessageEvent) => {
      const m = e.data;
      if (m?.type === "MEMBER_UPDATE" || m?.type === "MEMBER_RENAME") {
        setTick((t) => t + 1);
      }
    };
    ch.addEventListener?.("message", handler);
    // Some BroadcastChannel polyfills only support onmessage
    if (!ch.addEventListener) (ch as any).onmessage = handler;
    return () => {
      ch.removeEventListener?.("message", handler);
      ch.close();
    };
  }, []);

  return members;
}

export type LiveDept = "공통" | "영상" | "편집" | "UX";
const DEPT_ORDER: LiveDept[] = ["공통", "영상", "편집", "UX"];

export function groupLiveByDept(members: TeamMemberRow[]) {
  const out: Record<string, TeamMemberRow[]> = {};
  for (const m of members) (out[m.department] ??= []).push(m);
  Object.keys(out).forEach((d) =>
    out[d].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0)),
  );
  return { byDept: out, order: DEPT_ORDER.filter((d) => out[d]?.length) };
}

export function deptOf(members: TeamMemberRow[], name: string): string {
  return members.find((m) => m.name === name)?.department ?? "공통";
}
export function rankOf(members: TeamMemberRow[], name: string): string {
  return members.find((m) => m.name === name)?.rank ?? "";
}
export function roleOf(members: TeamMemberRow[], name: string): string {
  return members.find((m) => m.name === name)?.role ?? "팀원";
}
