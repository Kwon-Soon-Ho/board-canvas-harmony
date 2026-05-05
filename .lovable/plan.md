# 팀 관리 페이지 개편 계획

## 1. UI 단순화

### 좌측 필터 (`TeamFilters.tsx`)
- 제거: **가동률 슬라이더**, `workloadMin` 상태
- 유지: 검색, 부서, 직급, "오늘 연차" 토글
- `DEFAULT_TEAM_FILTERS` 에서 `workloadMin` 제거

### 뷰 모드 (`routes/team.tsx`)
- 제거: **카드 그리드** (`MemberCard.tsx` 파일도 삭제)
- 유지: **부서별(tree)** + **표(table)** — 기본값을 `tree`로 변경
- 상단 ViewSwitcher 버튼: 카드 버튼 삭제, "부서" / "표" 두개만 노출
- KPI 바에서 "평균 가동률", "과부하" 항목 제거 → "총원", "오늘 연차"만 유지
- "업무중인 프로젝트 수" 합계를 KPI 자리에 추가 (예: `진행중 프로젝트 합계: N건`)

### 표 뷰 재설계
- **부서별 그룹** (헤더 행: 부서명 + 인원수)
- 그룹 내 정렬: **직급순(수석→책임→선임→연구원)**, 동일 직급 내에서는 이름 가나다순
- 컬럼 순서:

```text
부서 | 직급 | 이름 | 연락처 | 진행 | 대기 | 완료 | 이슈 | 이번달 연차
```

- "가동률" 컬럼/색상 표기 제거. 진행 컬럼만 강조 (예: 0건은 회색, 4건↑은 amber)
- 행 클릭 시 기존 `MemberDrawer` 오픈 유지

### 부서 뷰
- 그룹 헤더의 "평균 가동률 N%" 문구 제거 → "진행중 프로젝트 합계 N건"으로 교체
- 카드 컴포넌트 대신 **간이 표 행**으로 재사용 (위 표와 동일한 컬럼)

### 멤버 드로어 (`MemberDrawer.tsx`)
- "가동률 게이지" 섹션 삭제
- 상단 프로필 영역에 **편집 가능한 필드** 추가 (다음 항목 참고)

---

## 2. 팀원 정보 편집 + 동기화

### 새 DB 테이블 (Lovable Cloud 마이그레이션)

```sql
create table public.team_members (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,           -- 현재 이름 (정식 키)
  original_name text not null unique,  -- 시드 이름 (TEAM_DATA 매핑용 불변키)
  rank text not null,
  department text not null,
  phone text,
  email text,
  updated_at timestamptz not null default now()
);
-- RLS: 공개 select/insert/update/delete (다른 테이블과 동일 패턴)
```

- 첫 진입 시 `TEAM_DATA` 시드를 upsert (없을 때만). `original_name`으로 시드/실제 이름 분리해 안전하게 매핑.
- 페이지 마운트 시 `team_members` 로드해서 화면 데이터 소스로 사용 (TEAM_DATA는 fallback).

### 편집 가능한 필드 (드로어 내 inline edit)
- 이름, 직급, 부서, 연락처, 이메일
- "저장" 버튼 → Supabase update + 동기화 브로드캐스트

### 이름/부서 변경 시 일괄 동기화 (가장 위험한 부분)

새 헬퍼 `src/lib/teamSync.ts` 신설:

```text
renameMember(oldName, newName)
  1. supabase.team_members.update name=newName
  2. supabase.leaves.update member_name=newName where member_name=oldName
  3. localStorage projects 스토어 갱신:
       - p.pm === oldName  → newName
       - p.members 배열 내 oldName → newName
       - p.tasks[].assignee, p.issues[].assignee 동일 처리
  4. sync 채널 브로드캐스트:
       - 변경된 각 project: PROJECT_UPDATE
       - MEMBER_RENAME { oldName, newName } (신규 메시지 타입)
  5. 로컬 상태(setProjects, setLeaves) 갱신

changeDepartment(name, newDept)
  1. supabase.team_members.update
  2. (프로젝트의 department는 프로젝트 자체 속성이라 영향 X)
  3. 로컬 MEMBER_DEPT 매핑은 derived map에서 team_members 우선 사용
```

연락처/이메일/직급 변경은 `team_members` 한 곳만 업데이트 후 브로드캐스트.

### 다른 페이지 수신 처리
- `routes/index.tsx`(프로젝트), `routes/schedule.tsx` 의 sync 핸들러에 `MEMBER_RENAME` 케이스 추가 → 자체 보유 projects/leaves 상태에 동일한 치환 수행
- `MEMBER_DEPT` 도 런타임 override 가능하도록 `getMemberDept(name)` 헬퍼 도입 (team_members 캐시 우선, 없으면 정적 맵)

### sync.ts 변경
- 메시지 타입 union에 `MEMBER_RENAME`, `MEMBER_UPDATE` 추가
- `openProjectWindow` 등 기존 API는 변경 없음

---

## 3. 표시 데이터 정리 (`teamStats.ts`)
- `workload`, `workloadColor` 필드 삭제 (사용처 모두 제거됨)
- `buildAllStats` 시그니처 단순화 — 부서 평균/PM 가중치 계산 로직 제거
- `MemberStats` 에 `phone`, `email` 추가 (team_members 데이터에서 주입)
- 정렬 헬퍼 추가:

```text
sortByRankThenName(members)  // 수석→연구원, 동일 직급 가나다
groupByDept(members)         // Record<Department, MemberStats[]>
```

---

## 4. 무결성 체크리스트 (코드 작성 시 확인)
- 이름 변경 시 동일 이름 중복 검사 (DB unique 제약 외에 UI 사전 체크)
- 빈 문자열/공백 trim 후 저장
- 연락처는 자유 입력 + 저장 시 `000-0000-0000` 포맷 자동 변환 (정규식)
- 이름 변경 트랜잭션 중 실패 시 롤백 토스트 + 부분 적용 안내
- TEAM_DATA(정적) → team_members(동적) 전환 시, 신규 페이지(프로젝트/일정)에서도 hydrate 후 렌더 보장 (없으면 시드 fallback)
- routeTree, types.ts는 자동 생성이므로 수동 편집 금지

---

## 5. 작업 순서 (구현 단계)
1. 마이그레이션: `team_members` 테이블 + RLS + 시드 함수
2. `src/lib/teamSync.ts` + `getMemberDept` 헬퍼 신설
3. `teamStats.ts` 정리 (workload 제거, phone/email 추가, 정렬 헬퍼)
4. `TeamFilters.tsx` (가동률 제거)
5. `routes/team.tsx` 개편 (뷰 2개, 표/부서 그룹 재구성, KPI 정리)
6. `MemberDrawer.tsx` 편집 모드 추가
7. `MemberCard.tsx` 삭제
8. `routes/index.tsx`, `routes/schedule.tsx` sync 수신 핸들러 확장
9. 동작 검증: 이름 변경 → 프로젝트/일정 동시 반영, 연차 추가/삭제 정상, 위험알림 정상
