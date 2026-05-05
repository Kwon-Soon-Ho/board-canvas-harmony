# 팀 관리 개편 v2

## 1. UI 단순화
- 표 뷰 토글 제거 → "부서별" 단일 뷰
- KPI에서 "진행중 프로젝트" 제거 (총원 / 오늘 연차만)

## 2. 정렬 규칙
- 부서 순서: **공통 → 영상 → 편집 → UX**
- 같은 부서 내: `sort_order` 컬럼 기반 (직급순으로 시드)
- 직급 라벨 표시: 수석/책임/선임 뒤에 "연구원" 부착 → "수석 연구원", "책임 연구원", "선임 연구원", "연구원"
  - 데이터(rank)는 그대로, `formatRank()` 헬퍼로 표시만 변환

## 3. DB 마이그레이션 (sort_order)
```sql
alter table public.team_members
  add column if not exists sort_order integer not null default 0;
-- 사용자 지정 순서 백필 (신혜영=0; 김태식=0..양숙영=5; 최혜은=0..정지윤=4; 정은혜=0..김정석=4)
```

## 4. 팀원 추가 모달
- 신규 `AddMemberModal.tsx`
- 필드: 부서, 직급, 이름, 연락처, (선택) 이메일
- 검증: 이름 중복 사전 체크, 연락처 자동 포맷
- 저장 시 해당 부서의 `max(sort_order)+1` 으로 insert

## 5. 편집 모드 (드래그·삭제)
- 의존성: `@dnd-kit/core`, `@dnd-kit/sortable`, `@dnd-kit/utilities`
- 상단 "편집" 토글 버튼 → ON 상태에서:
  - 행 좌측 drag handle, 우측 삭제 버튼
  - 부서 그룹별 독립 SortableContext (부서 간 이동 금지 — 부서 변경은 드로어에서)
  - 드래그 종료 시 해당 부서 멤버 sort_order 0..N 재계산 후 일괄 update
- 삭제: PM/멤버로 참여 중인 프로젝트가 있으면 차단. 연차 일괄 삭제 옵션 포함

## 6. 변경 파일
- 신규: `src/components/team/AddMemberModal.tsx`, `src/components/team/SortableMemberRow.tsx`
- 수정: `teamSync.ts`(addMember/deleteMember/reorderMembers/sort_order), `teamStats.ts`(정렬·formatRank), `TeamFilters.tsx`(직급 라벨), `MemberDrawer.tsx`(직급 라벨), `routes/team.tsx`(뷰 단일화, 편집 모드, 추가 버튼)
