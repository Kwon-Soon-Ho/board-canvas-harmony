export type Department = "영상" | "편집" | "UX" | "공통";
export type Status = "진행" | "상시" | "대기" | "완료";

export interface ThumbnailConfig {
  coverIndex: number;
  focal: { x: number; y: number };
  zoom: number;
  sequence: number[];
}

export interface Task {
  id: string;
  title: string;
  progress: number;
  startDate: string;
  endDate: string;
  assignee: string;
}

export interface Issue {
  id: string;
  title: string;
  startDate: string;
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
  images: string[]; 
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

const TEAM_DATA: Record<Department, { name: string; rank: string }[]> = {
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

const ALL_MEMBERS = Object.values(TEAM_DATA).flat();
const PM_CANDIDATES = ALL_MEMBERS.filter(m => ["수석", "책임", "선임"].includes(m.rank));

const POOLS: Record<Department, string[]> = {
  영상: [
    "1536240478770-bbf43356df13", "1492691523567-6119e289df3a", "1515634928517-2a4eaa194fb1",
    "1485846234645-a62644f84728", "1550745127-d0d01d58d4f0", "1535016120720-40c646be44d0",
    "1574717024653-61fd2cf4d44d", "1506157786151-b8491531f063", "1524985069026-dd778a51c967",
    "1478720566765-e137c1645317", "1598897340027-e67b67232230", "1501446529957-6226bd447c46",
    "1518709268802-62145a8b7d4a", "1493711662002-2211d74222f7", "1516035063541-25713293e646"
  ],
  편집: [
    "1558655140-709c46e8762e", "1626785774625-ddcddc245eab", "1509343256512-d77a5fd3221d",
    "1561070791-2526d30994b5", "1544716278-ca5e3f4abd8c", "1586075010472-9859ff70bbd1",
    "1516321318423-f06f85e504b3", "1515378960530-7c0da6231fb1", "1550684848-fac1c5b4e853",
    "1542744094-24638eff58bb", "1534670007418-fbb7f6cf32c3", "1519389950473-47ba0277781c",
    "1554415707-c8374121fad0", "1492538190560-1d22384ba67a", "1483058713233-bc01c8c2e9a3"
  ],
  UX: [
    "1581291518633-83b4b2435433", "1586717791821-3f44a563df4c", "1512941937669-90a1b58e7e9c",
    "1507238691740-187a5b1d37b8", "1460925895917-afdab827c52f", "1499951360447-b19be8fe80f5",
    "1551650975-87deedd944c3", "1522542550221-31fd19b45641", "1555066931-4365d14bab8c",
    "1551434678-e076c223a692", "1531403009184-a8a4a56057a6", "1508921912186-1d13951df3c1",
    "1541462608144-839f470c648d", "1559028112-ef301ca164c0", "1511649111440-b964fa647417"
  ],
  공통: [
    "1497215842964-21159fb464bb", "1552664730-030f201dd49a", "1557800634-7ef3c7d85304",
    "1551434678-e076c223a692", "1522071823910-b2161af8fd3b", "1552664688-cf4120293a0e",
    "1517245386807-bb43f82c33c4", "1523240795612-d1244a50d282", "1558403191-147c524b6303",
    "1431540015161-1eeb024df03f", "1497367412944-629a84d1d6a3", "1454160517307-57b2b42a2757"
  ],
};

const img = (id: string) => `https://images.unsplash.com/photo-${id}?q=80&w=1200&auto=format&fit=crop`;

const DEPTS: Department[] = ["영상", "편집", "UX"];
const STATUSES: Status[] = ["진행", "상시", "대기", "완료"];

const TITLES: Record<Department, string[]> = {
  영상: ["시네마틱 4K 프로모션", "모션 그래픽 오프닝", "브랜드 필름 에디팅", "유튜브 시리즈 편집", "CF 광고 영상 제작", "인터뷰 다큐멘터리", "3D 제품 렌더링", "뮤직비디오 컬러그레이딩", "티저 트레일러", "이벤트 현장 스케치", "숏폼 챌린지 시리즈", "기업 홍보 영상", "디지털 사이니지 모션", "캠페인 히어로 비디오", "SNS 프로모션 영상", "드론 항공 촬영본"],
  편집: ["브랜드 가이드북 디자인", "매거진 레이아웃 시스템", "타이포그래피 포스터", "패키지 그래픽 시스템", "전시 아이덴티티", "애뉴얼 리포트", "로고 리뉴얼 가이드", "룩북 에디토리얼", "커스텀 서체 개발", "오프라인 팝업 그래픽", "명함 및 스테이셔너리", "인포그래픽 리포트", "일러스트레이션 패키지", "북 디자인 프로젝트", "메뉴얼 시스템 구축", "굿즈 비주얼 가이드"],
  UX: ["모바일 뱅킹 앱 개편", "디자인 시스템 고도화", "구독 플랫폼 웹 대시보드", "이커머스 결제 흐름 개선", "신규 온보딩 프로세스", "스마트 홈 인터페이스", "CRM 툴 리디자인", "여행 예약 앱 프로토타입", "반응형 랜딩 페이지", "관리자 페이지 UI 시스템", "콘텐츠 플랫폼 UX 스터디", "AI 어시스턴트 GUI", "건강 관리 앱 인터랙션", "피트니스 워치 UI", "커뮤니티 웹 리뉴얼", "B2B SaaS 프로덕트 디자인"],
  공통: ["전사 디자인 가이드라인", "브랜드 통합 경험 시스템", "글로벌 비주얼 아이덴티티", "연간 디자인 성과 리포트", "디자인 팀 통합 워크숍", "크리에이티브 에셋 라이브러리", "팀 간 협업 프로세스 혁신", "전사 폰트 시스템 구축"],
};

export const MOCK_PROJECTS: Project[] = Array.from({ length: 48 }, (_, i) => {
  const isCommon = i < 5;
  const dept = isCommon ? "공통" : DEPTS[(i - 5) % DEPTS.length];
  const pool = POOLS[dept];
  const titleList = TITLES[dept];
  const title = isCommon 
    ? (titleList[i] || `공통 프로젝트 ${i + 1}`)
    : (titleList[Math.floor((i - 5) / DEPTS.length)] || `${dept} 프로젝트 ${i}`);
  
  const imgCount = 3;
  const images = Array.from({ length: imgCount }, (_, j) => {
    const idx = (i * imgCount + j) % pool.length;
    return img(pool[idx]);
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
  const tasks: Task[] = Array.from({ length: taskCount }, (_, t) => {
    const tStart = new Date(2026, 3 + (t % 2), 10 + (t * 2));
    const tEnd = new Date(tStart);
    tEnd.setDate(tEnd.getDate() + 7 + (t * 3));
    return {
      id: `t-${i}-${t}`,
      title: `${title} - 단계 ${t + 1}`,
      progress: Math.floor(Math.random() * 10) * 10,
      startDate: tStart.toISOString().slice(0, 10),
      endDate: tEnd.toISOString().slice(0, 10),
      assignee: membersList[t % membersList.length] || pm,
    };
  });

  const totalProgress = tasks.length > 0 
    ? Math.round(tasks.reduce((sum, t) => sum + t.progress, 0) / tasks.length)
    : 0;

  // Generate Issues
  const issueCount = i % 3; // 0 to 2 issues
  const issues: Issue[] = Array.from({ length: issueCount }, (_, is) => {
    const isResolved = is % 2 === 0;
    return {
      id: `iss-${i}-${is}`,
      title: `디자인 검토 이슈 #${is + 1}`,
      startDate: new Date(2026, 4, 15 + is).toISOString().slice(0, 10),
      resolved: isResolved,
      memo: isResolved ? "피드백 반영 완료" : undefined,
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
    image: images[0],
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
