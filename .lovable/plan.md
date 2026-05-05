## 일정 페이지 개선 계획

### 1. 상단 KPI "휴가 인원" 대체

단순 합계는 의미가 적어, **"오늘 휴가"** 지표로 바꿈 — 오늘 날짜에 연차/시차 중인 인원 수를 표시 (실시간 가용 인력 파악에 유용).

- `src/routes/schedule.tsx`의 `kpi` 계산에 `todayLeave` 추가 (오늘 날짜의 leaves 카운트)
- KPI 바에서 `휴가 인원` → `오늘 휴가`로 라벨 + 값 교체
- 다른 안 원하시면 단순 제거도 가능 (1개 지표 삭제)

### 2. 시차 시간 슬롯 단순화

`src/lib/mockSchedule.ts`의 `TIME_SLOTS`를 09:00~18:00 정시 10개로 변경:

```ts
export const TIME_SLOTS = ["09:00","10:00","11:00","12:00","13:00","14:00","15:00","16:00","17:00","18:00"];
```

`AddLeaveModal`의 기본값도 `startTime="09:00"`, `endTime="18:00"`으로 조정.

### 3. 연차/시차 사유 표시

현재 DB에는 `reason`이 저장되지만 달력 상세 패널에 노출되지 않음. 추가:

- `src/components/schedule/EventChip.tsx`의 `CalendarEvent` 인터페이스에 `reason?: string | null` 추가
- `schedule.tsx`에서 leave → event 매핑 시 `reason: l.reason` 전달
- `DayDetailPanel.tsx` leave 섹션에서 사유가 있으면 두 번째 줄에 회색 텍스트로 표시:
  ```
  김태식  영상   연차
  └ "병원 진료"
  ```
  레이아웃을 한 줄에서 두 줄(flex-col)로 바꿔 사유를 하단에 노출.

### 변경 파일

- `src/routes/schedule.tsx` — KPI 변경, leave→event에 reason 포함
- `src/lib/mockSchedule.ts` — TIME_SLOTS 축소
- `src/components/schedule/AddLeaveModal.tsx` — 기본 시간 09:00/18:00
- `src/components/schedule/EventChip.tsx` — CalendarEvent에 reason 추가
- `src/components/schedule/DayDetailPanel.tsx` — leave 항목에 사유 표시

### 질문

KPI "휴가 인원"을 **(A) "오늘 휴가"로 교체** 할지, **(B) 그냥 제거** 할지 알려주세요. 기본은 (A)로 진행. -> 오늘 휴가로 교체.