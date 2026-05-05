# 일정 관리 개선 계획

## 1. 연차 유형 변경 (연차 + 시차)

**DB 스키마 변경 (마이그레이션)**

- `leaves` 테이블에 컬럼 추가:
  - `start_time TEXT NULL` (예: "10:00")
  - `end_time TEXT NULL` (예: "19:00")
- `leave_type` 값 정의: `"연차" | "시차"` (기존 "전일/반차/병가" 데이터는 일괄 "연차"로 마이그레이션)

**타입 / 시드 데이터**

- `mockSchedule.ts`: `LeaveType = "연차" | "시차"` 로 단순화
- `Leave` 인터페이스에 `start_time?`, `end_time?` 추가
- `buildSeedLeaves()` 도 새 유형으로 재생성

**연차 등록 모달 (`AddLeaveModal.tsx`)**

- 라디오: ● 연차  ● 시차
- "시차" 선택 시 두 개의 시간 드롭다운 등장 (시작/종료, 30분 단위, 06:00~22:00)
- 검증: 시차는 start < end 필수
- 캘린더 표시: 연차는 "🏖 이름", 시차는 "⏱ 이름 10:00-19:00"

## 2. 프로젝트 클릭 → Window B 자동 오픈 (Detail 동기화)

**공용 헬퍼 사용**

- `src/lib/sync.ts`의 `openDetailWindow(id)` + `getSyncChannel()` 패턴을 그대로 재사용
(현재 `index.tsx` `handleOpen`이 쓰는 것과 동일 동작)
- 신규 `src/lib/openProjectWindow.ts`로 추출하거나 sync.ts에 헬퍼 함수 한 개 추가
→ 일정 관리, 위험 알림, 활동 피드 등 어디서나 동일 호출

**적용 위치**

- `EventChip` (kind="deadline") 클릭 시 → `openProjectWindow(projectId)`
- `DayDetailPanel`의 마감 카드 클릭 → 기존 `navigate(/detail)` 대신 `openProjectWindow`
- `RiskBanner`의 모든 카드 → 프로젝트가 연관된 항목이면 클릭 가능 카드로 전환, `openProjectWindow` 호출

**동기화 (양방향)**

- 일정 페이지도 `getSyncChannel()` 구독 → `PROJECT_UPDATE` 메시지 수신 시 localStorage + state 갱신
- 결과: Detail 창에서 상태/마감일 변경 → 캘린더 즉시 반영
- `REQUEST_PROJECT` 메시지가 오면 일정 페이지 데이터로 응답

## 3. 마일스톤 이벤트 제거

- `EventChip`의 `EventKind`에서 `"milestone"` 제거 + 관련 분기 삭제
- `DayDetailPanel`에서 "마일스톤" 섹션 제거
- `ScheduleFilters`에서 마일스톤 토글 제거
- 정렬 order에서 milestone 제거

## 4. 위험 알림 (10건 이상 누적 시 UX)

**현재 문제점**

- `RiskBanner`가 항상 펼쳐져 있고 그리드로 12건까지 노출 → 화면 점유 큼

**개선안 (단계적 표현)**


| 건수   | 표시 방식                                                                          |
| ---- | ------------------------------------------------------------------------------ |
| 0건   | 초록색 한 줄 "위험 요소 없음" (현재 유지)                                                     |
| 1–4건 | 카드 그리드 펼침 (현재)                                                                 |
| 5–9건 | 카드 그리드 + "전체 보기" 토글 (기본 4건만 노출)                                                |
| 10건+ | **컴팩트 헤더 모드**: "⚠ 위험 알림 N건 — 지연 X · 임박 Y · PM충돌 Z · 동시연차 W" 한 줄로 축소 + [펼치기] 버튼 |


**펼친 상태 (10건+)**

- 우측에 슬라이드되는 사이드 시트(Sheet) 또는 모달로 전환
- 카테고리 탭: [전체] [지연] [임박] [PM 충돌] [동시 연차]
- 카테고리별 카운트 뱃지 + 검색 + 정렬(심각도/날짜)
- 가상 스크롤 없이도 100건 정도까지 무난

**우선순위 정렬 규칙**

1. 지연(red) → 2. PM 부재+마감(red) → 3. 임박 D-3(orange) → 4. PM 다중마감(amber) → 5. 동시 연차(blue)

- 최대 노출 한계 제거 (현재 12건 컷 → 사이드시트로 모두 표시)

## 5. 폰트 사이즈 +0.5~1pt 상향

전체적으로 한 단계씩 키움 (Tailwind 클래스 매핑):


| 현재             | 변경            |
| -------------- | ------------- |
| `text-[10px]`  | `text-[11px]` |
| `text-[11px]`  | `text-[12px]` |
| `text-xs` (12) | `text-[13px]` |
| `text-sm` (14) | `text-[15px]` |
| `text-base` 이상 | 유지            |


대상 파일: `EventChip.tsx`, `RiskBanner.tsx`, `DayDetailPanel.tsx`, `ScheduleFilters.tsx`, `AddLeaveModal.tsx`, `schedule.tsx`(요일 헤더, 날짜 숫자 등).
주의: 셀당 노출 가능 이벤트 수가 줄어들 수 있으므로 `visible.slice(0, 3)` → `slice(0, 2)`로 조정하고 `+N건 더보기`로 흡수.

## 6. 일정 ↔ 프로젝트 데이터 동기화

- 현재: 일정 페이지는 마운트 시 1회 localStorage 읽음
- 변경:
  - `getSyncChannel()` 구독으로 Detail 창의 변경을 실시간 수신 → projects state 업데이트
  - localStorage `storage` 이벤트 리스너 추가 (다른 탭 변경 반영)
  - 프로젝트 수정 → 마감일/PM/상태 변경이 캘린더와 위험알림에 즉시 반영

## 7. 추가로 발견한 부족한 부분 (제안)

1. **일정 페이지 KPI 바**: 상단에 "이달 마감 N건 · 진행중 · 지연 · 휴가 인원" 미니 KPI (Header 아래, RiskBanner 위)
2. **휴가 편집/삭제**: 현재 등록만 가능. `DayDetailPanel`의 휴가 항목에 호버 시 ✕ 버튼 (DB delete)
3. **연속 휴가 입력**: 모달에 "기간으로 등록" 옵션 (시작~종료일 → 평일만 일괄 INSERT)
4. **부서/멤버 범례(Legend)**: 캘린더 상단에 부서별 색상 칩 (현재 색만 점으로 표시되어 의미 추측 어려움)
5. **주말/공휴일 시각 강조**: 휴일 셀 배경에 살짝 붉은 톤 (현재는 칩만 표시)
6. **빈 상태 안내**: 휴가도 마감도 없는 달에서 빈 화면 → "등록된 일정 없음" 가이드 메시지
7. **검색 → 캘린더 하이라이트**: 검색 매치되는 셀에 연한 글로우 (현재는 필터링만)
8. **반응형**: 1280px 미만에서 사이드 필터를 토글로 숨겨 캘린더 영역 확보

(위 7개 항목은 본 라운드에 모두 넣지 않고, **1·2·5만** 같이 처리하고 나머지는 다음 라운드에 점진 추가 권장)

## 작업 파일 목록

**수정**

- `supabase/migrations/*` (신규 마이그레이션 1개)
- `src/lib/mockSchedule.ts` — 타입, 시드
- `src/lib/sync.ts` — `openProjectWindow` 헬퍼 노출
- `src/components/schedule/AddLeaveModal.tsx` — 유형/시간 UI
- `src/components/schedule/EventChip.tsx` — 마일스톤 제거, 시차 표시, 폰트, 클릭 핸들러
- `src/components/schedule/RiskBanner.tsx` — 단계적 표현 + 사이드시트 + 클릭 시 Window B
- `src/components/schedule/DayDetailPanel.tsx` — 마일스톤 섹션 제거, 폰트, 휴가 삭제, 마감 클릭 시 Window B
- `src/components/schedule/ScheduleFilters.tsx` — 마일스톤 토글 제거, 폰트
- `src/routes/schedule.tsx` — sync 구독, 마일스톤 분기 제거, KPI 바, 폰트, 휴일 셀 강조

**신규**

- `src/components/schedule/RiskSheet.tsx` — 10건+ 시 사이드 시트
- `src/components/schedule/ScheduleKpiBar.tsx` — 상단 미니 KPI

## 확인 필요

위 계획대로 진행해도 될까요? 특히:

- (a) 시차 시간은 30분 단위 06:00~22:00 범위로 OK? -> ok
- (b) 위험 알림 10건+ 시 **사이드 시트로 펼침** 방식이 적절한지, 아니면 인라인 가로 스크롤 캐러셀이 좋은지 -> 사이드 시트로 펼침 방식으로 진행.
- (c) 추가 제안 7개 중 어디까지 이번 라운드에 포함할지 (기본은 1·2·5) -> 2,3,4,5,6,7 이렇게 진행해줘.