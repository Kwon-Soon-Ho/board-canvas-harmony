import { useMemo, useState } from "react";
import type { Project } from "@/lib/mockProjects";
import { DEPT_COLOR } from "@/lib/mockProjects";
import { AlertCircle, CalendarIcon, ArrowRight } from "lucide-react";
import { format } from "date-fns";
import { ko } from "date-fns/locale";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

interface Props {
  projects: Project[];
  onOpen: (id: string) => void;
}

const STATUS_COLOR_VAR: Record<string, string> = {
  진행: "var(--status-active)",
  상시: "var(--status-ongoing)",
  대기: "var(--status-pending)",
  완료: "var(--status-done)",
};

type PresetKey = "thisWeek" | "twoWeeks" | "thisMonth" | "nextMonth" | "quarter" | "custom";

const PRESETS: { key: PresetKey; label: string }[] = [
  { key: "thisWeek", label: "이번 주" },
  { key: "twoWeeks", label: "2주" },
  { key: "thisMonth", label: "이번 달" },
  { key: "nextMonth", label: "다음 달까지" },
  { key: "quarter", label: "분기" },
  { key: "custom", label: "직접 선택" },
];

function parseDate(s?: string): Date | null {
  if (!s || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return null;
  const d = new Date(s);
  d.setHours(0, 0, 0, 0);
  return d;
}

function startOfWeek(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  const day = (x.getDay() + 6) % 7;
  x.setDate(x.getDate() - day);
  return x;
}
function endOfWeek(d: Date) {
  const x = startOfWeek(d);
  x.setDate(x.getDate() + 6);
  return x;
}
function startOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}
function endOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0);
}

function rangeFor(preset: PresetKey, today: Date, custom?: { from?: Date; to?: Date }) {
  switch (preset) {
    case "thisWeek":
      return { start: startOfWeek(today), end: endOfWeek(today) };
    case "twoWeeks": {
      const start = startOfWeek(today);
      const end = new Date(start);
      end.setDate(end.getDate() + 13);
      return { start, end };
    }
    case "thisMonth":
      return { start: startOfMonth(today), end: endOfMonth(today) };
    case "nextMonth": {
      const start = startOfMonth(today);
      const next = new Date(today.getFullYear(), today.getMonth() + 1, 1);
      return { start, end: endOfMonth(next) };
    }
    case "quarter": {
      const q = Math.floor(today.getMonth() / 3);
      const start = new Date(today.getFullYear(), q * 3, 1);
      const end = new Date(today.getFullYear(), q * 3 + 3, 0);
      return { start, end };
    }
    case "custom": {
      const start = custom?.from ? new Date(custom.from) : startOfWeek(today);
      const end = custom?.to ? new Date(custom.to) : endOfWeek(today);
      start.setHours(0, 0, 0, 0);
      end.setHours(0, 0, 0, 0);
      return { start, end };
    }
  }
}

export function TimelineView({ projects, onOpen }: Props) {
  const [preset, setPreset] = useState<PresetKey>("thisMonth");
  const [customRange, setCustomRange] = useState<{ from?: Date; to?: Date }>({});
  const [fromOpen, setFromOpen] = useState(false);
  const [toOpen, setToOpen] = useState(false);

  const today = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  const { rangeStart, rangeEnd, totalMs, ticks } = useMemo(() => {
    const { start, end } = rangeFor(preset, today, customRange);
    const realEnd = new Date(end);
    realEnd.setDate(realEnd.getDate() + 1);
    const totalMs = realEnd.getTime() - start.getTime();
    const days = Math.round(totalMs / 86400000);

    let stepDays: number;
    if (days <= 14) stepDays = 1;
    else if (days <= 31) stepDays = 3;
    else if (days <= 62) stepDays = 7;
    else stepDays = 14;

    const ticks: { date: Date; label: string }[] = [];
    for (let i = 0; i <= days; i += stepDays) {
      const t = new Date(start);
      t.setDate(t.getDate() + i);
      ticks.push({
        date: t,
        label: `${t.getMonth() + 1}/${t.getDate()}`,
      });
    }
    return { rangeStart: start, rangeEnd: realEnd, totalMs, ticks };
  }, [today, preset, customRange]);

  // Item: project that overlaps the visible range. 상시(no deadline)는 시작일~range 끝까지로 가상 확장.
  const items = useMemo(() => {
    return projects
      .filter((p) => p.status !== "대기") // 대기는 별도 섹션
      .map((p) => {
        const s = parseDate(p.startDate);
        const e = parseDate(p.deadline);
        const isOngoing = p.status === "상시";
        // 상시: 시작일이 있으면 그 시점부터 range 끝까지로 처리
        if (isOngoing && s) {
          return { p, s, e: rangeEnd, isOngoing: true };
        }
        return { p, s, e, isOngoing: false };
      })
      .filter((x): x is { p: Project; s: Date; e: Date; isOngoing: boolean } => !!(x.s && x.e))
      .filter(({ s, e }) => e >= rangeStart && s <= rangeEnd)
      .sort((a, b) => {
        // Stable multi-key sort: endDate → startDate → id (no ties → no flicker)
        const de = a.e.getTime() - b.e.getTime();
        if (de !== 0) return de;
        const ds = a.s.getTime() - b.s.getTime();
        if (ds !== 0) return ds;
        return a.p.id.localeCompare(b.p.id);
      });
  }, [projects, rangeStart, rangeEnd]);

  // 대기: 시작일/마감일 모두 없음 → 하단 칩 섹션
  const pending = useMemo(
    () => projects.filter((p) => p.status === "대기"),
    [projects]
  );

  const todayLeftPct =
    today >= rangeStart && today <= rangeEnd
      ? ((today.getTime() - rangeStart.getTime()) / totalMs) * 100
      : null;

  const displayEnd = new Date(rangeEnd);
  displayEnd.setDate(displayEnd.getDate() - 1);

  return (
    <section aria-label="타임라인" className="pb-24">
      {/* Range filter */}
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <span className="text-[12px] font-bold uppercase tracking-wider text-white/50">기간</span>
        <div className="flex bg-white/5 border border-white/10 rounded-lg p-1 backdrop-blur-md">
          {PRESETS.map((p) => (
            <button
              key={p.key}
              type="button"
              aria-pressed={preset === p.key}
              onClick={() => setPreset(p.key)}
              className={`px-3 py-1.5 rounded-md text-[13px] font-bold transition ${
                preset === p.key ? "bg-white/20 text-white" : "text-white/55 hover:text-white"
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>

        {preset === "custom" && (
          <div className="inline-flex items-center gap-2 rounded-lg border border-white/15 bg-white/[0.04] p-1">
            <Popover open={fromOpen} onOpenChange={setFromOpen}>
              <PopoverTrigger asChild>
                <button
                  type="button"
                  className="inline-flex items-center gap-2 rounded-md px-3 py-1.5 text-[13px] font-semibold text-white/85 hover:bg-white/10"
                >
                  <CalendarIcon className="h-3.5 w-3.5 text-white/60" />
                  <span className="text-[10px] font-bold uppercase tracking-wider text-white/40">시작</span>
                  {customRange.from ? format(customRange.from, "yyyy.MM.dd") : "선택"}
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  locale={ko}
                  selected={customRange.from}
                  onSelect={(d) => {
                    if (!d) return;
                    setCustomRange((r) => ({
                      from: d,
                      to: r.to && r.to >= d ? r.to : d,
                    }));
                    setFromOpen(false);
                  }}
                  initialFocus
                  className={cn("p-3 pointer-events-auto")}
                />
              </PopoverContent>
            </Popover>

            <ArrowRight className="h-3.5 w-3.5 text-white/40" />

            <Popover open={toOpen} onOpenChange={setToOpen}>
              <PopoverTrigger asChild>
                <button
                  type="button"
                  className="inline-flex items-center gap-2 rounded-md px-3 py-1.5 text-[13px] font-semibold text-white/85 hover:bg-white/10"
                >
                  <CalendarIcon className="h-3.5 w-3.5 text-white/60" />
                  <span className="text-[10px] font-bold uppercase tracking-wider text-white/40">종료</span>
                  {customRange.to ? format(customRange.to, "yyyy.MM.dd") : "선택"}
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  locale={ko}
                  selected={customRange.to}
                  defaultMonth={customRange.from}
                  disabled={customRange.from ? { before: customRange.from } : undefined}
                  onSelect={(d) => {
                    if (!d) return;
                    setCustomRange((r) => ({ from: r.from ?? d, to: d }));
                    setToOpen(false);
                  }}
                  initialFocus
                  className={cn("p-3 pointer-events-auto")}
                />
              </PopoverContent>
            </Popover>
          </div>
        )}

        <span className="text-[12px] font-mono text-white/50">
          {format(rangeStart, "yyyy.MM.dd")} → {format(displayEnd, "yyyy.MM.dd")}
        </span>
      </div>

      {/* Tick header */}
      <div className="mb-3 grid border-b border-white/10" style={{ gridTemplateColumns: `260px 1fr` }}>
        <div className="px-3 py-2 text-[12px] font-bold uppercase tracking-wider text-white/50">
          프로젝트
        </div>
        <div className="relative h-9">
          {ticks.map((t, i) => {
            const left = ((t.date.getTime() - rangeStart.getTime()) / totalMs) * 100;
            return (
              <div
                key={i}
                className="absolute top-0 bottom-0 border-l border-white/10 pl-1.5 text-[12px] font-bold tabular-nums text-white/60"
                style={{ left: `${left}%` }}
              >
                {t.label}
              </div>
            );
          })}
          {todayLeftPct !== null && (
            <div
              className="pointer-events-none absolute top-0 bottom-0 w-px bg-red-400/70"
              style={{ left: `${todayLeftPct}%` }}
              aria-label="오늘"
            >
              <span className="absolute -top-1 -left-4 rounded bg-red-500/90 px-1.5 py-0.5 text-[10px] font-bold text-white">
                TODAY
              </span>
            </div>
          )}
        </div>
      </div>

      {items.length === 0 && pending.length === 0 ? (
        <div className="flex h-[300px] items-center justify-center rounded-xl border border-dashed border-white/10 text-[14px] text-white/50">
          이 기간에 표시할 프로젝트가 없습니다.
        </div>
      ) : (
        <div className="flex flex-col">
          {items.map(({ p, s, e, isOngoing }) => {
            const startClamp = s < rangeStart ? rangeStart : s > rangeEnd ? rangeEnd : s;
            const endClamp = e < rangeStart ? rangeStart : e > rangeEnd ? rangeEnd : e;
            const leftPct = ((startClamp.getTime() - rangeStart.getTime()) / totalMs) * 100;
            const widthPct = Math.max(
              0.6,
              ((endClamp.getTime() - startClamp.getTime()) / totalMs) * 100
            );
            const diffDays = Math.round((e.getTime() - today.getTime()) / 86400000);
            const isInProgress = p.status === "진행";
            const isUrgent = isInProgress && diffDays <= 7 && p.progress < 100;
            const colorVar = STATUS_COLOR_VAR[p.status] ?? "var(--status-active)";
            const openIssues = p.issues.filter((i) => !i.resolved).length;
            const elapsedDays = isOngoing && p.startDate
              ? Math.max(0, Math.round((today.getTime() - new Date(p.startDate).getTime()) / 86400000))
              : null;

            return (
              <button
                key={p.id}
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => onOpen(p.id)}
                className="grid items-center border-b border-white/5 py-2.5 text-left transition hover:bg-white/[0.03]"
                style={{ gridTemplateColumns: `260px 1fr` }}
              >
                <div className="flex min-w-0 items-center gap-2 px-3">
                  <span
                    className="h-2 w-2 shrink-0 rounded-full"
                    style={{
                      backgroundColor: DEPT_COLOR[p.department],
                      boxShadow: `0 0 6px ${DEPT_COLOR[p.department]}`,
                    }}
                  />
                  <span className="truncate text-[14px] font-bold text-white">{p.title}</span>
                  {openIssues > 0 && (
                    <span className="inline-flex items-center gap-0.5 rounded bg-red-500/15 px-1.5 py-0.5 font-mono text-[11px] font-bold text-red-300">
                      <AlertCircle className="h-3 w-3" />
                      {openIssues}
                    </span>
                  )}
                </div>

                <div className="relative h-8">
                  <div
                    className={`absolute top-1 h-6 rounded-md border ${
                      isUrgent ? "border-amber-400/70 shadow-[0_0_12px_rgba(251,191,36,0.35)]" : "border-white/15"
                    } overflow-hidden`}
                    style={{
                      left: `${leftPct}%`,
                      width: `${widthPct}%`,
                      background: `color-mix(in srgb, ${colorVar} 18%, transparent)`,
                    }}
                    title={
                      isOngoing
                        ? `${p.title}\n상시 · 시작 ${p.startDate ?? "?"} (${elapsedDays}일째)\n진행률 ${p.progress}%`
                        : `${p.title}\n시작 ${p.startDate ?? "?"} → 마감 ${p.deadline}\n진행률 ${p.progress}%`
                    }
                  >
                    <div
                      className="h-full"
                      style={{
                        width: `${p.progress}%`,
                        background: isUrgent ? "oklch(0.82 0.17 85)" : colorVar,
                        opacity: 0.85,
                      }}
                    />
                    {/* Clipped-left indicator */}
                    {s < rangeStart && (
                      <span className="pointer-events-none absolute inset-y-0 left-0 w-3 bg-gradient-to-r from-white/40 to-transparent" aria-hidden />
                    )}
                    {/* 상시: 우측 페이드아웃 (끝이 열려 있음을 표현). 일반 클립에도 사용. */}
                    {(isOngoing || e > rangeEnd) && (
                      <span
                        className="pointer-events-none absolute inset-y-0 right-0 w-8 bg-gradient-to-l from-black/60 to-transparent"
                        aria-hidden
                      />
                    )}
                    <span className="absolute inset-0 flex items-center justify-between px-2 font-mono text-[12px] font-bold text-white/95">
                      <span>{p.progress}%</span>
                      <span className={isUrgent ? "text-amber-200" : "text-white/80"}>
                        {isOngoing
                          ? "상시"
                          : diffDays === 0
                            ? "D-day"
                            : diffDays > 0
                              ? `D-${diffDays}`
                              : `D+${Math.abs(diffDays)}`}
                      </span>
                    </span>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}

      {pending.length > 0 && (
        <div className="mt-6">
          <div className="mb-2 text-[12px] font-bold uppercase tracking-wider text-white/50">
            대기 · 일정 미정
          </div>
          <div className="flex flex-wrap gap-2">
            {pending.map((p) => (
              <button
                key={p.id}
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => onOpen(p.id)}
                className="inline-flex items-center gap-1.5 rounded-md border border-white/10 bg-white/[0.03] px-2.5 py-1.5 text-[13px] font-semibold text-white/85 hover:border-white/30 hover:text-white"
              >
                <span
                  className="h-1.5 w-1.5 rounded-full"
                  style={{
                    backgroundColor: DEPT_COLOR[p.department],
                    boxShadow: `0 0 6px ${DEPT_COLOR[p.department]}`,
                  }}
                />
                {p.title}
              </button>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
