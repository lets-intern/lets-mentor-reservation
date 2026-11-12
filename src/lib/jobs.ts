import { JOB_GROUPS } from "@/config/mentors";

const norm = (s: string) => s.replace(/\s+/g, "").toLowerCase();

const byJob = new Map<string, string>();
const byGroup = new Map<string, string[]>();
for (const g of JOB_GROUPS) {
  const labels = g.jobs.map((j) => j.label);
  for (const a of [g.group, ...(g.aliases ?? [])]) byGroup.set(norm(a), labels);
  for (const j of g.jobs) for (const a of [j.label, ...(j.aliases ?? [])]) byJob.set(norm(a), j.label);
}

/** 멘토 DB 직무 값들 → 직무 필터 선택지 이름. 직무 이름이 먼저, 분류 이름이면 그 분류 전체, 둘 다 아니면 원래 값. */
export function toJobFilters(values: string[]): string[] {
  const out = new Set<string>();
  for (const v of values) {
    const k = norm(v);
    const job = byJob.get(k);
    if (job) out.add(job);
    else if (byGroup.has(k)) byGroup.get(k)!.forEach((l) => out.add(l));
    else out.add(v);
  }
  return [...out];
}

/** 정해진 직무 분류 + 어디에도 안 걸리는 값은 '기타' 분류로. */
export function jobFilterGroups(extra: string[]): { group: string; options: string[] }[] {
  const known = new Set(JOB_GROUPS.flatMap((g) => g.jobs.map((j) => j.label)));
  const others = [...new Set(extra.filter((v) => !known.has(v)))].sort((a, b) => a.localeCompare(b, "ko"));
  return [
    ...JOB_GROUPS.map((g) => ({ group: g.group, options: g.jobs.map((j) => j.label) })),
    ...(others.length ? [{ group: "기타", options: others }] : []),
  ];
}
