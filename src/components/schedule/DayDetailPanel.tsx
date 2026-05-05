import { X, ExternalLink, Trash2 } from "lucide-react";
import { toast } from "sonner";
import type { CalendarEvent } from "./EventChip";
import { DEPT_COLOR } from "@/lib/mockProjects";
import { openProjectWindow } from "@/lib/sync";
import { supabase } from "@/integrations/supabase/client";

interface Props {
  date: string;
  events: CalendarEvent[];
  onClose: () => void;
  onAddLeave: () => void;
  onLeaveDeleted: () => void;
}

export function DayDetailPanel({ date, events, onClose, onAddLeave, onLeaveDeleted }: Props) {
  const d = new Date(date);
  const days = ["일", "월", "화", "수", "목", "금", "토"];
  const heading = `${d.getMonth() + 1}월 ${d.getDate()}일 (${days[d.getDay()]})`;

  const grouped = {
    holiday: events.filter((e) => e.kind === "holiday"),
    deadline: events.filter((e) => e.kind === "deadline"),
    leave: events.filter((e) => e.kind === "leave"),
  };

  const handleDeleteLeave = async (id: string) => {
    // event id is "l-<uuid>"
    const dbId = id.startsWith("l-") ? id.slice(2) : id;
    const { error } = await supabase.from("leaves").delete().eq("id", dbId);
    if (error) {
      toast.error("삭제 실패: " + error.message);
      return;
    }
    toast.success("삭제됨");
    onLeaveDeleted();
  };

  return (
    <aside className="w-80 shrink-0 border-l border-white/10 bg-[#0a0a0a] flex flex-col">
      <div className="flex items-center justify-between p-4 border-b border-white/10">
        <div>
          <p className="text-[12px] uppercase tracking-wider text-gray-500">선택한 날짜</p>
          <h3 className="text-[17px] font-semibold text-foreground mt-0.5">{heading}</h3>
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
          <p className="text-[13px] text-gray-500 text-center py-12">이 날에는 일정이 없습니다.</p>
        )}

        {grouped.holiday.length > 0 && (
          <Section title="공휴일">
            {grouped.holiday.map((e) => (
              <div key={e.id} className="text-[13px] text-red-300">
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
                onClick={() => e.projectId && openProjectWindow(e.projectId)}
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
                  <p className="text-[13px] font-medium text-foreground truncate">{e.title}</p>
                  <p className="text-[12px] text-gray-400 mt-0.5">
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

        {grouped.leave.length > 0 && (
          <Section title={`연차/시차 · ${grouped.leave.length}`}>
            {grouped.leave.map((e) => (
              <div
                key={e.id}
                className="group flex items-center justify-between p-2 rounded-md bg-white/[0.04] border border-white/10"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span
                    className="h-1.5 w-1.5 rounded-full shrink-0"
                    style={{ backgroundColor: e.department ? DEPT_COLOR[e.department] : "#888" }}
                  />
                  <span className="text-[13px] text-foreground truncate">{e.member}</span>
                  <span className="text-[11px] text-gray-500">{e.department}</span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-[11px] text-gray-400">
                    {e.leaveType === "시차"
                      ? `${e.startTime ?? ""}-${e.endTime ?? ""}`
                      : e.leaveType}
                  </span>
                  <button
                    onClick={() => handleDeleteLeave(e.id)}
                    className="opacity-0 group-hover:opacity-100 text-gray-500 hover:text-red-400 transition-opacity"
                    aria-label="삭제"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>
              </div>
            ))}
          </Section>
        )}
      </div>

      <div className="p-4 border-t border-white/10">
        <button
          onClick={onAddLeave}
          className="w-full px-3 py-2 rounded-md bg-gradient-to-r from-[#0d3b2f] to-[#147058] text-white text-[13px] font-medium hover:opacity-90"
        >
          + 이 날짜에 연차/시차 추가
        </button>
      </div>
    </aside>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-[11px] uppercase tracking-wider text-gray-500 mb-2">{title}</p>
      <div className="space-y-1.5">{children}</div>
    </div>
  );
}
