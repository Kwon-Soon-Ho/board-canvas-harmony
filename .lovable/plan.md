## 변경 요약

1. **왕관(Crown) 아이콘 제거** — 표/드로어/프로젝트 리스트 모든 위치
2. **역할(role) 필드 추가** — `팀장 / 셀장 / 팀원` 3종 (직급과 이름 사이 컬럼)
3. **팀원 추가/수정 모달**에 역할 드롭다운 추가
4. **DB 마이그레이션** — `team_members.role` 컬럼 추가 + 기존 멤버 값 부여
5. 그 외 정합성 보강 (선택 항목)

---

## 1. DB 마이그레이션

`team_members` 테이블에 `role` 컬럼 추가:

```sql
ALTER TABLE public.team_members
  ADD COLUMN role text NOT NULL DEFAULT '팀원';

-- 초기값 부여
UPDATE public.team_members SET role = '팀장' WHERE name = '신혜영';
UPDATE public.team_members SET role = '셀장' WHERE name IN ('김태식','최혜은','정은혜');
-- 나머지는 default '팀원'
```

(체크 제약 대신 앱단 enum 검증 — config.toml 가이드에 따라 트리거/CHECK 미사용)

## 2. 타입 / 상수

- `src/lib/teamSync.ts` `TeamMemberRow`에 `role: string` 추가
- 새 파일은 만들지 않고 `RANK_LABEL` 옆에 `ROLES = ["팀장","셀장","팀원"]` export
- `loadOrSeedTeamMembers` 시드에도 role 부여 (이름 매핑)
- `addMember` payload에 role 포함, 기본값 `팀원`
- `updateMemberFields`가 role도 업데이트하도록 확장
- `MemberStats`에 `role: string` 필드 추가 (`teamStats.ts`)

## 3. UI 변경

### `SortableMemberRow.tsx`

- `Crown` import/사용 제거
- 컬럼 순서: 부서 / 직급 / **역할** / 이름 / 연락처 / 진행 / 대기 / 완료 / 이슈 / 이번달 연차
- 역할 셀 톤: 팀장(amber-300), 셀장(teal-300), 팀원(gray-400)

### `team.tsx` `tableHead`

- `<th>역할</th>`을 직급과 이름 사이에 삽입

### `MemberDrawer.tsx`

- `Crown` 아이콘 2곳 제거
- 헤더 `직급 · 부서` 옆에 역할 배지 표시
- 편집 폼에 "역할" 드롭다운 추가 (`팀장/셀장/팀원`)
- save 시 role도 `updateMemberFields`로 전송

### `AddMemberModal.tsx`

- 부서 ↔ 직급 사이에 "역할" 드롭다운 추가, 기본값 `팀원`
- submit 시 `addMember`에 role 전달

## 4. 파급 효과 / 정합성 점검

- 역할은 단순 표시/메타데이터이므로 프로젝트(localStorage)·일정(leaves) 데이터엔 영향 없음 → 별도 sync 불필요
- 단, 이름 변경 시처럼 `MEMBER_UPDATE` broadcast는 기존 경로 그대로 사용
- `teamStats.buildAllStats`에서 role을 `MemberStats`에 단순 통과
- 좌측 필터(`TeamFilters`)는 변경 없음 (역할 필터 요청 없으므로 추가 X — 필요시 후속)

## 5. 그 외 권장 개선 (질문에 대한 제안)

- **PM 표기 대체**: 왕관 제거로 PM 식별 수단이 사라지므로, 드로어 "업무 중인 프로젝트" 항목에서 PM 프로젝트는 작은 `PM` 텍스트 배지로 대체 (눈에 띄지만 시각 노이즈 적음)
- **모바일/좁은 화면 컬럼 압축**: 컬럼이 1개 늘어나니 `lg:` 미만에서 연락처/이메일 비표시 등 반응형 보강 — 다만 현재 뷰포트(1894px) 기준에선 영향 없음, 필요시만
- **필터 사이드바에 "역할" 칩 필터 추가** — 팀장/셀장만 빠르게 보고 싶을 때 유용. 추가 원하시면 같이 진행

질문: 위 5번 항목 중 **PM 텍스트 배지 대체** 와 **역할 필터 추가** 도 함께 적용할까요? 별도 지시 없으면 1~4만 진행합니다. -> PM 표기 대체만 개선하고 나머진 필요없어.

## 변경/생성 파일

- 새 마이그레이션: `supabase/migrations/<ts>_team_role.sql`
- 수정: `src/lib/teamSync.ts`, `src/lib/teamStats.ts`, `src/components/team/SortableMemberRow.tsx`, `src/components/team/MemberDrawer.tsx`, `src/components/team/AddMemberModal.tsx`, `src/routes/team.tsx`