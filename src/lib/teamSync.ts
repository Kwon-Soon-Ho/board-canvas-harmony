// Team member CRUD + cross-page sync helpers.
// All edits flow through here so projects (localStorage) and leaves (Supabase)
// stay in lockstep with team_members rows.

import { supabase } from "@/integrations/supabase/client";
import { getSyncChannel } from "@/lib/sync";
import { TEAM_DATA, type Department, type Project } from "@/lib/mockProjects";

export interface TeamMemberRow {
  id: string;
  name: string;
  original_name: string;
  rank: string;
  department: string;
  phone: string | null;
  email: string | null;
}

const STORAGE_KEY = "design-projects-store";

/* ─────────────────────────────────────────────────────────────────
 * Phone formatter — accepts digits / mixed input, outputs 010-1234-5678 style.
 * Falls back to trimmed input if the digit count doesn't match common patterns.
 * ───────────────────────────────────────────────────────────────── */
export function formatPhone(input: string): string {
  const digits = (input ?? "").replace(/\D/g, "");
  if (!digits) return "";
  if (digits.length === 11) return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`;
  if (digits.length === 10) {
    if (digits.startsWith("02")) return `${digits.slice(0, 2)}-${digits.slice(2, 6)}-${digits.slice(6)}`;
    return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`;
  }
  if (digits.length === 9 && digits.startsWith("02")) {
    return `${digits.slice(0, 2)}-${digits.slice(2, 5)}-${digits.slice(5)}`;
  }
  return input.trim();
}

/* ─────────────────────────────────────────────────────────────────
 * Seed team_members from TEAM_DATA on first load (idempotent).
 * Returns the freshly loaded rows.
 * ───────────────────────────────────────────────────────────────── */
export async function loadOrSeedTeamMembers(): Promise<TeamMemberRow[]> {
  const { data, error } = await supabase.from("team_members").select("*");
  if (error) {
    console.warn("[teamSync] load failed", error.message);
    return [];
  }
  if (data && data.length > 0) return data as TeamMemberRow[];

  // Seed from static TEAM_DATA. Use deterministic phones so visuals are stable.
  const seeds = (Object.keys(TEAM_DATA) as Department[]).flatMap((dept) =>
    TEAM_DATA[dept].map((m) => ({
      name: m.name,
      original_name: m.name,
      rank: m.rank,
      department: dept,
      phone: "000-0000-0000",
      email: null,
    })),
  );
  const { error: insErr } = await supabase.from("team_members").insert(seeds);
  if (insErr) console.warn("[teamSync] seed failed", insErr.message);
  const { data: data2 } = await supabase.from("team_members").select("*");
  return (data2 ?? []) as TeamMemberRow[];
}

/* ─────────────────────────────────────────────────────────────────
 * Update non-identity fields (rank, department, phone, email).
 * For these, no cross-table renames are needed.
 * ───────────────────────────────────────────────────────────────── */
export async function updateMemberFields(
  id: string,
  patch: Partial<Pick<TeamMemberRow, "rank" | "department" | "phone" | "email">>,
): Promise<{ error?: string }> {
  const cleaned = {
    ...patch,
    phone: patch.phone !== undefined ? formatPhone(patch.phone) : undefined,
    email: patch.email !== undefined ? (patch.email?.trim() || null) : undefined,
  };
  const { data, error } = await supabase
    .from("team_members")
    .update(cleaned)
    .eq("id", id)
    .select()
    .single();
  if (error) return { error: error.message };

  const ch = getSyncChannel();
  ch?.postMessage({ type: "MEMBER_UPDATE", name: (data as TeamMemberRow).name });
  ch?.close();
  return {};
}

/* ─────────────────────────────────────────────────────────────────
 * Rename a member. Updates team_members + leaves (DB) and the
 * localStorage projects store (pm / members / task assignees / issue assignees).
 * Broadcasts PROJECT_UPDATE per affected project plus a MEMBER_RENAME event.
 * ───────────────────────────────────────────────────────────────── */
export async function renameMember(
  id: string,
  oldName: string,
  newNameRaw: string,
): Promise<{ error?: string }> {
  const newName = newNameRaw.trim();
  if (!newName) return { error: "이름을 입력해주세요." };
  if (newName === oldName) return {};

  // Pre-check duplicate
  const { data: dup } = await supabase
    .from("team_members")
    .select("id")
    .eq("name", newName)
    .maybeSingle();
  if (dup && dup.id !== id) return { error: "이미 사용 중인 이름입니다." };

  // 1) team_members
  const { error: tmErr } = await supabase
    .from("team_members")
    .update({ name: newName })
    .eq("id", id);
  if (tmErr) return { error: tmErr.message };

  // 2) leaves
  const { error: lvErr } = await supabase
    .from("leaves")
    .update({ member_name: newName })
    .eq("member_name", oldName);
  if (lvErr) console.warn("[teamSync] leaves rename failed", lvErr.message);

  // 3) localStorage projects
  const updatedProjectIds: string[] = [];
  let updatedProjects: Project[] = [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Project[];
      const next = parsed.map((p) => {
        let touched = false;
        const np: Project = { ...p };
        if (p.pm === oldName) { np.pm = newName; touched = true; }
        if (p.members.includes(oldName)) {
          np.members = p.members.map((m) => (m === oldName ? newName : m));
          touched = true;
        }
        if (p.tasks?.some((t) => t.assignee === oldName)) {
          np.tasks = p.tasks.map((t) => (t.assignee === oldName ? { ...t, assignee: newName } : t));
          touched = true;
        }
        if (p.issues?.some((i) => i.assignee === oldName)) {
          np.issues = p.issues.map((i) => (i.assignee === oldName ? { ...i, assignee: newName } : i));
          touched = true;
        }
        if (touched) updatedProjectIds.push(p.id);
        return touched ? np : p;
      });
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      updatedProjects = next.filter((p) => updatedProjectIds.includes(p.id));
    }
  } catch (e) {
    console.warn("[teamSync] projects rename failed", e);
  }

  // 4) broadcast
  const ch = getSyncChannel();
  ch?.postMessage({ type: "MEMBER_RENAME", oldName, newName });
  updatedProjects.forEach((project) => {
    ch?.postMessage({ type: "PROJECT_UPDATE", project });
  });
  ch?.close();

  return {};
}

/* ─────────────────────────────────────────────────────────────────
 * Apply MEMBER_RENAME to an in-memory projects array — used by
 * routes/index.tsx and routes/schedule.tsx sync handlers.
 * ───────────────────────────────────────────────────────────────── */
export function applyRenameToProjects(
  projects: Project[],
  oldName: string,
  newName: string,
): Project[] {
  return projects.map((p) => {
    let touched = false;
    const np: Project = { ...p };
    if (p.pm === oldName) { np.pm = newName; touched = true; }
    if (p.members.includes(oldName)) {
      np.members = p.members.map((m) => (m === oldName ? newName : m));
      touched = true;
    }
    if (p.tasks?.some((t) => t.assignee === oldName)) {
      np.tasks = p.tasks.map((t) => (t.assignee === oldName ? { ...t, assignee: newName } : t));
      touched = true;
    }
    if (p.issues?.some((i) => i.assignee === oldName)) {
      np.issues = p.issues.map((i) => (i.assignee === oldName ? { ...i, assignee: newName } : i));
      touched = true;
    }
    return touched ? np : p;
  });
}
