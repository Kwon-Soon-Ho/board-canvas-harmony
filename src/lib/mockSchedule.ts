import { ALL_MEMBERS, TEAM_DATA, type Department } from "./mockProjects";

// ─── Types ────────────────────────────────────────────────────────────
export type LeaveType = "전일" | "오전반차" | "오후반차" | "병가";

export interface Leave {
  id: string;
  member_name: string;
  department: Department;
  leave_type: LeaveType;
  leave_date: string; // YYYY-MM-DD
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
  const types: LeaveType[] = ["전일", "오전반차", "오후반차", "전일", "병가"];

  // For each member, sprinkle 2 leaves across the next 60 days
  ALL_MEMBERS.forEach((m, idx) => {
    for (let k = 0; k < 2; k++) {
      const offset = ((idx * 7 + k * 19) % 55) + 3;
      const d = new Date(today);
      d.setDate(d.getDate() + offset);
      // Skip weekends
      if (d.getDay() === 0) d.setDate(d.getDate() + 1);
      if (d.getDay() === 6) d.setDate(d.getDate() + 2);
      seeds.push({
        member_name: m.name,
        department: MEMBER_DEPT[m.name],
        leave_type: types[(idx + k) % types.length],
        leave_date: ymd(d),
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
  // Sunday-start 6×7 grid
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
