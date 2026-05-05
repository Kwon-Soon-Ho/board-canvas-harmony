import { useMemo } from "react";

const NAV = ["프로젝트", "일정 관리", "인사이트", "팀 관리"];

export function Header() {
  const todayStr = useMemo(() => {
    const d = new Date();
    const days = ["일", "월", "화", "수", "목", "금", "토"];
    return `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일 (${days[d.getDay()]})`;
  }, []);

  return (
    <header className="sticky top-0 z-50 border-b border-white/10 bg-black">
      <div className="mx-auto flex h-16 max-w-[1920px] items-center justify-between px-12">
        <div className="flex items-center gap-10">
          <button
            type="button"
            onClick={() => { window.location.href = "/"; }}
            className="flex items-center gap-2.5 rounded-md px-1 py-1 -mx-1 hover:bg-white/5 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
            aria-label="홈으로 이동"
            title="홈으로 이동"
          >
            <div
              className="h-2 w-2 rounded-full bg-foreground"
              style={{ boxShadow: "0 0 8px rgba(255,255,255,0.7)" }}
            />
            <span className="text-[18px] font-semibold tracking-tight text-foreground">
              Design Team
            </span>
          </button>
          <nav className="flex items-center gap-1">
            {NAV.map((item, i) => (
              <button
                key={item}
                className={`rounded-md px-4 py-2 text-[16px] transition-colors ${
                  i === 0
                    ? "bg-gradient-to-r from-[#0d3b2f] to-[#147058] text-white font-medium shadow-lg shadow-teal-900/20"
                    : "bg-[#1A1A1A] text-gray-400 hover:bg-[#222] hover:text-foreground"
                }`}
              >
                {item}
              </button>
            ))}
          </nav>
        </div>
        <div className="text-[15px] font-bold text-gray-400 bg-white/5 px-4 py-2 rounded-lg border border-white/10">
          {todayStr}
        </div>
      </div>
    </header>
  );
}
