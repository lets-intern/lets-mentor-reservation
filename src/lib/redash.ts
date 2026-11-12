import "server-only";
import { unstable_cache } from "next/cache";

export type SlotRow = {
  멘토명: string;
  멘토닉네임: string | null;
  슬롯시작: string; // "YYYY-MM-DD HH:mm" (KST)
  슬롯종료: string;
  "길이(분)": number;
  요일: string;
  예약구분: "예약가능" | "1:1 멘토링" | "챌린지 피드백";
  예약멘티: string | null;
  프로그램명: string | null;
  슬롯상태코드: number;
  시점: "지남" | "예정";
  슬롯등록일시: string;
};

type RedashResult = {
  query_result: { retrieved_at: string; data: { rows: SlotRow[] } };
};

function config() {
  const base = process.env.REDASH_BASE_URL?.replace(/\/$/, "");
  const key = process.env.REDASH_API_KEY;
  const id = process.env.REDASH_QUERY_ID ?? "446";
  if (!base || !key) {
    throw new Error("REDASH_BASE_URL / REDASH_API_KEY 환경변수가 설정되지 않았습니다.");
  }
  return { base, key, id };
}

async function redash<T>(path: string, init?: RequestInit): Promise<T> {
  const { base, key } = config();
  const res = await fetch(`${base}${path}`, {
    ...init,
    headers: { Authorization: `Key ${key}`, "Content-Type": "application/json", ...init?.headers },
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`Redash ${path} 요청 실패 (${res.status})`);
  return res.json() as Promise<T>;
}

/**
 * 쿼리 결과를 가져온다. Redash에 저장된 결과가 maxAgeSec보다 오래됐으면 쿼리를 재실행한다.
 * 재실행이 실패하면 마지막으로 저장된 결과로 대체한다.
 */
async function fetchSlotsUncached(maxAgeSec: number): Promise<{ rows: SlotRow[]; retrievedAt: string }> {
  const { id } = config();
  let result: RedashResult;
  try {
    result = await executeWithMaxAge(id, maxAgeSec);
  } catch (e) {
    console.error("[redash] 재실행 실패, 저장된 결과 사용:", e);
    result = await redash<RedashResult>(`/api/queries/${id}/results.json`);
  }
  return { rows: result.query_result.data.rows, retrievedAt: result.query_result.retrieved_at };
}

async function executeWithMaxAge(id: string, maxAge: number): Promise<RedashResult> {
  const started = await redash<RedashResult | { job: { id: string } }>(
    `/api/queries/${id}/results`,
    { method: "POST", body: JSON.stringify({ max_age: maxAge }) },
  );
  if ("query_result" in started) return started;

  // 쿼리 전용 API 키는 /api/jobs 를 볼 권한이 없다(404). 대신 쿼리의 최신 결과가
  // 이번 실행 이후 것으로 바뀌었는지 확인한다. 실행이 끝나면 Redash 가 최신 결과를 갈아 끼운다.
  const deadline = Date.now() + 30_000;
  const freshAfter = Date.now() - maxAge * 1000;
  while (Date.now() < deadline) {
    await new Promise((r) => setTimeout(r, 1500));
    const latest = await redash<RedashResult>(`/api/queries/${id}/results.json`);
    if (new Date(latest.query_result.retrieved_at).getTime() >= freshAfter) return latest;
  }
  throw new Error("쿼리 실행 시간 초과");
}

/** 서버에서 5분간 결과를 캐시해, 방문자가 많아도 Redash 호출은 5분에 한 번 이하로 유지한다. */
export const fetchSlots = unstable_cache(fetchSlotsUncached, ["redash-slots"], { revalidate: 300 });
