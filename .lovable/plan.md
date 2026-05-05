## 통합 정합성 + 정렬 + 용어 통일

### 1. 팀 표 열 정렬 수정
부서마다 데이터 길이가 달라 컬럼이 어긋남. `<table>`에 `<colgroup>`을 추가해 모든 부서 표가 동일한 폭을 사용하도록 강제.
- 부서 80 / 직급 120 / 역할 80 / 이름 120 / 연락처 160 / 진행·대기·완료·이슈 80 / 이번달연차 120
- 편집 모드 좌(8)·우(10) 핸들 컬럼 포함

### 2. 용어/위치 통일
- 일정·팀 페이지 모두 KPI 라벨 **"오늘 휴가"** 로 통일
- 팀 관리의 KPI를 일정관리와 같은 **툴바 중앙**으로 이동 (제목은 좌측 단독)

### 3. 데이터 싱크 일원화 (정적 → DB)
신규 훅 `src/lib/useLiveTeam.ts`:
- `team_members` 로드 + `MEMBER_UPDATE`/`MEMBER_RENAME` 구독
- `{ members, deptOf, rankOf, roleOf, byDept }` 반환

다음 파일이 정적 `TEAM_DATA`/`ALL_MEMBERS` 대신 이 훅을 사용:
- `CreateProjectModal.tsx` — PM/멤버 셀렉트
- `AddLeaveModal.tsx` — 팀원 드롭다운, 부서 매핑
- `TeamWorkloadBar.tsx` — 워크로드 계산
- `routes/detail.tsx` — 담당자 셀렉트 두 곳 (Task/Issue, ProjectEditModal)

→ 팀 관리에서 추가/수정/직급변경/부서이동이 즉시 다른 화면에 반영.

### 4. 역할 표시 연동
- `MemberDrawer` 내 PM 텍스트 옆에 팀장/셀장 색배지
- 일정 상세 leave 항목에 role 한 줄 추가

### 5. 콘솔 에러 수정
- **schedule 달력 셀**: outer `<button>` → `<div role="button" tabIndex={0} onKeyDown>` 로 변경 (EventChip 내부 `<button>` 유지)
- **team `<tbody>` 안 div**: `<DndContext>`를 `<table>` 바깥으로 이동, `<SortableContext>`만 `<tbody>` 안에 유지 (DndContext의 hidden helper div가 tbody 직속 자식이 되지 않도록)

### 변경 파일
- 신규: `src/lib/useLiveTeam.ts`
- 수정: `src/routes/team.tsx`, `src/routes/schedule.tsx`, `src/routes/detail.tsx`, `src/components/control/CreateProjectModal.tsx`, `src/components/control/TeamWorkloadBar.tsx`, `src/components/schedule/AddLeaveModal.tsx`, `src/components/schedule/DayDetailPanel.tsx`, `src/components/schedule/EventChip.tsx`, `src/components/team/MemberDrawer.tsx`, `src/lib/teamStats.ts`
