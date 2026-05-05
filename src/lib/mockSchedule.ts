import { ALL_MEMBERS, TEAM_DATA, type Department } from "./mockProjects";

// ─── Types ────────────────────────────────────────────────────────────
export type LeaveType = "연차" | "시차";

export interface Leave {
  id: string;
  member_name: string;
  department: Department;
  leave_type: LeaveType;
  leave_date: string; // YYYY-MM-DD
  start_time?: string | null; // "HH:MM" — only when leave_type === "시차"
  end_time?: string | null;
  reason?: string | null;
}

export interface Holiday {
  date: string; // YYYY-MM-DD
  name: string;
}

// ─── Korean holidays (2026) ───────────────────────────────────────────
export const KR_HOLIDAYS: Holiday[] = [
  { date: "2026-01-01", name: "신정" },
  { date: "2026-02-16", name: "설날 연휴" },
  { date: "2026-02-17", name: "설날" },
  { date: "2026-02-18", name: "설날 연휴" },
  { date: "2026-03-01", name: "삼일절" },
  { date: "2026-05-05", name: "어린이날" },
  { date: "2026-05-24", name: "부처님오신날" },
  { date: "2026-06-06", name: "현충일" },
  { date: "2026-08-15", name: "광복절" },
  { date: "2026-09-24", name: "추석 연휴" },
  { date: "2026-09-25", name: "추석" },
  { date: "2026-09-26", name: "추석 연휴" },
  { date: "2026-10-03", name: "개천절" },
  { date: "2026-10-09", name: "한글날" },
  { date: "2026-12-25", name: "성탄절" },
];

// ─── Time slots (06:00 ~ 22:00, 30-min step) ──────────────────────────
export const TIME_SLOTS: string[] = (() => {
  const out: string[] = [];
  for (let h = 6; h <= 22; h++) {
    out.push(`${String(h).padStart(2, "0")}:00`);
    if (h < 22) out.push(`${String(h).padStart(2, "0")}:30`);
  }
  return out;
})();

// ─── Member → department lookup ───────────────────────────────────────
export const MEMBER_DEPT: Record<string, Department> = (() => {
  const map: Record<string, Department> = {};
  (Object.keys(TEAM_DATA) as Department[]).forEach((dept) => {
    TEAM_DATA[dept].forEach((m) => {
      map[m.name] = dept;
    });
  });
  return map;
})();

// ─── Seeded mock leaves (used only as a one-time backfill if DB empty) ─
function pad(n: number) {
  return String(n).padStart(2, "0");
}
function ymd(d: Date) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function buildSeedLeaves(): Omit<Leave, "id">[] {
  const today = new Date();
  const seeds: Omit<Leave, "id">[] = [];

  ALL_MEMBERS.forEach((m, idx) => {
    for (let k = 0; k < 2; k++) {
      const offset = ((idx * 7 + k * 19) % 55) + 3;
      const d = new Date(today);
      d.setDate(d.getDate() + offset);
      if (d.getDay() === 0) d.setDate(d.getDate() + 1);
      if (d.getDay() === 6) d.setDate(d.getDate() + 2);
      // every 3rd entry is 시차 for variety
      const isShift = (idx + k) % 3 === 0;
      seeds.push({
        member_name: m.name,
        department: MEMBER_DEPT[m.name],
        leave_type: isShift ? "시차" : "연차",
        leave_date: ymd(d),
        start_time: isShift ? "10:00" : null,
        end_time: isShift ? "19:00" : null,
        reason: null,
      });
    }
  });
  return seeds;
}

// ─── Date helpers ─────────────────────────────────────────────────────
export function startOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}
export function endOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0);
}
export function buildMonthGrid(monthAnchor: Date): Date[] {
  const first = startOfMonth(monthAnchor);
  const startWeekday = first.getDay();
  const start = new Date(first);
  start.setDate(start.getDate() - startWeekday);
  const days: Date[] = [];
  for (let i = 0; i < 42; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    days.push(d);
  }
  return days;
}
export function dayKey(d: Date) {
  return ymd(d);
}
export function dDay(targetIso: string, fromIso?: string): number {
  const today = fromIso ? new Date(fromIso) : new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(targetIso);
  target.setHours(0, 0, 0, 0);
  return Math.round((target.getTime() - today.getTime()) / 86400000);
}
