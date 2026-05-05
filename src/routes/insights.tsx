import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { z } from "zod";
import { fallback, zodValidator } from "@tanstack/zod-adapter";
import {
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, AreaChart, Area, Legend as RLegend,
} from "recharts";
import { Header } from "@/components/control/Header";
import { MOCK_PROJECTS, DEPT_COLOR, type Project, type Department } from "@/lib/mockProjects";
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
  leaveHeatmap,
  recentResolvedIssues,
  issueStats,
  projectsInRange,
  leavesInRange,
  deadlineUrgency,
  deptStatusMatrix,
} from "@/lib/insights";

const currentQuarter = () => (Math.floor(new Date().getMonth() / 3) + 1) as 1 | 2 | 3 | 4;
const searchSchema = z.object({
  y: fallback(z.number(), new Date().getFullYear()).default(new Date().getFullYear()),
  q: fallback(z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4), z.literal(0)]), currentQuarter()).default(currentQuarter()),
});

export const Route = createFileRoute("/insights")({
  validateSearch: zodValidator(searchSchema),
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
  진행: "#10B981",
  상시: "#3B82F6",
  대기: "#9CA3AF",
  완료: "#22C55E",
};

function InsightsPage() {
  const { y: year, q: quarter } = Route.useSearch();
  const navigate = Route.useNavigate();

  const [projects, setProjects] = useState<Project[]>(MOCK_PROJECTS);
  const [leaves, setLeaves] = useState<Leave[]>([]);
  const [refreshTick, setRefreshTick] = useState(0);

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
      if (t === "PROJECT_UPDATE" || t === "MEMBER_UPDATE" || t === "MEMBER_RENAME" || t === "LEAVE_UPDATE") {
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

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data } = await supabase.from("leaves").select("*").order("leave_date");
      if (!cancelled && data) setLeaves(data as Leave[]);
    })();
    return () => { cancelled = true; };
  }, [refreshTick]);

  // ── Range computation ───────────────────────────────────────────
  const range = useMemo(() => {
    if (quarter === 0) {
      return { start: new Date(year, 0, 1), end: new Date(year, 11, 31, 23, 59, 59) };
    }
    return {
      start: new Date(year, (quarter - 1) * 3, 1),
      end: new Date(year, quarter * 3, 0, 23, 59, 59),
    };
  }, [year, quarter]);

  const yearHasData = useMemo(() => {
    return projects.some((p) => {
      const ref = p.deadline && p.deadline !== "상시" ? p.deadline : (p.startDate ?? "");
      if (!ref) return false;
      return new Date(ref).getFullYear() === year;
    });
  }, [projects, year]);

  const filteredProjects = useMemo(() => {
    const base = projectsInRange(projects, range);
    if (!yearHasData) return base.filter((p) => p.status !== "상시" && p.status !== "대기");
    return base;
  }, [projects, range, yearHasData]);

  const filteredLeaves = useMemo(() => leavesInRange(leaves, range), [leaves, range]);

  const kpis = useMemo(() => computeKpis(filteredProjects, filteredLeaves), [filteredProjects, filteredLeaves]);
  const deptDist = useMemo(() => deptDistribution(filteredProjects), [filteredProjects]);
  const statusDist = useMemo(() => statusDistribution(filteredProjects), [filteredProjects]);
  const buckets = useMemo(() => progressBuckets(filteredProjects), [filteredProjects]);
  const monthly = useMemo(() => monthlyCompleted(filteredProjects, range), [filteredProjects, range]);
  const workload = useMemo(() => workloadByMember(filteredProjects), [filteredProjects]);
  const deptAvg = useMemo(() => deptAvgProgress(filteredProjects), [filteredProjects]);
  const heatmap = useMemo(() => leaveHeatmap(filteredLeaves, range), [filteredLeaves, range]);
  const recent = useMemo(() => recentResolvedIssues(filteredProjects), [filteredProjects]);
  const issueAgg = useMemo(() => issueStats(filteredProjects), [filteredProjects]);
  const urgency = useMemo(() => deadlineUrgency(filteredProjects), [filteredProjects]);
  const matrix = useMemo(() => deptStatusMatrix(filteredProjects), [filteredProjects]);

  const currentYear = new Date().getFullYear();

  const setYear = (newY: number) =>
    navigate({ search: (prev: any) => ({ ...prev, y: newY }), replace: true });
  const setQuarter = (newQ: 0 | 1 | 2 | 3 | 4) =>
    navigate({ search: (prev: any) => ({ ...prev, q: newQ }), replace: true });

  const openDetailWindow = (qs: string) => {
    const w = window.screen.availWidth;
    const h = window.screen.availHeight;
    const features = `popup=yes,width=${w},height=${h},left=0,top=0,noreferrer`;
    const win = window.open(`/detail?${qs}`, "design-detail-window", features);
    win?.focus();
  };
  const openIssueWindow = (projectId: string, focusId: string) =>
    openDetailWindow(`id=${projectId}&focus=${focusId}`);
  const openProjectWindow = (projectId: string) =>
    openDetailWindow(`id=${projectId}`);

  return (
    <div className="min-h-screen bg-[#050505] text-white relative">
      {/* page-level subtle radial gradient */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-0"
        style={{
          background:
            "radial-gradient(1200px 600px at 15% -10%, rgba(255,92,0,0.06), transparent 60%), radial-gradient(1000px 500px at 100% 110%, rgba(0,123,255,0.06), transparent 60%)",
        }}
      />
      <Header />
      <main className="relative mx-auto max-w-[1920px] px-12 py-10 space-y-6">
        {/* ── Title + period filter ── */}
        <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-4 border-b border-white/10 pb-6">
          <div className="min-w-0">
            <h1 className="text-[32px] font-black tracking-tighter break-keep leading-tight">인사이트</h1>
            <p className="mt-1.5 text-[14px] font-medium text-white/40">
              {quarter === 0 ? `${year}년 전체` : `${year}년 ${quarter}분기`} 운영 데이터 회고
            </p>
          </div>
          <div
            role="group"
            aria-label="기간"
            className="flex items-center gap-1 bg-white/5 border border-white/10 rounded-xl p-1 backdrop-blur-md"
          >
            <select
              value={year}
              onChange={(e) => setYear(Number(e.target.value))}
              aria-label="연도 선택"
              className="bg-transparent text-white text-sm font-bold px-2 py-2 rounded-lg hover:bg-white/10 focus:outline-none cursor-pointer appearance-none tabular-nums"
            >
              {[currentYear - 1, currentYear, currentYear + 1].map((y) => (
                <option key={y} value={y} className="bg-neutral-900 text-white">{y}년</option>
              ))}
            </select>
            <div className="h-5 w-px bg-white/15" />
            {([1, 2, 3, 4] as const).map((q) => (
              <button
                key={q}
                type="button"
                aria-pressed={quarter === q}
                onClick={() => setQuarter(q)}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition ${quarter === q ? "bg-white/20 text-white" : "text-white/40 hover:text-white"}`}
              >
                {q}분기
              </button>
            ))}
            <button
              type="button"
              aria-pressed={quarter === 0}
              onClick={() => setQuarter(0)}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition ${quarter === 0 ? "bg-white/20 text-white" : "text-white/40 hover:text-white"}`}
            >
              연간
            </button>
          </div>
        </div>

        {/* ── KPI Strip ── */}
        <section className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-8">
          <Kpi label="진행 중" value={kpis.inProgress} accent="#10B981" />
          <Kpi label="완료" value={kpis.done} accent="#22C55E" />
          <Kpi label="대기" value={kpis.pending} accent="#9CA3AF" />
          <Kpi label="상시" value={kpis.ongoing} accent="#3B82F6" />
          <Kpi label="열린 이슈" value={kpis.openIssues} accent="#F97316" />
          <Kpi label="이번 달 해결" value={kpis.resolvedThisMonth} accent="#22C55E" />
          <Kpi label="이번 달 휴가" value={kpis.leavesThisMonth} accent="#EC4899" />
          <Kpi label="평균 진행률" value={`${kpis.avgProgress}%`} accent="#FFFFFF" />
        </section>

        {/* ── Project Analysis ── */}
        <section className="grid grid-cols-1 gap-4 lg:grid-cols-2 xl:grid-cols-4">
          <Card title="부서별 프로젝트 분포">
            <div className="relative">
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <defs>
                    {deptDist.map((d) => (
                      <linearGradient key={`g-${d.name}`} id={`dept-grad-${d.name}`} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={DEPT_COLOR[d.name]} stopOpacity={1} />
                        <stop offset="100%" stopColor={DEPT_COLOR[d.name]} stopOpacity={0.78} />
                      </linearGradient>
                    ))}
                    <radialGradient id="dept-inner-shade" cx="50%" cy="50%" r="50%">
                      <stop offset="60%" stopColor="#000" stopOpacity={0} />
                      <stop offset="100%" stopColor="#000" stopOpacity={0.35} />
                    </radialGradient>
                  </defs>
                  <Pie data={deptDist} dataKey="value" nameKey="name" innerRadius={58} outerRadius={92} paddingAngle={2} cornerRadius={6} stroke="rgba(0,0,0,0.4)" strokeWidth={1}>
                    {deptDist.map((d) => (
                      <Cell key={d.name} fill={`url(#dept-grad-${d.name})`} />
                    ))}
                  </Pie>
                  <Pie data={[{ v: 1 }]} dataKey="v" innerRadius={58} outerRadius={92} fill="url(#dept-inner-shade)" stroke="none" isAnimationActive={false} />
                  <Tooltip contentStyle={tooltipStyle} />
                </PieChart>
              </ResponsiveContainer>
              <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                <div className="text-[10px] uppercase tracking-widest text-white/40">총</div>
                <div className="text-2xl font-black tabular-nums">{deptDist.reduce((s, d) => s + d.value, 0)}</div>
              </div>
            </div>
            <Legend items={deptDist.map((d) => ({ label: `${d.name} ${d.value}`, color: DEPT_COLOR[d.name] }))} />
          </Card>

          <Card title="상태별 분포">
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={statusDist} barCategoryGap="32%">
                <defs>
                  {statusDist.map((s) => (
                    <linearGradient key={`sg-${s.name}`} id={`status-grad-${s.name}`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={STATUS_COLOR[s.name]} stopOpacity={1} />
                      <stop offset="100%" stopColor={STATUS_COLOR[s.name]} stopOpacity={0.3} />
                    </linearGradient>
                  ))}
                </defs>
                <CartesianGrid stroke="rgba(255,255,255,0.04)" vertical={false} />
                <XAxis dataKey="name" stroke="#9CA3AF" tickLine={false} axisLine={false} />
                <YAxis stroke="#9CA3AF" allowDecimals={false} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "rgba(255,255,255,0.04)" }} />
                <Bar dataKey="value" radius={[10, 10, 0, 0]}>
                  {statusDist.map((s) => (
                    <Cell key={s.name} fill={`url(#status-grad-${s.name})`} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </Card>

          <Card title="월별 완료 추이">
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={monthly}>
                <defs>
                  <linearGradient id="area-monthly" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#22C55E" stopOpacity={0.5} />
                    <stop offset="100%" stopColor="#22C55E" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="rgba(255,255,255,0.04)" vertical={false} />
                <XAxis dataKey="month" stroke="#9CA3AF" tickLine={false} axisLine={false} />
                <YAxis stroke="#9CA3AF" allowDecimals={false} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={tooltipStyle} />
                <Area type="monotone" dataKey="value" stroke="#22C55E" strokeWidth={2.5} fill="url(#area-monthly)" activeDot={{ r: 5, fill: "#22C55E", stroke: "#0a0a0a", strokeWidth: 2 }} />
              </AreaChart>
            </ResponsiveContainer>
          </Card>

          <Card title="진행률 구간 분포">
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={buckets}>
                <defs>
                  <linearGradient id="bucket-grad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#10B981" stopOpacity={1} />
                    <stop offset="100%" stopColor="#3B82F6" stopOpacity={0.5} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="rgba(255,255,255,0.04)" vertical={false} />
                <XAxis dataKey="range" stroke="#9CA3AF" tickLine={false} axisLine={false} />
                <YAxis stroke="#9CA3AF" allowDecimals={false} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "rgba(255,255,255,0.04)" }} />
                <Bar dataKey="value" fill="url(#bucket-grad)" radius={[10, 10, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </section>

        {/* ── 부서 × 상태 매트릭스 + 마감 임박 ── */}
        <section className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <Card title="부서별 상태 구성" className="lg:col-span-2">
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={matrix} barCategoryGap="28%">
                <defs>
                  {(["진행", "상시", "대기", "완료"] as const).map((s) => (
                    <linearGradient key={`mg-${s}`} id={`mat-grad-${s}`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={STATUS_COLOR[s]} stopOpacity={1} />
                      <stop offset="100%" stopColor={STATUS_COLOR[s]} stopOpacity={0.88} />
                    </linearGradient>
                  ))}
                </defs>
                <CartesianGrid stroke="rgba(255,255,255,0.04)" vertical={false} />
                <XAxis dataKey="dept" stroke="#9CA3AF" tickLine={false} axisLine={false} />
                <YAxis stroke="#9CA3AF" allowDecimals={false} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "rgba(255,255,255,0.04)" }} />
                <RLegend wrapperStyle={{ fontSize: 12, color: "#9CA3AF" }} />
                <Bar dataKey="진행" stackId="a" fill="url(#mat-grad-진행)" />
                <Bar dataKey="상시" stackId="a" fill="url(#mat-grad-상시)" />
                <Bar dataKey="대기" stackId="a" fill="url(#mat-grad-대기)" />
                <Bar dataKey="완료" stackId="a" fill="url(#mat-grad-완료)" radius={[10, 10, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </Card>

          <Card title="마감 임박 (30일 내)">
            <div className="grid grid-cols-3 gap-2 mb-4">
              {urgency.buckets.map((b, i) => {
                const grads = [
                  "linear-gradient(135deg, rgba(244,63,94,0.25), rgba(249,115,22,0.10))",
                  "linear-gradient(135deg, rgba(249,115,22,0.22), rgba(250,204,21,0.10))",
                  "linear-gradient(135deg, rgba(250,204,21,0.20), rgba(16,185,129,0.10))",
                ];
                const colors = ["#F43F5E", "#F97316", "#FACC15"];
                return (
                  <div key={b.range} className="rounded-xl border border-white/10 p-3 text-center" style={{ background: grads[i] }}>
                    <div className="text-2xl font-black tabular-nums" style={{ color: colors[i] }}>{b.value}</div>
                    <div className="mt-1 text-[11px] text-white/60">{b.range}</div>
                  </div>
                );
              })}
            </div>
            {urgency.items.length === 0 ? (
              <Empty>임박한 마감이 없습니다.</Empty>
            ) : (
              <ul className="divide-y divide-white/5 max-h-[180px] overflow-y-auto">
                {urgency.items.map((it) => {
                  const dColor = it.daysLeft <= 7 ? "#F43F5E" : it.daysLeft <= 14 ? "#F97316" : "#FACC15";
                  return (
                    <li key={it.id}>
                      <button
                        type="button"
                        onClick={() => openProjectWindow(it.id)}
                        className="flex w-full items-center justify-between gap-3 py-2 text-left text-sm hover:bg-white/5 px-2 rounded transition"
                      >
                        <span className="h-2 w-2 rounded-full shrink-0" style={{ background: dColor, boxShadow: `0 0 10px ${dColor}` }} />
                        <div className="min-w-0 flex-1">
                          <div className="truncate font-medium">{it.title}</div>
                          <div className="truncate text-xs" style={{ color: DEPT_COLOR[it.department] }}>
                            {it.department}
                          </div>
                        </div>
                        <div className="shrink-0 text-xs font-bold tabular-nums" style={{ color: dColor }}>
                          D-{it.daysLeft}
                        </div>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </Card>
        </section>

        {/* ── Workload ── */}
        <section className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <Card title="담당자별 활성 업무 TOP 10" className="lg:col-span-2">
            {workload.length === 0 ? (
              <Empty>활성 업무가 없습니다.</Empty>
            ) : (
              <ResponsiveContainer width="100%" height={Math.max(220, workload.length * 32)}>
                <BarChart data={workload} layout="vertical" margin={{ left: 20 }}>
                  <defs>
                    <linearGradient id="workload-grad" x1="0" y1="0" x2="1" y2="0">
                      <stop offset="0%" stopColor="#3B82F6" stopOpacity={1} />
                      <stop offset="100%" stopColor="#3B82F6" stopOpacity={0.35} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke="rgba(255,255,255,0.04)" horizontal={false} />
                  <XAxis type="number" stroke="#9CA3AF" allowDecimals={false} tickLine={false} axisLine={false} />
                  <YAxis type="category" dataKey="name" stroke="#9CA3AF" width={70} tickLine={false} axisLine={false} />
                  <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "rgba(255,255,255,0.04)" }} />
                  <Bar dataKey="value" fill="url(#workload-grad)" radius={[0, 8, 8, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </Card>

          <Card title="부서별 평균 진행률">
            <div className="space-y-4 pt-2">
              {deptAvg.map((d) => (
                <div key={d.name}>
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium" style={{ color: DEPT_COLOR[d.name as Department] }}>{d.name}</span>
                    <span className="text-muted-foreground tabular-nums">{d.value}%</span>
                  </div>
                  <div className="mt-1.5 h-2 rounded-full bg-white/5 overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${d.value}%`,
                        background: `linear-gradient(90deg, ${DEPT_COLOR[d.name as Department]}, ${DEPT_COLOR[d.name as Department]}66)`,
                        boxShadow: `0 0 12px ${DEPT_COLOR[d.name as Department]}55`,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </section>

        {/* ── Schedule ── */}
        <section>
          <Card title="월별 연차 사용 히트맵">
            {heatmap.rows.length === 0 ? (
              <Empty>연차 기록이 없습니다.</Empty>
            ) : (
              <Heatmap rows={heatmap.rows} labels={heatmap.labels} />
            )}
          </Card>
        </section>

        {/* ── Issue Retro ── */}
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
                {recent.map((r) => (
                  <li key={`${r.projectId}-${r.issueId}`}>
                    <button
                      type="button"
                      onClick={() => openIssueWindow(r.projectId, r.issueId)}
                      title="새 창에서 해당 이슈로 이동"
                      className="flex w-full items-center justify-between gap-4 py-2 pl-3 pr-2 text-left text-sm rounded transition border-l-2 border-transparent hover:bg-white/5 hover:border-emerald-400/80"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="truncate font-medium">{r.title}</div>
                        <div className="truncate text-xs text-muted-foreground">
                          {r.project} · {r.assignee}
                        </div>
                      </div>
                      <div className="shrink-0 text-xs text-muted-foreground tabular-nums">
                        {r.timestamp.slice(0, 10)}
                      </div>
                    </button>
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
  background: "rgba(10,10,10,0.85)",
  border: "1px solid rgba(255,255,255,0.15)",
  borderRadius: 10,
  fontSize: 12,
  backdropFilter: "blur(8px)",
  boxShadow: "0 10px 30px -10px rgba(0,0,0,0.6)",
};

function Card({ title, children, className = "" }: { title: string; children: React.ReactNode; className?: string }) {
  return (
    <div
      className={`group relative rounded-2xl border border-white/10 bg-gradient-to-br from-white/[0.06] via-white/[0.02] to-transparent p-6 shadow-[0_30px_60px_-30px_rgba(0,0,0,0.6)] transition hover:border-white/20 ${className}`}
      style={{ boxShadow: "inset 0 1px 0 0 rgba(255,255,255,0.05), 0 30px 60px -30px rgba(0,0,0,0.6)" }}
    >
      <h3 className="mb-4 text-[13px] font-bold uppercase tracking-wider text-white/60">{title}</h3>
      {children}
    </div>
  );
}

function Kpi({ label, value, accent }: { label: string; value: number | string; accent: string }) {
  return (
    <div
      className="relative overflow-hidden rounded-2xl border border-white/10 p-4 transition hover:border-white/20"
      style={{
        background: `radial-gradient(120% 100% at 0% 0%, ${accent}14, transparent 60%), linear-gradient(180deg, rgba(255,255,255,0.04), transparent)`,
        boxShadow: "inset 0 1px 0 0 rgba(255,255,255,0.05)",
      }}
    >
      <div className="absolute left-0 top-3 bottom-3 w-[2px] rounded-r" style={{ background: accent, boxShadow: `0 0 10px ${accent}` }} />
      <div className="flex items-center justify-between">
        <div className="text-[11px] uppercase tracking-wider text-white/40">{label}</div>
        <span className="h-1.5 w-1.5 rounded-full" style={{ background: accent }} />
      </div>
      <div className="mt-1.5 text-[28px] font-black tracking-tight tabular-nums" style={{ color: accent }}>{value}</div>
    </div>
  );
}

function Stat({ label, value, color }: { label: string; value: number | string; color: string }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.02] p-3 text-center">
      <div className="text-2xl font-bold tabular-nums" style={{ color }}>{value}</div>
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

function Heatmap({ rows, labels }: { rows: { member: string; months: number[] }[]; labels: string[] }) {
  const max = Math.max(1, ...rows.flatMap((r) => r.months));
  const cellStyle = (n: number) => {
    if (!n) {
      return {
        background: "transparent",
        border: "1px dashed rgba(255,255,255,0.08)",
      } as React.CSSProperties;
    }
    const t = n / max;
    const a1 = 0.25 + t * 0.55;
    const a2 = 0.10 + t * 0.30;
    return {
      background: `linear-gradient(135deg, rgba(236,72,153,${a1.toFixed(2)}), rgba(236,72,153,${a2.toFixed(2)}))`,
      boxShadow: `0 0 12px rgba(236,72,153,${(t * 0.35).toFixed(2)})`,
      border: "1px solid rgba(236,72,153,0.18)",
    } as React.CSSProperties;
  };
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs border-separate" style={{ borderSpacing: "4px" }}>
        <thead className="text-muted-foreground">
          <tr>
            <th className="sticky left-0 bg-transparent py-1 pr-3 text-left font-medium">팀원</th>
            {labels.map((l) => (
              <th key={l} className="px-2 py-1 text-center font-medium">{l}</th>
            ))}
            <th className="px-2 py-1 text-center font-medium">합계</th>
          </tr>
        </thead>
        <tbody>
          {rows.slice(0, 16).map((r) => {
            const total = r.months.reduce((s, n) => s + n, 0);
            return (
              <tr key={r.member}>
                <td className="sticky left-0 bg-transparent py-1 pr-3 font-medium">{r.member}</td>
                {r.months.map((n, i) => (
                  <td key={i} className="p-0">
                    <div
                      className="mx-auto flex h-7 w-10 items-center justify-center rounded-md text-[11px] text-white/90"
                      style={cellStyle(n)}
                    >
                      {n || ""}
                    </div>
                  </td>
                ))}
                <td className="px-2 py-1 text-center font-bold tabular-nums">{total}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
