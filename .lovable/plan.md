# 데모용 updatedAt 시드 부여

`src/lib/mockProjects.ts`의 `MOCK_PROJECTS` IIFE 마지막 `return` 직전에, 각 프로젝트의 `updatedAt`이 비어 있으면 id 기반 결정론적 의사난수로 "최근 X분 전" 시각을 채워준다.

상태별 분포:
- 진행: 0~3일 전
- 상시: 0~7일 전
- 완료: 7~45일 전
- 대기: 1~21일 전

결과: 새로고침해도 동일 값이 유지되고, 카드 썸네일/디테일 헤더에 "n시간 전 수정" 라벨이 자연스럽게 표시되며 최신순 정렬도 의미있게 동작.

변경 파일: `src/lib/mockProjects.ts` 한 곳.