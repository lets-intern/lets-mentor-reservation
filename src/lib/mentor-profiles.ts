import "server-only";
import { unstable_cache } from "next/cache";

/** lets-operation 멘토 DB(/api/external/mentors) 응답 한 건. */
type OperationMentor = {
  mentorId: string;
  realName: string;
  activityName: string | null;
  active: boolean;
  company: string | null;
  jobRole: string | null;
  desiredJobRoles: string | null;
  programs: string[];
  careers: { company: string | null; jobRole: string | null; jobTitle: string | null; years: string | null }[];
  documentPasses: { company: string | null; jobRole: string | null }[];
};

/** 고객에게 보여도 되는 멘토 프로필. 본명·메모·SNS 등은 담지 않는다. */
export type MentorProfile = {
  activityName: string | null;
  company: string | null;
  jobRole: string | null;
  desiredJobRoles: string[];
  programs: string[];
  careers: string[];
  documentPasses: string[];
};

// 고객이 신청하는 1:1 멘토링과 관계없는 운영용 분류는 뺀다.
const HIDDEN_PROGRAMS = new Set(["세미나", "VOD", "전체"]);

const join = (...parts: (string | null)[]) => parts.filter(Boolean).join(" · ");

function toProfile(m: OperationMentor): MentorProfile {
  return {
    activityName: m.activityName?.trim() || null,
    company: m.company,
    jobRole: m.jobRole,
    desiredJobRoles: (m.desiredJobRoles ?? "")
      .split(/[,/·\n]+/)
      .map((s) => s.trim())
      .filter(Boolean),
    programs: m.programs.filter((p) => !HIDDEN_PROGRAMS.has(p)),
    careers: m.careers.map((c) => join(c.company, c.jobRole, c.jobTitle, c.years)).filter(Boolean),
    documentPasses: m.documentPasses.map((p) => join(p.company, p.jobRole)).filter(Boolean),
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

const loadCached = unstable_cache(load, ["mentor-profiles"], { revalidate: 300 });

/** 본명 → 프로필. 멘토 DB 를 못 읽어도 페이지는 프로필 없이 뜬다. */
export async function fetchMentorProfiles(): Promise<Record<string, MentorProfile>> {
  try {
    return await loadCached();
  } catch (e) {
    console.error("[mentor-profiles] 불러오기 실패:", e);
    return {};
  }
}
