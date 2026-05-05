import type { Project, Department, Status } from "@/lib/mockProjects";
import type { Leave } from "@/lib/mockSchedule";

export interface DateRange { start: Date; end: Date }

export interface Kpis {
  inProgress: number;
  done: number;
  pending: number;
  ongoing: number;
  openIssues: number;
  resolvedThisMonth: number;
  leavesThisMonth: number;
  shiftsThisMonth: number;
  avgProgress: number;
  totalProjects: number;
}

const ymKey = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
const inRange = (iso: string | undefined, r: DateRange) => {
  if (!iso) return false;
  const t = new Date(iso).getTime();
  return !isNaN(t) && t >= r.start.getTime() && t <= r.end.getTime();
};

/** Project intersects range if its [start, deadline] overlaps, or it is 상시. */
export function projectsInRange(projects: Project[], range: DateRange): Project[] {
  return projects.filter((p) => {
    if (p.status === "상시") return true;
    if (p.status === "대기") return true;
    const s = p.startDate ? new Date(p.startDate) : null;
    const e = p.deadline && p.deadline !== "상시" ? new Date(p.deadline) : null;
    if (!s && !e) return false;
    const st = (s ?? e!).getTime();
    const en = (e ?? s!).getTime();
    return en >= range.start.getTime() && st <= range.end.getTime();
  });
}

export function leavesInRange(leaves: Leave[], range: DateRange): Leave[] {
  return leaves.filter((l) => inRange(l.leave_date, range));
}

export function computeKpis(projects: Project[], leaves: Leave[]): Kpis {
  const now = new Date();
  const thisYm = ymKey(now);

  let inProgress = 0, done = 0, pending = 0, ongoing = 0;
  let openIssues = 0, resolvedThisMonth = 0;
  let progressSum = 0, progressCount = 0;

  for (const p of projects) {
    if (p.status === "진행") inProgress++;
    else if (p.status === "완료") done++;
    else if (p.status === "대기") pending++;
    else if (p.status === "상시") ongoing++;
    if (p.status !== "대기") {
      progressSum += p.progress ?? 0;
      progressCount++;
    }
    for (const i of p.issues ?? []) {
      if (!i.resolved) openIssues++;
      else if (i.timestamp && i.timestamp.slice(0, 7) === thisYm) resolvedThisMonth++;
    }
  }

  let leavesThisMonth = 0, shiftsThisMonth = 0;
  for (const l of leaves) {
    if (l.leave_date.slice(0, 7) !== thisYm) continue;
    if (l.leave_type === "연차") leavesThisMonth++;
    else if (l.leave_type === "시차") shiftsThisMonth++;
  }

  return {
    inProgress, done, pending, ongoing,
    openIssues, resolvedThisMonth,
    leavesThisMonth, shiftsThisMonth,
    avgProgress: progressCount ? Math.round(progressSum / progressCount) : 0,
    totalProjects: projects.length,
  };
}

export function deptDistribution(projects: Project[]): { name: Department; value: number }[] {
  const map: Record<string, number> = { 영상: 0, 편집: 0, UX: 0, 공통: 0 };
  for (const p of projects) map[p.department] = (map[p.department] ?? 0) + 1;
  return (Object.keys(map) as Department[]).map((name) => ({ name, value: map[name] }));
}

export function statusDistribution(projects: Project[]): { name: Status; value: number }[] {
  const order: Status[] = ["진행", "상시", "대기", "완료"];
  const map: Record<string, number> = { 진행: 0, 상시: 0, 대기: 0, 완료: 0 };
  for (const p of projects) map[p.status] = (map[p.status] ?? 0) + 1;
  return order.map((name) => ({ name, value: map[name] }));
}

export function progressBuckets(projects: Project[]): { range: string; value: number }[] {
  const buckets = [0, 0, 0, 0];
  for (const p of projects) {
    if (p.status === "대기") continue;
    const v = p.progress ?? 0;
    if (v < 25) buckets[0]++;
    else if (v < 50) buckets[1]++;
    else if (v < 75) buckets[2]++;
    else buckets[3]++;
  }
  return [
    { range: "0–25%", value: buckets[0] },
    { range: "25–50%", value: buckets[1] },
    { range: "50–75%", value: buckets[2] },
    { range: "75–100%", value: buckets[3] },
  ];
}

/** Monthly completion within range (months derived from range, max 12). */
export function monthlyCompleted(projects: Project[], range: DateRange): { month: string; value: number }[] {
  const months: { ym: string; label: string }[] = [];
  const cur = new Date(range.start.getFullYear(), range.start.getMonth(), 1);
  const end = new Date(range.end.getFullYear(), range.end.getMonth(), 1);
  while (cur.getTime() <= end.getTime()) {
    months.push({ ym: ymKey(cur), label: `${cur.getMonth() + 1}월` });
    cur.setMonth(cur.getMonth() + 1);
  }
  const counts: Record<string, number> = {};
  for (const p of projects) {
    if (p.status !== "완료") continue;
    const ref = p.updatedAt || p.deadline;
    if (!ref) continue;
    const ym = ref.slice(0, 7);
    counts[ym] = (counts[ym] ?? 0) + 1;
  }
  return months.map((m) => ({ month: m.label, value: counts[m.ym] ?? 0 }));
}

export function workloadByMember(projects: Project[]): { name: string; value: number }[] {
  const map: Record<string, number> = {};
  for (const p of projects) {
    if (p.status === "완료" || p.status === "대기") continue;
    for (const t of p.tasks ?? []) {
      if (t.status === "완료") continue;
      if (!t.assignee) continue;
      map[t.assignee] = (map[t.assignee] ?? 0) + 1;
    }
  }
  return Object.entries(map)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 10);
}

export function deptAvgProgress(projects: Project[]): { name: Department; value: number }[] {
  const sums: Record<string, { sum: number; n: number }> = {
    영상: { sum: 0, n: 0 }, 편집: { sum: 0, n: 0 }, UX: { sum: 0, n: 0 }, 공통: { sum: 0, n: 0 },
  };
  for (const p of projects) {
    if (p.status === "대기") continue;
    sums[p.department].sum += p.progress ?? 0;
    sums[p.department].n++;
  }
  return (Object.keys(sums) as Department[]).map((name) => ({
    name,
    value: sums[name].n ? Math.round(sums[name].sum / sums[name].n) : 0,
  }));
}

export function leaveHeatmap(leaves: Leave[], range: DateRange): { member: string; months: number[]; labels: string[] } {
  const months: { ym: string; label: string }[] = [];
  const cur = new Date(range.start.getFullYear(), range.start.getMonth(), 1);
  const end = new Date(range.end.getFullYear(), range.end.getMonth(), 1);
  while (cur.getTime() <= end.getTime()) {
    months.push({ ym: ymKey(cur), label: `${cur.getMonth() + 1}월` });
    cur.setMonth(cur.getMonth() + 1);
  }
  const labels = months.map((m) => m.label);
  const map: Record<string, number[]> = {};
  for (const l of leaves) {
    if (l.leave_type !== "연차") continue;
    const idx = months.findIndex((m) => m.ym === l.leave_date.slice(0, 7));
    if (idx < 0) continue;
    if (!map[l.member_name]) map[l.member_name] = Array(months.length).fill(0);
    map[l.member_name][idx]++;
  }
  const rows = Object.entries(map)
    .map(([member, m]) => ({ member, months: m, labels }))
    .sort((a, b) => b.months.reduce((s, n) => s + n, 0) - a.months.reduce((s, n) => s + n, 0));
  return rows as any;
}

export function recentResolvedIssues(projects: Project[], limit = 10) {
  const items: { projectId: string; project: string; issueId: string; title: string; assignee: string; timestamp: string }[] = [];
  for (const p of projects) {
    for (const i of p.issues ?? []) {
      if (i.resolved && i.timestamp) {
        items.push({
          projectId: p.id,
          project: p.title,
          issueId: i.id,
          title: i.title,
          assignee: i.assignee,
          timestamp: i.timestamp,
        });
      }
    }
  }
  return items.sort((a, b) => b.timestamp.localeCompare(a.timestamp)).slice(0, limit);
}

export function issueStats(projects: Project[]) {
  let open = 0, resolved = 0;
  let totalDays = 0, count = 0;
  for (const p of projects) {
    for (const i of p.issues ?? []) {
      if (i.resolved) resolved++;
      else {
        open++;
        if (i.startDate) {
          const d = new Date(i.startDate);
          if (!isNaN(d.getTime())) {
            totalDays += Math.max(0, Math.floor((Date.now() - d.getTime()) / 86400000));
            count++;
          }
        }
      }
    }
  }
  return { open, resolved, avgOpenDays: count ? Math.round(totalDays / count) : 0 };
}

// ── New: 마감 임박 ─────────────────────────────────────────────
export function deadlineUrgency(projects: Project[]): {
  buckets: { range: string; value: number }[];
  items: { id: string; title: string; department: Department; deadline: string; daysLeft: number }[];
} {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const items: { id: string; title: string; department: Department; deadline: string; daysLeft: number }[] = [];
  for (const p of projects) {
    if (p.status === "완료" || p.status === "대기" || p.status === "상시") continue;
    if (!p.deadline || p.deadline === "상시") continue;
    const d = new Date(p.deadline);
    if (isNaN(d.getTime())) continue;
    const days = Math.ceil((d.getTime() - today.getTime()) / 86400000);
    if (days < 0 || days > 30) continue;
    items.push({ id: p.id, title: p.title, department: p.department, deadline: p.deadline, daysLeft: days });
  }
  items.sort((a, b) => a.daysLeft - b.daysLeft);
  const buckets = [
    { range: "7일 이내", value: items.filter((i) => i.daysLeft <= 7).length },
    { range: "8–14일", value: items.filter((i) => i.daysLeft > 7 && i.daysLeft <= 14).length },
    { range: "15–30일", value: items.filter((i) => i.daysLeft > 14 && i.daysLeft <= 30).length },
  ];
  return { buckets, items: items.slice(0, 12) };
}

// ── New: 부서 × 상태 매트릭스 ──────────────────────────────────
export function deptStatusMatrix(projects: Project[]): { dept: Department; 진행: number; 상시: number; 대기: number; 완료: number }[] {
  const depts: Department[] = ["영상", "편집", "UX", "공통"];
  return depts.map((dept) => {
    const row = { dept, 진행: 0, 상시: 0, 대기: 0, 완료: 0 } as any;
    for (const p of projects) if (p.department === dept) row[p.status]++;
    return row;
  });
}
