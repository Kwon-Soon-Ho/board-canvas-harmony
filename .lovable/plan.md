## 일정 관리 (Schedule) 페이지 설계 제안

상단 GNB의 "일정 관리"를 활성화하여 **팀원 연차 + 프로젝트 마감 + 마일스톤**을 한 화면에서 보는 통합 캘린더를 만듭니다.

---

## 1. 라우트 & 진입

- 새 라우트: `src/routes/schedule.tsx` (`/schedule`)
- `Header.tsx`에서 "일정 관리" 버튼을 `<Link to="/schedule">`로 전환, 현재 라우트에 따라 액티브 스타일 자동 적용
- 로고/홈 버튼은 그대로 `/` (프로젝트 보드)

---

## 2. 화면 레이아웃 (3영역)

```text
┌─────────────────────────────────────────────────────────────┐
│  [Header GNB]                                                │
├──────────────┬──────────────────────────────────┬───────────┤
│  Left Sidebar│   Calendar (Month / Week / Day)  │  Right    │
│              │                                  │  Detail   │
│  • Filters   │   - 프로젝트 마감 (색상=부서)     │  Panel    │
│  • Legend    │   - 연차/반차 (회색 줄무늬 배경)  │           │
│  • Mini cal  │   - 마일스톤 (별 아이콘)          │  (날짜    │
│  • This week │   - "+N more" 오버플로우          │   클릭 시)│
│              │                                  │           │
└──────────────┴──────────────────────────────────┴───────────┘
```

레퍼런스(첨부 이미지) 차용 포인트:
- **이미지 1 (SchedulePress):** 상단 필터 칩 + 우측 미배정 패널
- **이미지 2 (Arion):** Month/Week/Day 토글 + 날짜 클릭 시 우측 디테일 팝오버
- **이미지 3 (Task board):** 그룹화·필터·"Today" 버튼 패턴
- **이미지 4 (Distribution):** 다중 카테고리 필터 칩과 "Reset all filters", 셀 안 카드형 이벤트 + 클릭 시 그날 전체 펼치기 모달

---

## 3. 캘린더 표시 항목 (이벤트 타입)

| 타입 | 시각화 | 데이터 소스 |
|---|---|---|
| **프로젝트 마감 (Deadline)** | 색칩 막대 (부서 색) + 🔴 D-7 이내 빨강 강조 | `MOCK_PROJECTS[].deadline` |
| **프로젝트 시작** | 점선 외곽선 칩 | `startDate` |
| **마일스톤** | ⭐ 아이콘 + 짧은 라벨 | (신규) `project.milestones[]` |
| **연차 (전일)** | 셀 배경 회색 빗금 + 인물 이니셜 뱃지 | (신규) `LEAVES` 목 |
| **반차 (오전/오후)** | 셀 상단/하단 절반 빗금 | 동일 |
| **공휴일** | 빨강 라벨 | 정적 한국 공휴일 목록 |
| **상시 프로젝트** | 표시 안 함 (필터에서 별도) | `deadline === "상시"` |

이벤트는 부서 컬러로 통일 (영상/편집/UX/공통). 진행률 100% 완료 건은 옅은 회색 + 취소선.

---

## 4. 필터 시스템 (URL 쿼리 동기화)

좌측 사이드바 + 상단 칩 (이미지 4 패턴):

- **이벤트 종류** (체크박스): 프로젝트 마감 / 마일스톤 / 연차 / 공휴일
- **부서**: 영상 · 편집 · UX · 공통 (색상 도트 포함)
- **상태**: 진행 / 대기 / 완료
- **담당자(PM)**: 멀티 셀렉트 (검색 가능)
- **긴급도**: 마감임박(D-7)만 / 지연된 것만
- **연차 종류**: 전일 / 반일 / 병가
- **검색창**: 프로젝트명·담당자명 통합 검색

선택된 필터는 상단에 **chip 형태로 표시 + ✕ 개별 제거 + "Reset all"** 버튼. 모든 필터는 `?dept=영상,UX&type=deadline,leave` 등 URL 쿼리에 반영 → 공유·북마크 가능.

---

## 5. 보기 모드

- **월(Month)** ⭐기본: 한 달 그리드, 셀당 최대 3개 이벤트 + "+N more"
- **주(Week)**: 시간축 없는 7일 카드 (이벤트 카드가 더 크게 보임)
- **일(Day)**: 그날 모든 이벤트 + 그날 작업 중인 프로젝트 리스트
- **타임라인 통합 보기**: 기존 `TimelineView`와 같은 간트형 (월 단위 가로 스크롤) — "캘린더 vs 간트" 토글

상단 우측: `< 2026년 5월 >` 네비 + **Today** 버튼.

---

## 6. 인터랙션

- **셀 클릭**: 우측 패널에 그날 모든 이벤트 펼침 (이미지 4-2처럼)
- **이벤트 칩 클릭**:
  - 프로젝트 마감 → `/detail?id=...`로 이동
  - 연차 → 인물 카드 미니 팝오버 (그 사람의 이번 분기 연차 잔여일·다음 휴가)
- **호버**: 툴팁으로 풀 제목·PM·D-day
- **드래그**: (Phase 2) 마감일 드래그로 변경 → 확인 모달
- **키보드**: ← → 월 이동, T = Today, 1/2/3 = Month/Week/Day

---

## 7. 추가 화면·기능 (권장)

| 화면 | 가치 | 우선순위 |
|---|---|---|
| **연차 등록 모달** ("+ 연차 추가") | 팀원 휴가를 직접 입력 | High |
| **연차 잔여 현황 위젯** (좌측 하단) | 분기별 사용/잔여 일수 막대 | High |
| **이번 주 위험 알림** 패널 | "5월 8일: 영상팀 3명 동시 연차 + 프로젝트 마감 2건" 자동 감지 | High ⭐ |
| **부서별 캘린더 오버레이 토글** | 영상팀만 / 편집팀만 보기 | Medium |
| **개인 캘린더 ICS export** | 외부 캘린더 연동 | Low |
| **리포팅 모드** (큰 화면용) | 필터·사이드바 숨김 + 폰트 1.4× zoom | Medium (기존 안 재활용) |
| **충돌 감지 배지** | 같은 PM이 같은 날 마감 2건 이상이면 ⚠️ | Medium |

특히 ⭐ **위험 알림**은 디자인팀 운영의 핵심 가치 포인트. "이날은 마감 임박인데 담당자가 휴가" 같은 시나리오를 자동으로 빨강 배너로 띄움.

---

## 8. 데이터 모델 (Phase 1, 목 데이터)

`src/lib/mockSchedule.ts` 신규:

```ts
export type LeaveType = "전일" | "오전반차" | "오후반차" | "병가";
export interface Leave {
  id: string;
  member: string;          // ALL_MEMBERS의 name
  department: Department;
  type: LeaveType;
  date: string;            // YYYY-MM-DD
  reason?: string;
}
export interface Milestone {
  id: string;
  projectId: string;
  date: string;
  label: string;           // "1차 시안 발표" 등
}
export const MOCK_LEAVES: Leave[] = [...];
export const MOCK_MILESTONES: Milestone[] = [...];
export const KR_HOLIDAYS_2026: { date: string; name: string }[] = [...];
```

이벤트 통합 함수:
```ts
getEventsForMonth(year, month, filters): CalendarEvent[]
```
프로젝트 마감/시작은 기존 `MOCK_PROJECTS`에서 derive.

---

## 9. 구현 단계 (Phase)

**Phase 1 (MVP, 이번 작업)**
1. `Header.tsx`를 `Link` 기반으로 전환 + 액티브 표시
2. `src/lib/mockSchedule.ts` 작성 (연차·마일스톤·공휴일 목)
3. `src/routes/schedule.tsx` — Month 뷰 + 필터 사이드바 + URL 쿼리
4. 이벤트 칩 색상 시스템(부서 컬러 재사용)
5. 셀 클릭 우측 디테일 패널
6. "이번 주 위험 알림" 상단 배너

**Phase 2 (다음 라운드)**
- Week / Day 뷰
- 연차 등록 모달 + 잔여 현황 위젯
- 충돌 감지 배지
- 드래그 마감일 변경
- 캘린더 ↔ 기존 타임라인 연동(같은 필터 공유)

**Phase 3**
- ICS export
- 리포팅 모드 통합
- 실제 백엔드 연결(필요 시 Lovable Cloud)

---

## 10. 변경/생성 파일 (Phase 1)

- ✏️ `src/components/control/Header.tsx` — Link 기반 GNB
- 🆕 `src/lib/mockSchedule.ts` — 연차·마일스톤·공휴일 데이터
- 🆕 `src/routes/schedule.tsx` — 캘린더 페이지 (Month 뷰)
- 🆕 `src/components/schedule/CalendarMonth.tsx`
- 🆕 `src/components/schedule/EventChip.tsx`
- 🆕 `src/components/schedule/ScheduleFilters.tsx`
- 🆕 `src/components/schedule/DayDetailPanel.tsx`
- 🆕 `src/components/schedule/RiskBanner.tsx`

---

## 결정 필요 사항

이 플랜으로 가기 전에 몇 가지만 확인하고 싶습니다:

1. **시작 범위**: Phase 1 전체(캘린더+필터+위험알림)를 한 번에 만들까요, 아니면 더 작게 쪼갤까요?
2. **연차 데이터**: 지금은 목 데이터로 시작하지만, 나중에 팀원이 직접 입력하는 폼까지 필요할까요?
3. **위험 알림 규칙**: "동시 연차 N명 이상 + 마감 M건 이상" 같은 임계값은 어떻게 잡을까요? (제안: 동일 부서 30% 이상 휴가 OR 마감 D-3 이내 + 담당 PM 휴가)

답해주시면 Phase 1 구현 모드로 바로 넘어가겠습니다.
