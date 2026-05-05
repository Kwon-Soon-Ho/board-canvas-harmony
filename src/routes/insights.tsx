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
  
  // Workload is a LIVE metric, so we use all projects (status based) instead of filtered range
  // This fixes the bug where people disappear when Q1 is selected.
  const workload = useMemo(() => workloadByMember(projects), [projects]);
  
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

  // ── 시간 단위 연차/시차 계산 로직 ──
  const calculateHours = (leaveType: string, start?: string, end?: string) => {
    if (leaveType === "연차") return 8;
    if (leaveType === "반차") return 4;
    if (leaveType === "시차" && start && end) {
      try {
        const [sh, sm] = start.split(':').map(Number);
        const [eh, em] = end.split(':').map(Number);
        const total = (eh + em/60) - (sh + sm/60);
        return total > 0 ? total : 0;
      } catch { return 2; } // 기본값 2시간
    }
    return 0;
  };

  // ── 분기별 연차 데이터 가공 ──
  const quarterlyLeaves = useMemo(() => {
    const members = Array.from(new Set(leaves.map(l => l.member_name))).sort();
    const rows = members.map(name => {
      const memberLeaves = leaves.filter(l => l.member_name === name && l.leave_date.startsWith(year.toString()));
      const qData = [0, 0, 0, 0];
      const qDetails: any[][] = [[], [], [], []];
      
      memberLeaves.forEach(l => {
        const month = parseInt(l.leave_date.split('-')[1]);
        const qIdx = Math.floor((month - 1) / 3);
        const hours = calculateHours(l.leave_type, l.start_time, l.end_time);
        qData[qIdx] += hours;
        qDetails[qIdx].push({ ...l, hours });
      });
      
      return { 
        name, 
        data: qData, 
        details: qDetails,
        totalHours: qData.reduce((a, b) => a + b, 0)
      };
    });
    return { rows, labels: ["1분기", "2분기", "3분기", "4분기"] };
  }, [leaves, year]);

  const [selectedLeaveDetail, setSelectedLeaveDetail] = useState<{name: string, q: string, items: any[]} | null>(null);

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
    <div className="min-h-screen bg-[#020202] text-white relative font-sans selection:bg-emerald-500/30">
      {/* Dynamic Background Effects */}
      <div aria-hidden className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-[10%] -left-[5%] w-[40%] h-[40%] bg-emerald-500/5 blur-[120px] rounded-full" />
        <div className="absolute top-[20%] -right-[10%] w-[35%] h-[35%] bg-blue-500/5 blur-[120px] rounded-full" />
        <div className="absolute -bottom-[10%] left-[20%] w-[50%] h-[50%] bg-purple-500/5 blur-[120px] rounded-full" />
      </div>

      <Header />
      
      <main className="relative mx-auto max-w-[1920px] px-6 py-6 space-y-6">
        {/* ── Top Navigation & Period Filter ── */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <h1 className="text-3xl font-black tracking-tight bg-gradient-to-r from-white to-white/40 bg-clip-text text-transparent">
              운영 분석 리포트
            </h1>
            <p className="text-xs font-medium text-white/30 flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
              {quarter === 0 ? `${year}년 전체` : `${year}년 ${quarter}분기`} 퍼포먼스 데이터 회고
            </p>
          </div>

          <div className="flex items-center gap-2 bg-white/5 p-1 rounded-2xl border border-white/10 backdrop-blur-xl shadow-2xl">
            <div className="relative group">
               <select
                value={year}
                onChange={(e) => setYear(Number(e.target.value))}
                className="bg-transparent text-white text-sm font-bold pl-3 pr-8 py-2 rounded-xl hover:bg-white/5 focus:outline-none cursor-pointer appearance-none tabular-nums"
                style={{ color: '#fff', backgroundColor: 'transparent' }}
              >
                {[currentYear - 1, currentYear, currentYear + 1].map((y) => (
                  <option key={y} value={y} style={{ backgroundColor: '#0a0a0a', color: '#fff' }}>{y}년</option>
                ))}
              </select>
              <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none opacity-40">
                <svg width="10" height="6" viewBox="0 0 10 6" fill="none"><path d="M1 1L5 5L9 1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
              </div>
            </div>
            <div className="w-px h-4 bg-white/10 mx-1" />
            <div className="flex gap-1">
              {[1, 2, 3, 4].map((q) => (
                <button
                  key={q}
                  onClick={() => setQuarter(q as any)}
                  className={`px-4 py-2 rounded-xl text-xs font-black transition-all ${quarter === q ? "bg-white text-black shadow-xl" : "text-white/40 hover:text-white hover:bg-white/5"}`}
                >
                  {q}분기
                </button>
              ))}
              <button
                onClick={() => setQuarter(0)}
                className={`px-4 py-2 rounded-xl text-xs font-black transition-all ${quarter === 0 ? "bg-white text-black shadow-xl" : "text-white/40 hover:text-white hover:bg-white/5"}`}
              >
                연간 전체
              </button>
            </div>
          </div>
        </div>

        {/* ── KPI Grid ── */}
        <section className="grid grid-cols-2 lg:grid-cols-4 xl:grid-cols-8 gap-4">
          <Kpi label="진행 중" value={kpis.inProgress} accent="#10B981" icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z"/><path d="m9 12 2 2 4-4"/></svg>} />
          <Kpi label="완료됨" value={kpis.done} accent="#22C55E" icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>} />
          <Kpi label="대기 중" value={kpis.pending} accent="#9CA3AF" icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>} />
          <Kpi label="상시 업무" value={kpis.ongoing} accent="#3B82F6" icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.3"/></svg>} />
          <Kpi label="미결 이슈" value={kpis.openIssues} accent="#F97316" icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>} />
          <Kpi label="해결됨" value={kpis.resolvedThisMonth} accent="#22C55E" label2="이번 달 기준" />
          <Kpi label="팀 휴가" value={kpis.leavesThisMonth} accent="#EC4899" label2="이번 달 기준" />
          <Kpi label="평균 진행률" value={`${kpis.avgProgress}%`} accent="#FFFFFF" icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 3v18h18"/><path d="m19 9-5 5-4-4-3 3"/></svg>} />
        </section>

        {/* ── Main Dashboard Layout ── */}
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
          
          {/* Left Column (8 units) - Deep Analysis */}
          <div className="xl:col-span-8 space-y-6">
            
            {/* Project Trends Area */}
            <Card title="월별 성과 추이" description="월별 프로젝트 완료 건수 및 퍼포먼스 분석">
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={monthly} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="area-grad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#10B981" stopOpacity={0.4} />
                      <stop offset="100%" stopColor="#10B981" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" vertical={false} />
                  <XAxis dataKey="month" stroke="#666" tick={{ fill: '#666', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis stroke="#666" tick={{ fill: '#666', fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
                  <Tooltip 
                    contentStyle={tooltipStyle} 
                    itemStyle={{ color: '#fff' }} 
                    formatter={(value: number) => [`${value}건`, '완료']}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="value" 
                    stroke="#10B981" 
                    strokeWidth={4} 
                    fill="url(#area-grad)" 
                    activeDot={{ r: 6, fill: "#10B981", stroke: "#000", strokeWidth: 3 }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </Card>

            {/* Team Heatmap - Quarterly */}
            <Card title="분기별 팀원 연차 사용 현황" description="팀원별 분기 단위 연차 및 시차 사용 시간 분석 (클릭 시 상세 보기)">
              {quarterlyLeaves.rows.length === 0 ? (
                <Empty>데이터가 없습니다.</Empty>
              ) : (
                <Heatmap 
                  rows={quarterlyLeaves.rows} 
                  labels={quarterlyLeaves.labels} 
                  onCellClick={(name, qIdx) => {
                    const row = quarterlyLeaves.rows.find(r => r.name === name);
                    if (row) {
                      setSelectedLeaveDetail({
                        name,
                        q: `${qIdx + 1}분기`,
                        items: row.details[qIdx]
                      });
                    }
                  }}
                />
              )}
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Dept Stacked Bar */}
              <Card title="부서별 운영 매트릭스">
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={matrix} barGap={8} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid stroke="rgba(255,255,255,0.03)" vertical={false} />
                    <XAxis dataKey="dept" stroke="#666" tick={{ fill: '#666', fontSize: 11 }} axisLine={false} tickLine={false} />
                    <YAxis stroke="#666" tick={{ fill: '#666', fontSize: 11 }} axisLine={false} tickLine={false} />
                    <Tooltip 
                      contentStyle={tooltipStyle} 
                      cursor={{ fill: 'rgba(255,255,255,0.03)' }}
                      formatter={(value: number, name: string) => [`${value}건`, name]}
                    />
                    <RLegend wrapperStyle={{ paddingTop: 20, color: '#999', fontSize: 11 }} iconType="circle" />
                    <Bar dataKey="진행" stackId="a" fill="#10B981" radius={[0, 0, 0, 0]} />
                    <Bar dataKey="상시" stackId="a" fill="#3B82F6" />
                    <Bar dataKey="대기" stackId="a" fill="#9CA3AF" />
                    <Bar dataKey="완료" stackId="a" fill="#22C55E" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </Card>

              {/* Progress Buckets */}
              <Card title="진행률 분포 현황">
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={buckets} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid stroke="rgba(255,255,255,0.03)" vertical={false} />
                    <XAxis dataKey="range" stroke="#666" tick={{ fill: '#666', fontSize: 11 }} axisLine={false} tickLine={false} />
                    <YAxis stroke="#666" tick={{ fill: '#666', fontSize: 11 }} axisLine={false} tickLine={false} />
                    <Tooltip 
                      contentStyle={tooltipStyle} 
                      cursor={{ fill: 'transparent' }}
                      formatter={(value: number) => [`${value}개`, '프로젝트']}
                    />
                    <Bar dataKey="value" fill="#3B82F6" radius={[6, 6, 0, 0]} barSize={40} />
                  </BarChart>
                </ResponsiveContainer>
              </Card>
            </div>
          </div>

          {/* Right Column (4 units) - Operations & Risk */}
          <div className="xl:col-span-4 space-y-6">
            
            {/* Pie Chart: Dept Distribution */}
            <Card title="부서별 프로젝트 비중">
              <div className="relative h-[220px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Tooltip 
                      contentStyle={tooltipStyle} 
                      itemStyle={{ color: '#fff' }}
                      formatter={(value: number, name: string) => [`${value}건`, name]}
                    />
                    <Pie 
                      data={deptDist} 
                      innerRadius={65} 
                      outerRadius={90} 
                      paddingAngle={4} 
                      dataKey="value" 
                      stroke="none"
                      cornerRadius={8}
                    >
                      {deptDist.map((entry) => (
                        <Cell key={`cell-${entry.name}`} fill={DEPT_COLOR[entry.name]} />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <span className="text-[10px] font-bold text-white/30 tracking-widest uppercase">전체</span>
                  <span className="text-3xl font-black">{deptDist.reduce((a, b) => a + b.value, 0)}</span>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-y-2 mt-4 px-2">
                {deptDist.map(d => (
                  <div key={d.name} className="flex items-center gap-2 text-[11px] font-bold text-white/60">
                    <div className="w-2 h-2 rounded-full" style={{ background: DEPT_COLOR[d.name] }} />
                    <span className="truncate">{d.name}</span>
                    <span className="text-white/20 ml-auto tabular-nums">{d.value}</span>
                  </div>
                ))}
              </div>
            </Card>

            {/* Workload Chart - Fixed YAxis */}
            <Card title="담당자별 실시간 업무량" description="현재 팀원별 할당된 업무량 분석 (TOP 10)">
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart 
                    data={workload} 
                    layout="vertical" 
                    margin={{ left: 10, right: 30, top: 0, bottom: 0 }}
                  >
                    <XAxis type="number" hide />
                    <YAxis 
                      dataKey="name" 
                      type="category" 
                      stroke="#fff" 
                      fontSize={12} 
                      width={80} 
                      axisLine={false} 
                      tickLine={false} 
                      interval={0}
                      tick={{ fill: '#fff', fontWeight: 'bold' }}
                    />
                    <Tooltip 
                      contentStyle={tooltipStyle} 
                      cursor={{ fill: 'rgba(255,255,255,0.03)' }}
                      formatter={(value: number) => [`${value}건`, '활성 업무']}
                    />
                    <Bar dataKey="value" fill="#10B981" radius={[0, 6, 6, 0]} barSize={20} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>

            {/* Deadline Urgency */}
            <Card title="마감 임박 리스크 (D-30)" className="border-red-500/20 bg-red-500/[0.02]">
              <div className="space-y-3">
                {urgency.items.length === 0 ? (
                  <Empty>마감 임박 프로젝트가 없습니다.</Empty>
                ) : (
                  urgency.items.map(it => {
                    const color = it.daysLeft <= 7 ? "#F43F5E" : it.daysLeft <= 14 ? "#F97316" : "#FACC15";
                    return (
                      <button
                        key={it.id}
                        onClick={() => openProjectWindow(it.id)}
                        className="w-full flex items-center justify-between p-3 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/5 transition-all group"
                      >
                        <div className="flex items-center gap-3 overflow-hidden">
                          <div className="w-1.5 h-1.5 rounded-full shrink-0 group-hover:scale-150 transition-transform" style={{ background: color, boxShadow: `0 0 12px ${color}` }} />
                          <div className="text-left truncate">
                            <div className="text-sm font-bold text-white/90 truncate">{it.title}</div>
                            <div className="text-[10px] font-bold text-white/30 uppercase tracking-wider">{it.department}</div>
                          </div>
                        </div>
                        <div className="text-sm font-black tabular-nums" style={{ color }}>D-{it.daysLeft}</div>
                      </button>
                    )
                  })
                )}
              </div>
            </Card>

          </div>
        </div>

        {/* ── Secondary Dashboard Row ── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* 품질 관리 및 이슈 현황 */}
          <Card title="품질 관리 및 이슈 현황">
             <div className="grid grid-cols-3 gap-3 mb-6">
               <div className="p-4 rounded-3xl bg-orange-500/10 border border-orange-500/20 text-center">
                 <div className="text-[10px] font-black text-orange-500/60 uppercase tracking-widest">미결 이슈</div>
                 <div className="text-3xl font-black text-orange-500">{issueAgg.open}</div>
               </div>
               <div className="p-4 rounded-3xl bg-emerald-500/10 border border-emerald-500/20 text-center">
                 <div className="text-[10px] font-black text-emerald-500/60 uppercase tracking-widest">해결됨</div>
                 <div className="text-3xl font-black text-emerald-500">{issueAgg.resolved}</div>
               </div>
               <div className="p-4 rounded-3xl bg-white/5 border border-white/10 text-center">
                 <div className="text-[10px] font-black text-white/30 uppercase tracking-widest">평균 소요</div>
                 <div className="text-3xl font-black text-white">{issueAgg.avgOpenDays}일</div>
               </div>
             </div>
             <div className="space-y-2 max-h-[200px] overflow-y-auto custom-scrollbar pr-2">
                {recent.map(r => (
                  <button
                    key={`${r.projectId}-${r.issueId}`}
                    onClick={() => openIssueWindow(r.projectId, r.issueId)}
                    className="w-full flex items-center justify-between py-3 px-4 rounded-2xl hover:bg-white/5 border-l-4 border-transparent hover:border-emerald-500 transition-all group"
                  >
                    <div className="text-left">
                      <div className="text-sm font-bold text-white/80 group-hover:text-emerald-400">{r.title}</div>
                      <div className="text-[11px] font-bold text-white/20">{r.project} · {r.assignee}</div>
                    </div>
                    <div className="text-[11px] font-bold text-white/20 tabular-nums">{r.timestamp.slice(0, 10)}</div>
                  </button>
                ))}
             </div>
          </Card>

          {/* 부서별 생산성(진행률) 분석 */}
          <Card title="부서별 생산성(진행률) 분석">
            <div className="flex items-end gap-5 h-[200px] px-4">
              {deptAvg.map(d => (
                <div key={d.name} className="flex-1 flex flex-col items-center gap-4 h-full group">
                  <div className="flex-1 w-full relative flex items-end justify-center">
                    <div 
                      className="w-full max-w-[32px] rounded-t-xl transition-all duration-1000 group-hover:brightness-125"
                      style={{ 
                        height: `${d.value}%`, 
                        background: `linear-gradient(to top, ${DEPT_COLOR[d.name]}44, ${DEPT_COLOR[d.name]})`,
                        boxShadow: `0 0 30px ${DEPT_COLOR[d.name]}33`
                      }}
                    />
                    <div className="absolute top-0 text-[11px] font-black tabular-nums opacity-0 group-hover:opacity-100 transition-opacity" style={{ color: DEPT_COLOR[d.name] }}>{d.value}%</div>
                  </div>
                  <span className="text-[10px] font-black text-white/40 group-hover:text-white transition-colors truncate w-full text-center">{d.name}</span>
                </div>
              ))}
            </div>
          </Card>
        </div>

        {/* ── Leave Detail Modal ── */}
        {selectedLeaveDetail && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 backdrop-blur-md bg-black/60">
            <div className="w-full max-w-lg rounded-[32px] border border-white/10 bg-[#0c0c0c] p-8 shadow-2xl animate-in fade-in zoom-in duration-200">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-2xl font-black tracking-tight">{selectedLeaveDetail.name}</h2>
                  <p className="text-sm font-bold text-white/30">{selectedLeaveDetail.q} 연차 사용 상세 기록</p>
                </div>
                <button 
                  onClick={() => setSelectedLeaveDetail(null)}
                  className="p-2 rounded-full hover:bg-white/5 transition-colors"
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                </button>
              </div>
              
              <div className="space-y-3 max-h-[400px] overflow-y-auto custom-scrollbar pr-2">
                {selectedLeaveDetail.items.length === 0 ? (
                  <p className="text-center py-10 text-white/20 font-bold">기록된 연차가 없습니다.</p>
                ) : (
                  selectedLeaveDetail.items.map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between p-4 rounded-2xl bg-white/5 border border-white/5">
                      <div>
                        <div className="text-sm font-bold text-white/90">{item.leave_date} ({item.leave_type})</div>
                        {item.reason && <div className="text-xs text-white/40 mt-0.5">{item.reason}</div>}
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-black text-emerald-400">+{item.hours}h</div>
                        {item.start_time && <div className="text-[10px] text-white/20 font-bold">{item.start_time} - {item.end_time}</div>}
                      </div>
                    </div>
                  ))
                )}
              </div>
              
              <div className="mt-8 pt-6 border-t border-white/5 flex items-center justify-between">
                <span className="text-sm font-bold text-white/40 uppercase tracking-widest">분기 합계</span>
                <span className="text-2xl font-black text-white">
                  {Math.floor(selectedLeaveDetail.items.reduce((a, b) => a + b.hours, 0) / 8)}일 {selectedLeaveDetail.items.reduce((a, b) => a + b.hours, 0) % 8}시간
                </span>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

function SectionHeader({ title, description }: { title: string; description: string }) {
  return (
    <div className="flex flex-col gap-1 border-l-4 border-emerald-500 pl-4 mb-2">
      <h2 className="text-xl font-black tracking-tight text-white/90 uppercase">{title}</h2>
      <p className="text-xs font-bold text-white/20 uppercase tracking-widest">{description}</p>
    </div>
  );
}

const tooltipStyle = {
  background: "rgba(0,0,0,0.9)",
  border: "1px solid rgba(255,255,255,0.1)",
  borderRadius: "16px",
  fontSize: "12px",
  fontWeight: "bold",
  color: "#fff",
  backdropFilter: "blur(20px)",
  boxShadow: "0 25px 50px -12px rgba(0,0,0,0.5)",
  padding: "12px 16px",
};

function Card({ 
  title, 
  description, 
  children, 
  className = "" 
}: { 
  title: string; 
  description?: string; 
  children: React.ReactNode; 
  className?: string 
}) {
  return (
    <div
      className={`group relative rounded-[32px] border border-white/10 bg-[#0a0a0a] p-8 transition-all hover:border-white/20 shadow-2xl ${className}`}
    >
      <div className="mb-8 space-y-1">
        <h3 className="text-sm font-black uppercase tracking-[0.2em] text-white/40 group-hover:text-white/60 transition-colors">{title}</h3>
        {description && <p className="text-[11px] font-bold text-white/20 uppercase tracking-wider">{description}</p>}
      </div>
      {children}
    </div>
  );
}

function Kpi({ 
  label, 
  value, 
  accent, 
  icon, 
  isSub, 
  label2 
}: { 
  label: string; 
  value: number | string; 
  accent: string; 
  icon?: React.ReactNode;
  isSub?: boolean;
  label2?: string;
}) {
  return (
    <div
      className="relative overflow-hidden rounded-[24px] border border-white/5 p-5 transition-all hover:bg-white/[0.02] group"
      style={{
        background: "linear-gradient(180deg, rgba(255,255,255,0.03) 0%, transparent 100%)",
      }}
    >
      <div className="flex items-start justify-between mb-4">
        <div className="space-y-0.5">
          <div className="text-[10px] font-black uppercase tracking-[0.15em] text-white/30 group-hover:text-white/50 transition-colors">{label}</div>
          {label2 && <div className="text-[9px] font-bold text-white/10 uppercase tracking-widest">{label2}</div>}
        </div>
        {icon && <div className="text-white/20 group-hover:text-white/40 transition-colors">{icon}</div>}
      </div>
      <div className="text-3xl font-black tracking-tighter tabular-nums" style={{ color: accent }}>{value}</div>
      <div className="absolute bottom-0 left-6 right-6 h-[2px] rounded-full opacity-0 group-hover:opacity-100 transition-opacity" style={{ background: `linear-gradient(90deg, transparent, ${accent}, transparent)` }} />
    </div>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-40 items-center justify-center rounded-3xl border border-dashed border-white/10 bg-white/[0.01]">
      <div className="text-center">
        <div className="text-[11px] font-black uppercase tracking-widest text-white/20">{children}</div>
      </div>
    </div>
  );
}

function Legend({ items }: { items: { label: string; color: string }[] }) {
  return (
    <div className="mt-6 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-[10px] font-black uppercase tracking-widest text-white/30">
      {items.map((it) => (
        <span key={it.label} className="flex items-center gap-2 group cursor-default">
          <span className="h-1.5 w-1.5 rounded-full transition-transform group-hover:scale-150" style={{ background: it.color }} />
          <span className="group-hover:text-white/60 transition-colors">{it.label}</span>
        </span>
      ))}
    </div>
  );
}

function Heatmap({ 
  rows, 
  labels, 
  onCellClick 
}: { 
  rows: { name: string; data: number[]; totalHours?: number }[]; 
  labels: string[];
  onCellClick?: (name: string, qIdx: number) => void;
}) {
  const max = Math.max(...rows.flatMap((r) => r.data), 1);
  return (
    <div className="space-y-4">
      <div className="flex items-center">
        <div className="w-24 shrink-0" />
        <div className="flex-1 grid grid-cols-4 gap-2">
          {labels.map((l) => (
            <div key={l} className="text-[10px] font-black text-white/20 uppercase tracking-widest text-center">
              {l}
            </div>
          ))}
        </div>
        <div className="w-16 text-right ml-4 text-[10px] font-black text-white/20 uppercase tracking-widest">
          합계
        </div>
      </div>
      <div className="space-y-2">
        {rows.map((row) => (
          <div key={row.name} className="flex items-center group/row">
            <div className="w-24 shrink-0 text-xs font-bold text-white/60 group-hover/row:text-white transition-colors truncate pr-4">
              {row.name}
            </div>
            <div className="flex-1 grid grid-cols-4 gap-2">
              {row.data.map((val, i) => {
                const opacity = val === 0 ? 0.03 : 0.1 + (val / max) * 0.9;
                return (
                  <div
                    key={i}
                    onClick={() => onCellClick?.(row.name, i)}
                    className="relative aspect-[3/1] rounded-lg transition-all hover:scale-[1.02] hover:ring-2 hover:ring-white/20 cursor-pointer overflow-hidden group/cell"
                    style={{
                      background: val === 0 ? "rgba(255,255,255,0.03)" : `rgba(16, 185, 129, ${opacity})`,
                    }}
                  >
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className={`text-[10px] font-black tabular-nums ${val === 0 ? "text-white/5" : "text-white/80"}`}>
                        {val}h
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="w-16 text-right ml-4 text-xs font-black text-white/40 tabular-nums group-hover/row:text-emerald-400 transition-colors">
              {row.totalHours}h
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
