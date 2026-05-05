import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, LineChart, Line,
} from "recharts";
import { Header } from "@/components/control/Header";
import { MOCK_PROJECTS, DEPT_COLOR, type Project } from "@/lib/mockProjects";
import { type Leave } from "@/lib/mockSchedule";
import { supabase } from "@/integrations/supabase/client";
import { getSyncChannel } from "@/lib/sync";
import {
  computeKpis,
  deptDistribution,
  statusDistribution,
  progressBuckets,
  monthlyCompleted,
  workloadByMember,
  deptAvgProgress,
  pmSummary,
  leaveHeatmap,
  shiftPatterns,
  recentResolvedIssues,
  issueStats,
} from "@/lib/insights";

export const Route = createFileRoute("/insights")({
  component: InsightsPage,
  ssr: false,
  head: () => ({
    meta: [
      { title: "인사이트 — Design Team" },
      { name: "description", content: "프로젝트·일정·팀 데이터를 한눈에 보는 운영 인사이트 대시보드." },
    ],
  }),
});

const STORAGE_KEY = "design-projects-store";
const STATUS_COLOR: Record<string, string> = {
  진행: "#147058",
  상시: "#3B82F6",
  대기: "#9CA3AF",
  완료: "#22C55E",
};

function InsightsPage() {
  const [projects, setProjects] = useState<Project[]>(MOCK_PROJECTS);
  const [leaves, setLeaves] = useState<Leave[]>([]);
  const [refreshTick, setRefreshTick] = useState(0);

  // Hydrate projects from localStorage (same source as other pages)
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Project[];
        if (Array.isArray(parsed) && parsed.length > 0) {
          const seedById = new Map(MOCK_PROJECTS.map((p) => [p.id, p]));
          for (const s of parsed) seedById.set(s.id, { ...seedById.get(s.id), ...s } as Project);
          setProjects(Array.from(seedById.values()));
        }
      }
    } catch { /* ignore */ }
  }, [refreshTick]);

  useEffect(() => {
    const ch = getSyncChannel();
    if (!ch) return;
    const handler = (e: MessageEvent) => {
      const t = e.data?.type;
      if (t === "PROJECT_UPDATE" || t === "MEMBER_UPDATE" || t === "MEMBER_RENAME") {
        setRefreshTick((x) => x + 1);
      }
    };
    ch.addEventListener?.("message", handler);
    if (!ch.addEventListener) (ch as any).onmessage = handler;
    return () => {
      ch.removeEventListener?.("message", handler);
      ch.close();
    };
  }, []);

  // Load leaves from Cloud
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data } = await supabase.from("leaves").select("*").order("leave_date");
      if (!cancelled && data) setLeaves(data as Leave[]);
    })();
    return () => { cancelled = true; };
  }, [refreshTick]);

  const kpis = useMemo(() => computeKpis(projects, leaves), [projects, leaves]);
  const deptDist = useMemo(() => deptDistribution(projects), [projects]);
  const statusDist = useMemo(() => statusDistribution(projects), [projects]);
  const buckets = useMemo(() => progressBuckets(projects), [projects]);
  const monthly = useMemo(() => monthlyCompleted(projects), [projects]);
  const workload = useMemo(() => workloadByMember(projects), [projects]);
  const deptAvg = useMemo(() => deptAvgProgress(projects), [projects]);
  const pms = useMemo(() => pmSummary(projects), [projects]);
  const heatmap = useMemo(() => leaveHeatmap(leaves), [leaves]);
  const shifts = useMemo(() => shiftPatterns(leaves), [leaves]);
  const recent = useMemo(() => recentResolvedIssues(projects), [projects]);
  const issueAgg = useMemo(() => issueStats(projects), [projects]);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Header />
      <main className="mx-auto max-w-[1920px] px-12 py-8 space-y-8">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">인사이트</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            지금까지 진행한 업무를 회고하고 운영 패턴을 발견하세요.
          </p>
        </div>

        {/* ── 1. KPI Strip ── */}
        <section className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-8">
          <Kpi label="진행 중" value={kpis.inProgress} accent="#147058" />
          <Kpi label="완료" value={kpis.done} accent="#22C55E" />
          <Kpi label="대기" value={kpis.pending} accent="#9CA3AF" />
          <Kpi label="상시" value={kpis.ongoing} accent="#3B82F6" />
          <Kpi label="열린 이슈" value={kpis.openIssues} accent="#F97316" />
          <Kpi label="이번 달 해결" value={kpis.resolvedThisMonth} accent="#22C55E" />
          <Kpi label="이번 달 휴가" value={kpis.leavesThisMonth} accent="#EC4899" />
          <Kpi label="평균 진행률" value={`${kpis.avgProgress}%`} accent="#FFFFFF" />
        </section>

        {/* ── 2. Project Analysis ── */}
        <section className="grid grid-cols-1 gap-4 lg:grid-cols-2 xl:grid-cols-4">
          <Card title="부서별 프로젝트 분포">
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={deptDist} dataKey="value" nameKey="name" innerRadius={50} outerRadius={80} paddingAngle={2}>
                  {deptDist.map((d) => (
                    <Cell key={d.name} fill={DEPT_COLOR[d.name]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={tooltipStyle} />
              </PieChart>
            </ResponsiveContainer>
            <Legend items={deptDist.map((d) => ({ label: `${d.name} ${d.value}`, color: DEPT_COLOR[d.name] }))} />
          </Card>

          <Card title="상태별 분포">
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={statusDist}>
                <CartesianGrid stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="name" stroke="#9CA3AF" />
                <YAxis stroke="#9CA3AF" allowDecimals={false} />
                <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "rgba(255,255,255,0.04)" }} />
                <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                  {statusDist.map((s) => (
                    <Cell key={s.name} fill={STATUS_COLOR[s.name]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </Card>

          <Card title="월별 완료 추이 (최근 6개월)">
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={monthly}>
                <CartesianGrid stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="month" stroke="#9CA3AF" />
                <YAxis stroke="#9CA3AF" allowDecimals={false} />
                <Tooltip contentStyle={tooltipStyle} />
                <Line type="monotone" dataKey="value" stroke="#22C55E" strokeWidth={2} dot={{ fill: "#22C55E" }} />
              </LineChart>
            </ResponsiveContainer>
          </Card>

          <Card title="진행률 구간 분포">
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={buckets}>
                <CartesianGrid stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="range" stroke="#9CA3AF" />
                <YAxis stroke="#9CA3AF" allowDecimals={false} />
                <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "rgba(255,255,255,0.04)" }} />
                <Bar dataKey="value" fill="#147058" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </section>

        {/* ── 3. Workload ── */}
        <section className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <Card title="담당자별 활성 태스크 TOP 10" className="lg:col-span-2">
            {workload.length === 0 ? (
              <Empty>활성 태스크가 없습니다.</Empty>
            ) : (
              <ResponsiveContainer width="100%" height={Math.max(220, workload.length * 32)}>
                <BarChart data={workload} layout="vertical" margin={{ left: 60 }}>
                  <CartesianGrid stroke="rgba(255,255,255,0.05)" />
                  <XAxis type="number" stroke="#9CA3AF" allowDecimals={false} />
                  <YAxis type="category" dataKey="name" stroke="#9CA3AF" width={70} />
                  <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "rgba(255,255,255,0.04)" }} />
                  <Bar dataKey="value" fill="#3B82F6" radius={[0, 6, 6, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </Card>

          <Card title="부서별 평균 진행률">
            <div className="space-y-4 pt-2">
              {deptAvg.map((d) => (
                <div key={d.name}>
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium" style={{ color: DEPT_COLOR[d.name] }}>{d.name}</span>
                    <span className="text-muted-foreground">{d.value}%</span>
                  </div>
                  <div className="mt-1.5 h-2 rounded-full bg-white/5 overflow-hidden">
                    <div
                      className="h-full rounded-full"
                      style={{ width: `${d.value}%`, backgroundColor: DEPT_COLOR[d.name] }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </section>

        <section>
          <Card title="PM별 담당 프로젝트">
            {pms.length === 0 ? (
              <Empty>PM 데이터가 없습니다.</Empty>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="text-left text-muted-foreground">
                    <tr className="border-b border-white/10">
                      <th className="py-2 pr-4 font-medium">PM</th>
                      <th className="py-2 pr-4 font-medium">담당 프로젝트</th>
                      <th className="py-2 pr-4 font-medium">평균 진행률</th>
                      <th className="py-2 font-medium">진행률 바</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pms.map((row) => (
                      <tr key={row.pm} className="border-b border-white/5">
                        <td className="py-2 pr-4 font-medium">{row.pm}</td>
                        <td className="py-2 pr-4">{row.count}개</td>
                        <td className="py-2 pr-4">{row.avg}%</td>
                        <td className="py-2">
                          <div className="h-2 w-48 rounded-full bg-white/5 overflow-hidden">
                            <div className="h-full rounded-full bg-[#147058]" style={{ width: `${row.avg}%` }} />
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </section>

        {/* ── 4. Schedule / Issue Retro ── */}
        <section className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <Card title="월별 연차 사용 히트맵 (최근 6개월)">
            {heatmap.length === 0 ? (
              <Empty>연차 기록이 없습니다.</Empty>
            ) : (
              <Heatmap rows={heatmap} />
            )}
          </Card>

          <Card title="시차 신청 패턴">
            <div className="space-y-4">
              <div>
                <div className="mb-2 text-xs text-muted-foreground">요일별</div>
                <ResponsiveContainer width="100%" height={120}>
                  <BarChart data={shifts.byWeekday}>
                    <XAxis dataKey="day" stroke="#9CA3AF" />
                    <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "rgba(255,255,255,0.04)" }} />
                    <Bar dataKey="value" fill="#EC4899" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div>
                <div className="mb-2 text-xs text-muted-foreground">시작 시간대별</div>
                {shifts.byHour.length === 0 ? (
                  <Empty>시차 기록이 없습니다.</Empty>
                ) : (
                  <ResponsiveContainer width="100%" height={120}>
                    <BarChart data={shifts.byHour}>
                      <XAxis dataKey="hour" stroke="#9CA3AF" />
                      <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "rgba(255,255,255,0.04)" }} />
                      <Bar dataKey="value" fill="#3B82F6" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>
          </Card>
        </section>

        <section className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <Card title="이슈 처리 현황">
            <div className="grid grid-cols-3 gap-3 pt-2">
              <Stat label="Open" value={issueAgg.open} color="#F97316" />
              <Stat label="Resolved" value={issueAgg.resolved} color="#22C55E" />
              <Stat label="평균 미해결" value={`${issueAgg.avgOpenDays}일`} color="#FFFFFF" />
            </div>
          </Card>
          <Card title="최근 해결된 이슈" className="lg:col-span-2">
            {recent.length === 0 ? (
              <Empty>해결된 이슈가 없습니다.</Empty>
            ) : (
              <ul className="divide-y divide-white/5">
                {recent.map((r, i) => (
                  <li key={i} className="flex items-center justify-between gap-4 py-2 text-sm">
                    <div className="min-w-0 flex-1">
                      <div className="truncate font-medium">{r.title}</div>
                      <div className="truncate text-xs text-muted-foreground">
                        {r.project} · {r.assignee}
                      </div>
                    </div>
                    <div className="shrink-0 text-xs text-muted-foreground">
                      {r.timestamp.slice(0, 10)}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </section>
      </main>
    </div>
  );
}

const tooltipStyle = {
  background: "#0A0A0A",
  border: "1px solid rgba(255,255,255,0.1)",
  borderRadius: 8,
  fontSize: 12,
};

function Card({ title, children, className = "" }: { title: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={`rounded-xl border border-white/10 bg-card p-5 ${className}`}>
      <h3 className="mb-3 text-sm font-semibold text-foreground/90">{title}</h3>
      {children}
    </div>
  );
}

function Kpi({ label, value, accent }: { label: string; value: number | string; accent: string }) {
  return (
    <div className="rounded-xl border border-white/10 bg-card p-4">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="mt-1 text-2xl font-bold tracking-tight" style={{ color: accent }}>{value}</div>
    </div>
  );
}

function Stat({ label, value, color }: { label: string; value: number | string; color: string }) {
  return (
    <div className="rounded-lg border border-white/10 bg-white/[0.02] p-3 text-center">
      <div className="text-2xl font-bold" style={{ color }}>{value}</div>
      <div className="mt-1 text-xs text-muted-foreground">{label}</div>
    </div>
  );
}

function Legend({ items }: { items: { label: string; color: string }[] }) {
  return (
    <div className="mt-3 flex flex-wrap items-center justify-center gap-3 text-xs text-muted-foreground">
      {items.map((it) => (
        <span key={it.label} className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full" style={{ background: it.color }} />
          {it.label}
        </span>
      ))}
    </div>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return <div className="py-10 text-center text-sm text-muted-foreground">{children}</div>;
}

function Heatmap({ rows }: { rows: { member: string; months: number[] }[] }) {
  const now = new Date();
  const labels: string[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    labels.push(`${d.getMonth() + 1}월`);
  }
  const max = Math.max(1, ...rows.flatMap((r) => r.months));
  const colorFor = (n: number) => {
    if (!n) return "rgba(255,255,255,0.04)";
    const a = 0.15 + (n / max) * 0.7;
    return `rgba(236, 72, 153, ${a.toFixed(2)})`;
  };
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs">
        <thead className="text-muted-foreground">
          <tr>
            <th className="sticky left-0 bg-card py-1 pr-3 text-left font-medium">팀원</th>
            {labels.map((l) => (
              <th key={l} className="px-2 py-1 text-center font-medium">{l}</th>
            ))}
            <th className="px-2 py-1 text-center font-medium">합계</th>
          </tr>
        </thead>
        <tbody>
          {rows.slice(0, 12).map((r) => {
            const total = r.months.reduce((s, n) => s + n, 0);
            return (
              <tr key={r.member}>
                <td className="sticky left-0 bg-card py-1 pr-3 font-medium">{r.member}</td>
                {r.months.map((n, i) => (
                  <td key={i} className="px-1 py-1">
                    <div
                      className="mx-auto flex h-7 w-10 items-center justify-center rounded text-[11px] text-foreground/80"
                      style={{ background: colorFor(n) }}
                    >
                      {n || ""}
                    </div>
                  </td>
                ))}
                <td className="px-2 py-1 text-center font-semibold">{total}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
