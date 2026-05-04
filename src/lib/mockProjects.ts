export type Department = "영상" | "편집" | "UX" | "공통";
export type Status = "진행" | "상시" | "대기" | "완료";
export interface ProjectImage {
  url: string;
  memo?: string;
}

export interface ThumbnailConfig {
  coverIndex: number;
  focal: { x: number; y: number };
  zoom: number;
  sequence: number[];
}

export type TaskStatus = "대기" | "진행" | "검토중" | "승인됨" | "보류" | "취소" | "완료";
export type IssueStatus = "Issue" | "Resolved";

export interface Task {
  id: string;
  title: string;
  content: string;
  status: TaskStatus;
  progress: number;
  startDate: string;
  endDate: string;
  assignee: string;
  imageUrls: ProjectImage[];
}

export interface Issue {
  id: string;
  title: string;
  content: string;
  status: IssueStatus;
  startDate: string;
  endDate: string;
  assignee: string;
  imageUrls: ProjectImage[];
  resolved: boolean;
  memo?: string;
  timestamp?: string;
}

export interface Project {
  id: string;
  title: string;
  department: Department;
  status: Status;
  progress: number;
  deadline: string;
  pm: string;
  members: string[];
  image: string; 
  images: ProjectImage[]; 
  thumbnail: ThumbnailConfig;
  tasks: Task[];
  issues: Issue[];
}

export const DEPT_COLOR: Record<Department, string> = {
  영상: "#FF5C00",
  편집: "#007BFF",
  UX: "#FF007F",
  공통: "#FFFFFF", // Brighter white for neon
};

const RANK_VALUE: Record<string, number> = {
  "수석": 4,
  "책임": 3,
  "선임": 2,
  "연구원": 1
};

export const TEAM_DATA: Record<Department, { name: string; rank: string }[]> = {
  공통: [{ name: "신혜영", rank: "수석" }],
  영상: [
    { name: "김태식", rank: "책임" }, { name: "최영환", rank: "선임" }, { name: "박지영", rank: "선임" },
    { name: "권순호", rank: "연구원" }, { name: "정두휘", rank: "연구원" }, { name: "양숙영", rank: "연구원" }
  ],
  편집: [
    { name: "최혜은", rank: "선임" }, { name: "윤봄이", rank: "선임" }, { name: "이예진", rank: "선임" },
    { name: "마희연", rank: "선임" }, { name: "정지윤", rank: "연구원" }
  ],
  UX: [
    { name: "정은혜", rank: "책임" }, { name: "채선영", rank: "선임" }, { name: "김수현", rank: "선임" },
    { name: "허유나", rank: "선임" }, { name: "김정석", rank: "연구원" }
  ],
};

export const ALL_MEMBERS = Object.values(TEAM_DATA).flat();
const PM_CANDIDATES = ALL_MEMBERS.filter(m => ["수석", "책임", "선임"].includes(m.rank));

const ALL_IMAGES = [
  "https://images.unsplash.com/photo-1769736540771-3fdda750175b",
  "https://images.unsplash.com/photo-1775735478842-c3bbcf5d2618",
  "https://images.unsplash.com/photo-1770026741532-8d8f8a5a5e20",
  "https://images.unsplash.com/photo-1587440871875-191322ee64b0",
  "https://images.unsplash.com/photo-1509343256512-d77a5cb3791b",
  "https://images.unsplash.com/photo-1558655146-d09347e92766",
  "https://images.unsplash.com/photo-1576153192396-180ecef2a715",
  "https://images.unsplash.com/photo-1476357471311-43c0db9fb2b4",
  "https://images.unsplash.com/photo-1498075702571-ecb018f3752d",
  "https://images.unsplash.com/photo-1499428665502-503f6c608263",
  "https://images.unsplash.com/photo-1561070791-36c11767b26a",
  "https://images.unsplash.com/photo-1506097425191-7ad538b29cef",
  "https://images.unsplash.com/photo-1470790376778-a9fbc86d70e2",
  "https://images.unsplash.com/photo-1541506618330-7c369fc759b5",
  "https://images.unsplash.com/photo-1586717791821-3f44a563fa4c",
  "https://images.unsplash.com/photo-1497091071254-cc9b2ba7c48a",
  "https://images.unsplash.com/photo-1572044162444-ad60f128bdea",
  "https://images.unsplash.com/photo-1581079289196-67865ea83118",
  "https://images.unsplash.com/photo-1537498425277-c283d32ef9db",
  "https://images.unsplash.com/photo-1652449823136-b279fbe5dfd3",
  "https://images.unsplash.com/photo-1535957998253-26ae1ef29506",
  "https://images.unsplash.com/photo-1541462608143-67571c6738dd",
  "https://images.unsplash.com/photo-1531403009284-440f080d1e12",
  "https://images.unsplash.com/photo-1513542789411-b6a5d4f31634",
  "https://images.unsplash.com/photo-1559028012-481c04fa702d",
  "https://images.unsplash.com/photo-1510511336377-1a9caa095849",
  "https://images.unsplash.com/photo-1525498128493-380d1990a112",
  "https://images.unsplash.com/photo-1650954934741-3a648866a897",
  "https://images.unsplash.com/photo-1611262588019-db6cc2032da3",
  "https://images.unsplash.com/photo-1606636660488-16a8646f012c",
  "https://images.unsplash.com/photo-1500462918059-b1a0cb512f1d",
  "https://images.unsplash.com/photo-1629752187687-3d3c7ea3a21b",
  "https://images.unsplash.com/photo-1516383740770-fbcc5ccbece0",
  "https://images.unsplash.com/photo-1552250575-e508473b090f",
  "https://images.unsplash.com/photo-1516131206008-dd041a9764fd",
  "https://images.unsplash.com/photo-1545235617-9465d2a55698",
  "https://images.unsplash.com/photo-1581291518633-83b4ebd1d83e",
  "https://images.unsplash.com/photo-1513506003901-1e6a229e2d15",
  "https://images.unsplash.com/photo-1655474396177-e727349f44dc",
  "https://images.unsplash.com/photo-1499951360447-b19be8fe80f5",
  "https://images.unsplash.com/photo-1525909002-1b05e0c869d8",
  "https://images.unsplash.com/photo-1688750997529-88a14e49d15c",
  "https://images.unsplash.com/photo-1472289065668-ce650ac443d2",
  "https://images.unsplash.com/photo-1655834648155-f7a98ff3c49d",
  "https://images.unsplash.com/photo-1611241893603-3c359704e0ee",
  "https://images.unsplash.com/photo-1416339134316-0e91dc9ded92",
  "https://images.unsplash.com/photo-1463438690606-f6778b8c1d10",
  "https://images.unsplash.com/photo-1581079288371-ea1d68ec6105",
  "https://images.unsplash.com/photo-1600697395543-ef3ee6e9af7b",
  "https://images.unsplash.com/photo-1517245386807-bb43f82c33c4",
  "https://images.unsplash.com/photo-1630852722069-7062272a0f8a",
  "https://images.unsplash.com/photo-1549716679-95380658d5cd",
  "https://images.unsplash.com/photo-1510070009289-b5bc34383727",
  "https://images.unsplash.com/photo-1581548133861-ad7a282a1d62",
  "https://images.unsplash.com/photo-1502691876148-a84978e59af8",
  "https://images.unsplash.com/photo-1502014822147-1aedfb0676e0",
  "https://images.unsplash.com/photo-1491895200222-0fc4a4c35e18",
  "https://images.unsplash.com/photo-1461958508236-9a742665a0d5",
  "https://images.unsplash.com/photo-1613909207039-6b173b755cc1",
  "https://images.unsplash.com/photo-1494253109108-2e30c049369b",
  "https://images.unsplash.com/photo-1487700160041-babef9c3cb55",
  "https://images.unsplash.com/photo-1690228254548-31ef53e40cd1",
  "https://images.unsplash.com/photo-1532017737543-8743f2938776",
  "https://images.unsplash.com/photo-1515573998019-c132a6782768",
  "https://images.unsplash.com/photo-1609921212029-bb5a28e60960",
  "https://images.unsplash.com/photo-1503551723145-6c040742065b-v2",
  "https://images.unsplash.com/photo-1611269154421-4e27233ac5c7",
  "https://images.unsplash.com/photo-1475669698648-2f144fcaaeb1",
  "https://images.unsplash.com/photo-1483058712412-4245e9b90334",
  "https://images.unsplash.com/photo-1705453168890-6c244eb82942",
  "https://images.unsplash.com/photo-1504805572947-34fad45aed93",
  "https://images.unsplash.com/photo-1464639351491-a172c2aa2911",
  "https://images.unsplash.com/photo-1630852722172-a1943ca8a55f",
  "https://images.unsplash.com/photo-1581291518857-4e27b48ff24e",
  "https://images.unsplash.com/photo-1651813338290-2f869def49b0",
  "https://images.unsplash.com/photo-1541359927273-d76820fc43f9",
  "https://images.unsplash.com/photo-1517191434949-5e90cd67d2b6",
  "https://images.unsplash.com/photo-1650954933593-6c9342ba0331",
  "https://images.unsplash.com/photo-1434030216411-0b793f4b4173",
  "https://images.unsplash.com/photo-1542435503-956c469947f6",
  "https://images.unsplash.com/photo-1518842013791-b874be246c34",
  "https://images.unsplash.com/photo-1710799885122-428e63eff691",
  "https://images.unsplash.com/photo-1573867639040-6dd25fa5f597",
  "https://images.unsplash.com/reserve/LJIZlzHgQ7WPSh5KVTCB_Typewriter.jpg",
  "https://images.unsplash.com/photo-1548761013-f4c9d4f524ae",
  "https://images.unsplash.com/photo-1555212697-194d092e3b8f",
  "https://images.unsplash.com/photo-1599420186985-5c3d1a038e84",
  "https://images.unsplash.com/photo-1506729623306-b5a934d88b53",
  "https://images.unsplash.com/photo-1495045197504-5128e3c8469f",
  "https://images.unsplash.com/photo-1618005198919-d3d4b5a92ead",
  "https://images.unsplash.com/photo-1498050108023-c5249f4df085",
  "https://images.unsplash.com/photo-1467232004584-a241de8bcf5d",
  "https://images.unsplash.com/photo-1531346878377-a5be20888e57",
  "https://images.unsplash.com/photo-1492760864391-753aaae87234",
  "https://images.unsplash.com/photo-1540242908484-50aa09aea5a7",
  "https://images.unsplash.com/photo-1650615567023-0721bceeecb6",
  "https://images.unsplash.com/photo-1487017159836-4e23ece2e4cf",
  "https://images.unsplash.com/photo-1558655146-9f40138edfeb",
  "https://images.unsplash.com/photo-1658487476847-a180f98870d0",
  "https://images.unsplash.com/photo-1674515513957-bc5b9c5ee367",
  "https://images.unsplash.com/photo-1547658719-da2b51169166",
  "https://images.unsplash.com/photo-1519408469771-2586093c3f14",
  "https://images.unsplash.com/photo-1517694712202-14dd9538aa97",
  "https://images.unsplash.com/photo-1497864149936-d3163f0c0f4b",
  "https://images.unsplash.com/photo-1617050318658-a9a3175e34cb",
  "https://images.unsplash.com/photo-1738028449238-fa5ae8c33bce",
  "https://images.unsplash.com/photo-1600132806608-231446b2e7af",
  "https://images.unsplash.com/photo-1558655146-605d86ed31b3",
  "https://images.unsplash.com/photo-1557672172-298e090bd0f1",
  "https://images.unsplash.com/photo-1532323544230-7191fd51bc1b",
  "https://images.unsplash.com/photo-1658246944389-9e9ac0a85dda",
  "https://images.unsplash.com/photo-1581079288675-16bf8157bc10",
  "https://images.unsplash.com/photo-1506792006437-256b665541e2",
  "https://images.unsplash.com/photo-1617695744007-68ef55752789",
  "https://images.unsplash.com/photo-1553714155-2ee64b8575e6",
  "https://images.unsplash.com/photo-1648260296289-ab882814a005",
  "https://images.unsplash.com/photo-1567016376408-0226e4d0c1ea",
  "https://images.unsplash.com/photo-1512314889357-e157c22f938d",
  "https://images.unsplash.com/photo-1586023492125-27b2c045efd7",
  "https://images.unsplash.com/photo-1581291519195-ef11498d1cf2",
  "https://images.unsplash.com/photo-1609189184127-04652523de91",
  "https://images.unsplash.com/photo-1522932753915-9ee97e43e3d9",
  "https://images.unsplash.com/photo-1568219557405-376e23e4f7cf",
  "https://images.unsplash.com/photo-1532680678473-a16f2cda8e43",
  "https://images.unsplash.com/photo-1587955415524-bb264e518428",
  "https://images.unsplash.com/3/doctype-hi-res.jpg",
  "https://images.unsplash.com/photo-1654250910768-0162e080ef86",
  "https://images.unsplash.com/photo-1540932239986-30128078f3c5",
];

// Use base URLs without parameters for the data pool
const img = (index: number) => ALL_IMAGES[index % ALL_IMAGES.length];

/**
 * Helper to append Unsplash optimization parameters.
 * 'thumb' for fast dashboard loading, 'full' for high-quality detail view.
 */
export const getOptimizedUrl = (url: string, type: 'thumb' | 'full' = 'full') => {
  const params = type === 'thumb' 
    ? "?q=60&w=600&auto=format&fit=crop" 
    : "?auto=format&q=100";
  return `${url}${params}`;
};

export const DEPTS: Department[] = ["영상", "편집", "UX"];
export const STATUSES: Status[] = ["진행", "상시", "대기", "완료"];

const TITLES: Record<Department, string[]> = {
  영상: ["시네마틱 4K 프로모션", "모션 그래픽 오프닝", "브랜드 필름 에디팅", "유튜브 시리즈 편집", "CF 광고 영상 제작", "인터뷰 다큐멘터리", "3D 제품 렌더링", "뮤직비디오 컬러그레이딩", "티저 트레일러", "이벤트 현장 스케치", "숏폼 챌린지 시리즈", "기업 홍보 영상", "디지털 사이니지 모션", "캠페인 히어로 비디오", "SNS 프로모션 영상", "드론 항공 촬영본"],
  편집: ["브랜드 가이드북 디자인", "매거진 레이아웃 시스템", "타이포그래피 포스터", "패키지 그래픽 시스템", "전시 아이덴티티", "애뉴얼 리포트", "로고 리뉴얼 가이드", "룩북 에디토리얼", "커스텀 서체 개발", "오프라인 팝업 그래픽", "명함 및 스테이셔너리", "인포그래픽 리포트", "일러스트레이션 패키지", "북 디자인 프로젝트", "메뉴얼 시스템 구축", "굿즈 비주얼 가이드"],
  UX: ["모바일 뱅킹 앱 개편", "디자인 시스템 고도화", "구독 플랫폼 웹 대시보드", "이커머스 결제 흐름 개선", "신규 온보딩 프로세스", "스마트 홈 인터페이스", "CRM 툴 리디자인", "여행 예약 앱 프로토타입", "반응형 랜딩 페이지", "관리자 페이지 UI 시스템", "콘텐츠 플랫폼 UX 스터디", "AI 어시스턴트 GUI", "건강 관리 앱 인터랙션", "피트니스 워치 UI", "커뮤니티 웹 리뉴얼", "B2B SaaS 프로덕트 디자인"],
  공통: ["전사 디자인 가이드라인", "브랜드 통합 경험 시스템", "글로벌 비주얼 아이덴티티", "연간 디자인 성과 리포트", "디자인 팀 통합 워크숍", "크리에이티브 에셋 라이브러리", "팀 간 협업 프로세스 혁신", "전사 폰트 시스템 구축"],
};

export const MOCK_PROJECTS: Project[] = (() => {
  // Try to load from localStorage first for persistence
  const saved = typeof window !== 'undefined' ? localStorage.getItem('design-projects-store') : null;
  const initialData = Array.from({ length: 48 }, (_, i) => {
    const isCommon = i < 5;
    const dept = isCommon ? "공통" : DEPTS[(i - 5) % DEPTS.length];
    const titleList = TITLES[dept];
    const title = isCommon 
      ? (titleList[i] || `공통 프로젝트 ${i + 1}`)
      : (titleList[Math.floor((i - 5) / DEPTS.length)] || `${dept} 프로젝트 ${i}`);

    const imgCount = 3;
    const images = Array.from({ length: imgCount }, (_, j) => {
      return { url: img(i * imgCount + j), memo: "" };
    });
    
    const status = STATUSES[i % STATUSES.length];
    const deadline = new Date(2026, 4, 1 + (i % 30)).toISOString().slice(0, 10);

    // PM assignment: Must be Senior or higher
    const deptCandidates = TEAM_DATA[dept].filter(m => ["수석", "책임", "선임"].includes(m.rank));
    const fallbackCandidates = PM_CANDIDATES;
    const pmInfo = (isCommon || deptCandidates.length === 0) 
      ? fallbackCandidates[i % fallbackCandidates.length]
      : deptCandidates[i % deptCandidates.length];
    
    const pm = pmInfo.name;
    const pmRankValue = RANK_VALUE[pmInfo.rank];

    // Assign 3-4 members, EXCLUDING the PM AND members with rank > PM
    const isEligibleMember = (m: {name: string, rank: string}) => m.name !== pm && RANK_VALUE[m.rank] <= pmRankValue;
    
    const memberPool = ALL_MEMBERS.filter(isEligibleMember);
    const deptMemberPool = TEAM_DATA[dept].filter(isEligibleMember);
    
    // For Common projects, or as fallback, use the whole eligible pool. Ensure at least 3 members.
    const sourcePool = (isCommon || deptMemberPool.length < 3) ? memberPool : deptMemberPool;
    
    // Safety check if sourcePool is empty
    const safeSourcePool = sourcePool.length > 0 ? sourcePool : memberPool;

    const members = Array.from({ length: 3 + (i % 2) }, (_, j) => {
      return safeSourcePool[(i + j) % safeSourcePool.length].name;
    });

    const membersList = Array.from(new Set(members)).filter(Boolean);

    // Generate Tasks
    const taskCount = 3 + (i % 4); // 3 to 6 tasks
    const taskStatuses: TaskStatus[] = ["대기", "진행", "검토중", "승인됨", "보류", "취소", "완료"];
    const tasks: Task[] = Array.from({ length: taskCount }, (_, t) => {
      const tStart = new Date(2026, 3 + (t % 2), 10 + (t * 2));
      const tEnd = new Date(tStart);
      tEnd.setDate(tEnd.getDate() + 7 + (t * 3));
      const rawProgress = Math.floor(Math.random() * 10) * 10;
      const taskStatus = rawProgress === 100 ? "완료" : (rawProgress > 0 ? "진행" : "대기");
      
      return {
        id: `t-${i}-${t}`,
        title: `${title} - 단계 ${t + 1}`,
        content: `이 작업은 ${title}의 주요 마일스톤 중 하나로, 프로젝트 성공에 필수적인 단계입니다. 담당자는 정해진 기한 내에 산출물을 제출해야 합니다.`,
        status: taskStatus,
        progress: rawProgress,
        startDate: tStart.toISOString().slice(0, 10),
        endDate: tEnd.toISOString().slice(0, 10),
        assignee: membersList[t % membersList.length] || pm,
        imageUrls: [{ url: images[t % images.length].url, memo: "" }],
      };
    });

    const totalProgress = tasks.length > 0 
      ? Math.round(tasks.reduce((sum, t) => sum + t.progress, 0) / tasks.length)
      : 0;

    // Generate Issues
    const issueCount = i % 3; // 0 to 2 issues
    const issues: Issue[] = Array.from({ length: issueCount }, (_, is) => {
      const isResolved = is % 2 === 0;
      const iStart = new Date(2026, 4, 15 + is);
      const iEnd = new Date(iStart);
      iEnd.setDate(iEnd.getDate() + 3);
      return {
        id: `iss-${i}-${is}`,
        title: `디자인 검토 이슈 #${is + 1}`,
        content: `이슈 설명: 현재 디자인 시안의 톤앤매너가 브랜드 가이드라인과 일부 불일치합니다. 수정이 필요합니다.`,
        status: isResolved ? "Resolved" : "Issue",
        startDate: iStart.toISOString().slice(0, 10),
        endDate: iEnd.toISOString().slice(0, 10),
        assignee: membersList[is % membersList.length] || pm,
        imageUrls: [{ url: images[(is + 1) % images.length].url, memo: "" }],
        resolved: isResolved,
        memo: isResolved ? "피드백 반영 완료: 색상 대비 및 타이포그래피 여백 수정 확인됨." : undefined,
        timestamp: isResolved ? new Date().toISOString() : undefined,
      };
    });

    return {
      id: `p-${String(i + 1).padStart(3, "0")}`,
      title,
      department: dept,
      status,
      progress: totalProgress,
      deadline: status === "상시" ? "상시" : deadline,
      pm,
      members: membersList,
      image: images[0].url,
      images,
      thumbnail: {
        coverIndex: 0,
        focal: { x: 0.5, y: 0.5 },
        zoom: 1,
        sequence: Array.from({ length: images.length }, (_, j) => j),
      },
      tasks,
      issues,
    };
  });

  if (saved) {
    try {
      const parsed = JSON.parse(saved);
      // Merge saved data with initial data to ensure all projects exist but modifications are kept
      return initialData.map(p => {
        const found = parsed.find((x: any) => x.id === p.id);
        return found || p;
      });
    } catch {
      return initialData;
    }
  }
  return initialData;
})();
