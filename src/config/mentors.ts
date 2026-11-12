/**
 * 멘토별 예약 페이지 링크.
 * 키는 Redash 결과의 '멘토닉네임' 값과 정확히 같아야 합니다.
 * URL이 비어 있으면 해당 멘토의 '예약하러 가기' 버튼이 표시되지 않습니다.
 */
export const BOOKING_URLS: Record<string, string> = {
  쥬디: "",
  Jino: "",
  리아: "",
  제이미: "",
  "렛츠커리어 레오": "",
  나비: "",
  호이: "",
};

/**
 * 정렬과 상관없이 늘 목록 맨 아래에 두는 멘토 (화면에 보이는 이름 기준, 적힌 순서대로).
 * 나머지 멘토는 가장 빠른 예약 가능 시간 순으로 위에 나열됩니다.
 */
export const BOTTOM_MENTORS = ["쥬디", "레오"];

/**
 * 잠시 페이지에서 숨기는 멘토 (화면에 보이는 이름 기준). 프로필·슬롯 모두 브라우저로 보내지 않습니다.
 * 다시 보이게 하려면 목록에서 빼면 됩니다.
 * - 팀장 박주삼: 상세페이지 개설 전
 */
export const HIDDEN_MENTORS = ["팀장 박주삼"];

/**
 * 회사명 → 기업 규모. '기업 규모' 필터에 쓰입니다.
 * 키는 멘토 DB의 '실제 사용할 기업명'(없으면 회사) 값과 정확히 같아야 하며, 표에 없는 회사의 멘토는 규모 필터에서 빠집니다.
 */
export const COMPANY_SIZE: Record<string, string> = {
  쿠팡: "대기업",
  현대: "대기업",
  CJ올리브네트웍스: "대기업",
  렛츠커리어: "스타트업",
};
/** 기업 규모 필터 버튼 순서. 여기 없는 규모는 뒤에 붙습니다. */
export const COMPANY_SIZE_ORDER = ["대기업", "중견기업", "중소기업", "외국계", "공기업", "스타트업"];

/**
 * 멘토 DB '프로그램' 태그 정리.
 * - JOB_TAGS: 직무로 옮길 태그
 * - SIZE_TAGS: 기업 규모를 뜻하는 태그. 규모는 COMPANY_SIZE 로 정하므로 프로그램에서 뺍니다.
 * 나머지 태그(자기소개서·포트폴리오·면접 등)는 프로그램으로 남습니다.
 */
export const JOB_TAGS = ["마케팅"];
export const SIZE_TAGS = ["대기업", "중견기업", "중소기업", "외국계", "공기업", "스타트업"];
/** 멘토 DB '멘토링 직무'에 이 값이 있으면 어떤 직무를 골라도 함께 보여 줍니다. */
export const ANY_JOB = "직무무관";

/**
 * '멘토링 유형' 필터 선택지 (적힌 순서대로 표시, 해당 멘토가 없어도 항상 보입니다).
 * tags: 이 유형으로 볼 멘토 DB '프로그램' 태그. 비어 있으면 유형 이름과 같은 태그를 찾습니다.
 */
export const MENTORING_TYPES: { label: string; tags?: string[] }[] = [
  { label: "자기소개서" },
  { label: "이력서" },
  { label: "포트폴리오" },
  { label: "커리어 커피챗", tags: ["커리어 커피챗", "커피챗"] },
  { label: "면접 준비, 모의 면접", tags: ["면접", "면접 준비", "모의 면접"] },
  { label: "경험 정리" },
];

/**
 * '직무' 필터 선택지. 분류(group)별로 묶어 적힌 순서대로 보여 줍니다 (해당 멘토가 없어도 항상 보임).
 * - jobs[].aliases: 멘토 DB 직무 값이 이 이름이면 그 직무로 봅니다 (띄어쓰기·대소문자 무시).
 * - group aliases: 멘토 DB 값이 분류 이름 수준(예: '마케팅')이면 그 분류의 모든 직무에 나옵니다.
 * 어디에도 안 걸리는 멘토 직무는 '기타' 분류로 뒤에 붙습니다.
 */
export const JOB_GROUPS: { group: string; aliases?: string[]; jobs: { label: string; aliases?: string[] }[] }[] = [
  {
    group: "기획",
    jobs: [
      { label: "PM/PO", aliases: ["PM", "PO"] },
      { label: "서비스 기획" },
      { label: "사업개발/기획", aliases: ["사업개발", "사업기획", "BD"] },
      { label: "전략 기획", aliases: ["전략"] },
      { label: "상품 기획/MD", aliases: ["상품기획", "MD"] },
    ],
  },
  {
    group: "경영/인사",
    aliases: ["경영", "인사"],
    jobs: [
      { label: "인사/평가", aliases: ["HR", "인사"] },
      { label: "경영지원" },
      { label: "채용 담당", aliases: ["채용", "리크루터", "HR 채용"] },
    ],
  },
  {
    group: "마케팅",
    aliases: ["마케터"],
    jobs: [
      { label: "퍼포먼스 마케팅", aliases: ["퍼포먼스 마케터"] },
      { label: "콘텐츠 마케팅", aliases: ["콘텐츠 마케터", "컨텐츠 마케팅"] },
      { label: "마케팅 전략 기획", aliases: ["브랜드 마케팅", "브랜드 마케터"] },
      { label: "광고 기획(AE)", aliases: ["광고 기획", "AE"] },
    ],
  },
  {
    group: "영업",
    jobs: [{ label: "영업" }, { label: "해외영업" }, { label: "컨설팅", aliases: ["컨설턴트"] }],
  },
  {
    group: "디자인",
    jobs: [
      { label: "UIUX 디자인", aliases: ["UI/UX 디자인", "UX 디자인", "프로덕트 디자인"] },
      { label: "그래픽 디자인" },
      { label: "BI/BX 디자인", aliases: ["브랜드 디자인"] },
    ],
  },
  {
    group: "개발",
    jobs: [
      { label: "프론트엔드 개발", aliases: ["프론트엔드"] },
      { label: "백엔드/서버 개발", aliases: ["백엔드", "서버 개발", "백엔드 개발"] },
      { label: "데이터 분석", aliases: ["데이터 분석가", "데이터"] },
      { label: "QA/테스트 엔지니어링", aliases: ["QA"] },
      { label: "게임 개발" },
    ],
  },
];
