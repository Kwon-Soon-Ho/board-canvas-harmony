import { useMemo } from "react";
import { Link, useRouterState } from "@tanstack/react-router";

const NAV: { label: string; to: string; enabled: boolean }[] = [
  { label: "프로젝트", to: "/", enabled: true },
  { label: "일정 관리", to: "/schedule", enabled: true },
  { label: "인사이트", to: "/insights", enabled: false },
  { label: "팀 관리", to: "/team", enabled: true },
];

export function Header() {
  const todayStr = useMemo(() => {
    const d = new Date();
    const days = ["일", "월", "화", "수", "목", "금", "토"];
    return `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일 (${days[d.getDay()]})`;
  }, []);

  const pathname = useRouterState({ select: (s) => s.location.pathname });

  const isActive = (to: string) => {
    if (to === "/") return pathname === "/" || pathname.startsWith("/detail");
    return pathname === to || pathname.startsWith(to + "/");
  };

  return (
    <header className="sticky top-0 z-50 border-b border-white/10 bg-black">
      <div className="mx-auto flex h-16 max-w-[1920px] items-center justify-between px-12">
        <div className="flex items-center gap-10">
          <Link
            to="/"
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
          </Link>
          <nav className="flex items-center gap-1">
            {NAV.map((item) => {
              const active = item.enabled && isActive(item.to);
              const baseCls =
                "rounded-md px-4 py-2 text-[16px] transition-colors";
              const activeCls =
                "bg-gradient-to-r from-[#0d3b2f] to-[#147058] text-white font-medium shadow-lg shadow-teal-900/20";
              const idleCls =
                "bg-[#1A1A1A] text-gray-400 hover:bg-[#222] hover:text-foreground";
              const disabledCls =
                "bg-[#1A1A1A] text-gray-600 cursor-not-allowed opacity-60";

              if (!item.enabled) {
                return (
                  <button
                    key={item.label}
                    type="button"
                    disabled
                    className={`${baseCls} ${disabledCls}`}
                    title="준비 중"
                  >
                    {item.label}
                  </button>
                );
              }

              return (
                <Link
                  key={item.label}
                  to={item.to}
                  className={`${baseCls} ${active ? activeCls : idleCls}`}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>
        <div className="text-[15px] font-bold text-gray-400 bg-white/5 px-4 py-2 rounded-lg border border-white/10">
          {todayStr}
        </div>
      </div>
    </header>
  );
}
