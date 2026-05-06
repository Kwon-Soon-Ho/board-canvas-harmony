# 수정 시간 스탬핑 정상화 + 표기 위치 추가

## 1. detail.tsx — 진입은 stamp 안 함, 편집만 stamp

- 기존 `useEffect([project])` 안의 자동 `updatedAt` 스탬핑 로직(`syncCountRef < 2` 게이트 포함) 제거.
- effect는 다음 두 가지만 담당:
  - 진입 시 `syncMembers(project)` 정규화 결과가 다르면 한 번 `setProject(synced)` 후 한 번 브로드캐스트(이때 `updatedAt`은 건드리지 않음).
  - 다른 효과/외부 PROJECT_UPDATE 수신과의 충돌 방지.
- 편집 커밋 헬퍼 추가:
  ```ts
  const commitEdit = (next: Project) => {
    const synced = syncMembers(next);
    const stamped = { ...synced, updatedAt: new Date().toISOString() };
    setProject(stamped);
    const idx = MOCK_PROJECTS.findIndex(p => p.id === stamped.id);
    if (idx !== -1) MOCK_PROJECTS[idx] = stamped;
    const ch = getSyncChannel();
    ch?.postMessage({ type: "PROJECT_UPDATE", project: stamped });
    ch?.close();
  };
  ```
- 사용자 편집을 일으키는 모든 경로(제목 변경, 태스크 CRUD, 이슈 CRUD, 일정/마감 변경, 진행도 변경 등)에서 기존 `setProject(...)` + 수동 `updatedAt` 처리들을 `commitEdit(...)` 호출로 일원화.
- 단순 토글 UI(드로어 열고닫기, 편집 모드 진입, 입력 중 임시 상태)는 절대 `commitEdit`를 호출하지 않음.

## 2. ProjectCard.tsx (Window A 썸네일) — 수정 시간 표기 위치 보강

현재 제목 우측에 작게 노출 중인 `{timeAgo(project.updatedAt)} 수정`을 더 잘 보이게 조정:
- 카드 푸터(제목 줄) 우측에 유지하되 색/크기를 살짝 강화: `text-[11px] text-white/55 font-medium`.
- `updatedAt`이 없으면 미표시(기존과 동일).

## 3. detail.tsx (Window B 상세보기) — 최상단 제목 옆에 표기

현재 329줄 부근에 이미 `timeAgo(project.updatedAt)` 표기가 있으나 위치/스타일을 정리:
- 헤더 타이틀 H1 옆에 `· 마지막 수정 {timeAgo(project.updatedAt)}` 형태로 inline 배치.
- 클래스: `ml-2 text-xs text-white/50 font-medium`.
- `updatedAt`이 없으면 미표시.

## 4. 정렬/인사이트 영향
- `index.tsx` 최신순 정렬 로직 변경 없음. `updatedAt`이 실제 편집 시에만 박히게 되므로 자연 복구.
- `insights.ts`의 `p.updatedAt || p.deadline` 사용도 변경 없음.

## 변경 파일
- `src/routes/detail.tsx` (effect 리팩터 + commitEdit 도입 + 편집 호출부 통일 + 헤더 표기 위치)
- `src/components/control/ProjectCard.tsx` (수정 시간 스타일 강화)

## 비변경 (의도적으로 건드리지 않음)
- mockProjects.ts 초기 데이터: 기존 카드들은 한 번이라도 편집해야 라벨이 뜸(정상 동작).
- BroadcastChannel/sync 흐름 자체.