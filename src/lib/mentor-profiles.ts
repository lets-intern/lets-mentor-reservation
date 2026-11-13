import "server-only";
import { unstable_cache } from "next/cache";
import { ANY_JOB, COMPANY_SIZE, JOB_TAGS, MENTORING_TYPES, SIZE_TAGS } from "@/config/mentors";
import { toJobFilters } from "./jobs";

/** lets-operation 멘토 DB(/api/external/mentors) 응답 한 건. */
type OperationMentor = {
  mentorId: string;
  realName: string;
  activityName: string | null;
  active: boolean;
  /** 멘토 상세(예약) 페이지 주소 */
  url: string | null;
  /** 현재 재직 기업명 */
  company: string | null;
  /** 실제 사용할 기업명 (고객에게 보여 줄 이름). 비어 있으면 company 를 쓴다. */
  displayCompany?: string | null;
  jobRole: string | null;
  desiredJobRoles: string | null;
  programs: string[];
  careers: { company: string | null; jobRole: string | null; jobTitle: string | null; years: string | null }[];
  documentPasses: { company: string | null; jobRole: string | null }[];
};

/** 고객에게 보여도 되는 멘토 프로필. 본명·메모·SNS·경력 등은 담지 않는다. */
export type MentorProfile = {
  activityName: string | null;
  /** 멘토 DB 의 예약 페이지 주소 (http/https 만). */
  url: string | null;
  company: string | null;
  jobRole: string | null;
  desiredJobRoles: string[];
  /** 카드에 보이는 멘토링 직무. 멘토링 직무(직무무관 제외) + 직무 태그, 둘 다 없으면 현재 직무. */
  jobs: string[];
  /** 직무 필터 선택지 이름으로 바꾼 값 (JOB_GROUPS 기준). */
  jobFilters: string[];
  /** 멘토링 직무가 '직무무관' — 어떤 직무 필터에도 나온다. */
  anyJob: boolean;
  companySize: string | null;
  /** 멘토링 유형. MENTORING_TYPES 에 걸리는 태그는 그 유형 이름으로 바꾸고, 직무·규모 태그는 뺀다. */
  programs: string[];
  documentPasses: string[];
};

// 고객이 신청하는 1:1 멘토링과 관계없는 운영용 분류는 뺀다.
const HIDDEN_PROGRAMS = new Set(["세미나", "VOD", "전체"]);

// 태그 비교는 띄어쓰기 무시 (예: 경험정리 = 경험 정리).
const nospace = (s: string) => s.replace(/\s+/g, "");

function toProfile(m: OperationMentor): MentorProfile {
  const desiredJobRoles = (m.desiredJobRoles ?? "")
    .split(/[,/·\n]+/)
    .map((s) => s.trim())
    .filter(Boolean);
  const tags = m.programs.filter((p) => !HIDDEN_PROGRAMS.has(p));
  const anyJob = desiredJobRoles.includes(ANY_JOB);
  // 고객에게는 '실제 사용할 기업명'을 보여 주고, 비어 있을 때만 현재 재직 기업명을 쓴다.
  const company = m.displayCompany?.trim() || m.company?.trim() || null;
  const jobs = [...new Set([...desiredJobRoles.filter((r) => r !== ANY_JOB), ...tags.filter((t) => JOB_TAGS.includes(t))])];
  if (jobs.length === 0 && !anyJob && m.jobRole?.trim()) jobs.push(m.jobRole.trim());
  return {
    activityName: m.activityName?.trim() || null,
    url: /^https?:\/\//i.test(m.url?.trim() ?? "") ? m.url!.trim() : null,
    company,
    jobRole: m.jobRole,
    desiredJobRoles,
    jobs,
    jobFilters: toJobFilters(jobs),
    anyJob,
    // 멘토 DB '프로그램'의 규모 태그가 먼저, 없으면 COMPANY_SIZE 표.
    companySize:
      tags.find((t) => SIZE_TAGS.includes(t)) ||
      (company && COMPANY_SIZE[company]) ||
      (m.company?.trim() && COMPANY_SIZE[m.company.trim()]) ||
      null,
    programs: [
      ...new Set(
        tags
          .filter((t) => !JOB_TAGS.includes(t) && !SIZE_TAGS.includes(t))
          .map((t) => MENTORING_TYPES.find((m) => (m.tags ?? [m.label]).some((x) => nospace(x) === nospace(t)))?.label ?? t),
      ),
    ],
    // 서류 합격은 회사만 보여 준다 (직무는 빼고, 같은 회사는 한 번만).
    documentPasses: [...new Set(m.documentPasses.map((p) => p.company?.trim()).filter((c): c is string => !!c))],
  };
}

async function load(): Promise<Record<string, MentorProfile>> {
  const base = process.env.LETS_OPERATION_BASE_URL?.replace(/\/$/, "");
  const token = process.env.LETS_OPERATION_API_TOKEN?.trim();
  if (!base || !token) {
    console.warn("[mentor-profiles] LETS_OPERATION_BASE_URL / LETS_OPERATION_API_TOKEN 미설정 — 프로필 없이 표시");
    return {};
  }
  const res = await fetch(`${base}/api/external/mentors`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`멘토 DB 요청 실패 (${res.status})`);
  const { mentors } = (await res.json()) as { mentors: OperationMentor[] };

  // Redash 의 멘토명(본명)과 맞춰 붙이기 위한 키. 이 맵은 서버 밖으로 나가지 않는다.
  const byRealName: Record<string, MentorProfile> = {};
  for (const m of mentors) byRealName[m.realName.trim()] = toProfile(m);
  return byRealName;
}

const loadCached = unstable_cache(load, ["mentor-profiles-v10"], { revalidate: 300 });

/** 본명 → 프로필. 멘토 DB 를 못 읽어도 페이지는 프로필 없이 뜬다. */
export async function fetchMentorProfiles(): Promise<Record<string, MentorProfile>> {
  try {
    return await loadCached();
  } catch (e) {
    console.error("[mentor-profiles] 불러오기 실패:", e);
    return {};
  }
}
