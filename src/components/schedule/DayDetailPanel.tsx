import { X, ExternalLink } from "lucide-react";
import { useNavigate } from "@tanstack/react-router";
import type { CalendarEvent } from "./EventChip";
import { DEPT_COLOR } from "@/lib/mockProjects";
import { EventChip } from "./EventChip";

interface Props {
  date: string;
  events: CalendarEvent[];
  onClose: () => void;
  onAddLeave: () => void;
}

export function DayDetailPanel({ date, events, onClose, onAddLeave }: Props) {
  const navigate = useNavigate();
  const d = new Date(date);
  const days = ["일", "월", "화", "수", "목", "금", "토"];
  const heading = `${d.getMonth() + 1}월 ${d.getDate()}일 (${days[d.getDay()]})`;

  const grouped = {
    holiday: events.filter((e) => e.kind === "holiday"),
    deadline: events.filter((e) => e.kind === "deadline"),
    milestone: events.filter((e) => e.kind === "milestone"),
    leave: events.filter((e) => e.kind === "leave"),
  };

  return (
    <aside className="w-80 shrink-0 border-l border-white/10 bg-[#0a0a0a] flex flex-col">
      <div className="flex items-center justify-between p-4 border-b border-white/10">
        <div>
          <p className="text-[11px] uppercase tracking-wider text-gray-500">선택한 날짜</p>
          <h3 className="text-base font-semibold text-foreground mt-0.5">{heading}</h3>
        </div>
        <button
          onClick={onClose}
          className="rounded-md p-1.5 text-gray-400 hover:bg-white/10 hover:text-foreground"
          aria-label="닫기"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-5">
        {events.length === 0 && (
          <p className="text-xs text-gray-500 text-center py-12">이 날에는 일정이 없습니다.</p>
        )}

        {grouped.holiday.length > 0 && (
          <Section title="공휴일">
            {grouped.holiday.map((e) => (
              <div key={e.id} className="text-xs text-red-300">
                {e.title}
              </div>
            ))}
          </Section>
        )}

        {grouped.deadline.length > 0 && (
          <Section title={`프로젝트 마감 · ${grouped.deadline.length}`}>
            {grouped.deadline.map((e) => (
              <button
                key={e.id}
                onClick={() => e.projectId && navigate({ to: "/detail", search: { id: e.projectId } as any })}
                className="w-full flex items-start gap-2 p-2 rounded-md bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 text-left transition-colors"
              >
                <span
                  className="mt-1 h-2 w-2 rounded-full shrink-0"
                  style={{
                    backgroundColor: e.department ? DEPT_COLOR[e.department] : "#888",
                    boxShadow: `0 0 4px ${e.department ? DEPT_COLOR[e.department] : "#888"}`,
                  }}
                />
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium text-foreground truncate">{e.title}</p>
                  <p className="text-[11px] text-gray-400 mt-0.5">
                    {e.department} · PM {e.pm} · {e.status}
                    {e.dDay !== undefined && (
                      <span
                        className={`ml-1.5 ${
                          e.dDay < 0 ? "text-red-400" : e.dDay <= 7 ? "text-orange-400" : "text-gray-500"
                        }`}
                      >
                        D{e.dDay >= 0 ? "-" : "+"}
                        {Math.abs(e.dDay)}
                      </span>
                    )}
                  </p>
                </div>
                <ExternalLink className="h-3 w-3 text-gray-500 mt-1 shrink-0" />
              </button>
            ))}
          </Section>
        )}

        {grouped.milestone.length > 0 && (
          <Section title={`마일스톤 · ${grouped.milestone.length}`}>
            {grouped.milestone.map((e) => (
              <EventChip key={e.id} event={e} />
            ))}
          </Section>
        )}

        {grouped.leave.length > 0 && (
          <Section title={`연차/휴가 · ${grouped.leave.length}`}>
            {grouped.leave.map((e) => (
              <div
                key={e.id}
                className="flex items-center justify-between p-2 rounded-md bg-white/[0.04] border border-white/10"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span
                    className="h-1.5 w-1.5 rounded-full shrink-0"
                    style={{ backgroundColor: e.department ? DEPT_COLOR[e.department] : "#888" }}
                  />
                  <span className="text-xs text-foreground truncate">{e.member}</span>
                  <span className="text-[10px] text-gray-500">{e.department}</span>
                </div>
                <span className="text-[10px] text-gray-400 shrink-0">{e.leaveType}</span>
              </div>
            ))}
          </Section>
        )}
      </div>

      <div className="p-4 border-t border-white/10">
        <button
          onClick={onAddLeave}
          className="w-full px-3 py-2 rounded-md bg-gradient-to-r from-[#0d3b2f] to-[#147058] text-white text-xs font-medium hover:opacity-90"
        >
          + 이 날짜에 연차 추가
        </button>
      </div>
    </aside>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-wider text-gray-500 mb-2">{title}</p>
      <div className="space-y-1.5">{children}</div>
    </div>
  );
}
