import type { Project, Department, Status } from "@/lib/mockProjects";
import type { Leave } from "@/lib/mockSchedule";

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

export function monthlyCompleted(projects: Project[]): { month: string; value: number }[] {
  const now = new Date();
  const months: { ym: string; label: string }[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push({ ym: ymKey(d), label: `${d.getMonth() + 1}월` });
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

export function pmSummary(projects: Project[]): { pm: string; count: number; avg: number }[] {
  const map: Record<string, { count: number; sum: number }> = {};
  for (const p of projects) {
    if (!p.pm) continue;
    const m = (map[p.pm] ??= { count: 0, sum: 0 });
    m.count++;
    m.sum += p.progress ?? 0;
  }
  return Object.entries(map)
    .map(([pm, v]) => ({ pm, count: v.count, avg: Math.round(v.sum / v.count) }))
    .sort((a, b) => b.count - a.count);
}

export function leaveHeatmap(leaves: Leave[]): { member: string; months: number[] }[] {
  const now = new Date();
  const monthKeys: string[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    monthKeys.push(ymKey(d));
  }
  const map: Record<string, number[]> = {};
  for (const l of leaves) {
    if (l.leave_type !== "연차") continue;
    const idx = monthKeys.indexOf(l.leave_date.slice(0, 7));
    if (idx < 0) continue;
    if (!map[l.member_name]) map[l.member_name] = Array(6).fill(0);
    map[l.member_name][idx]++;
  }
  return Object.entries(map)
    .map(([member, months]) => ({ member, months }))
    .sort((a, b) => b.months.reduce((s, n) => s + n, 0) - a.months.reduce((s, n) => s + n, 0));
}

export function shiftPatterns(leaves: Leave[]): {
  byWeekday: { day: string; value: number }[];
  byHour: { hour: string; value: number }[];
} {
  const days = ["일", "월", "화", "수", "목", "금", "토"];
  const dayCounts = Array(7).fill(0);
  const hourCounts: Record<string, number> = {};
  for (const l of leaves) {
    if (l.leave_type !== "시차") continue;
    const d = new Date(l.leave_date);
    if (!isNaN(d.getTime())) dayCounts[d.getDay()]++;
    if (l.start_time) {
      const h = l.start_time.slice(0, 2) + "시";
      hourCounts[h] = (hourCounts[h] ?? 0) + 1;
    }
  }
  return {
    byWeekday: days.map((d, i) => ({ day: d, value: dayCounts[i] })),
    byHour: Object.entries(hourCounts)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([hour, value]) => ({ hour, value })),
  };
}

export function recentResolvedIssues(projects: Project[], limit = 10) {
  const items: { project: string; title: string; assignee: string; timestamp: string }[] = [];
  for (const p of projects) {
    for (const i of p.issues ?? []) {
      if (i.resolved && i.timestamp) {
        items.push({ project: p.title, title: i.title, assignee: i.assignee, timestamp: i.timestamp });
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
