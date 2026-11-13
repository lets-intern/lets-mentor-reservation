import "server-only";
import { BOOKING_CUTOFF_HOURS, BOOKING_URLS, HIDDEN_MENTORS } from "@/config/mentors";
import type { MentorProfile } from "./mentor-profiles";
import type { SlotRow } from "./redash";

/** 브라우저로 보내는 공개 데이터. 본명·멘티·프로그램 신청 내역 등은 포함하지 않는다. */
export type PublicMentor = {
  id: string;
  nickname: string;
  bookingUrl: string | null;
  profile: Omit<MentorProfile, "activityName" | "url"> | null;
};
export type PublicSlot = { mentorId: string; date: string; start: string; end: string };
export type PublicData = { mentors: PublicMentor[]; slots: PublicSlot[]; updatedAt: string };

const kst = (s: string) => new Date(`${s.replace(" ", "T")}:00+09:00`);

export function toPublic(
  rows: SlotRow[],
  retrievedAt: string,
  profiles: Record<string, MentorProfile>,
  now = new Date(),
): PublicData {
  // 노출 정책: 시작까지 BOOKING_CUTOFF_HOURS 이상 남은 '예약가능' 슬롯만.
  const cutoff = new Date(now.getTime() + BOOKING_CUTOFF_HOURS * 3600_000);
  const open = rows.filter((r) => r.예약구분 === "예약가능" && kst(r.슬롯시작) >= cutoff);

  const ids = new Map<string, PublicMentor>();
  const hidden = new Set<string>();
  for (const r of open) {
    if (ids.has(r.멘토명) || hidden.has(r.멘토명)) continue;
    const found = profiles[r.멘토명.trim()];
    const nickname = found?.activityName || r.멘토닉네임?.trim() || "렛츠커리어 멘토";
    if (HIDDEN_MENTORS.includes(nickname)) {
      hidden.add(r.멘토명);
      continue;
    }
    let profile: PublicMentor["profile"] = null;
    if (found) {
      // 이름은 nickname, 주소는 bookingUrl 로 따로 내보낸다.
      const { activityName: _name, url: _url, ...rest } = found;
      void _name;
      void _url;
      profile = rest;
    }
    ids.set(r.멘토명, {
      id: `m${ids.size + 1}`,
      nickname,
      // 멘토 DB 의 url 이 우선, 없으면 config 의 BOOKING_URLS.
      bookingUrl: found?.url || BOOKING_URLS[nickname] || BOOKING_URLS[r.멘토닉네임?.trim() ?? ""] || null,
      profile,
    });
  }

  const slots = open
    .filter((r) => ids.has(r.멘토명))
    .map((r) => {
      const [date, start] = r.슬롯시작.split(" ");
      return { mentorId: ids.get(r.멘토명)!.id, date, start, end: r.슬롯종료.split(" ")[1] };
    })
    .sort((a, b) => (a.date + a.start).localeCompare(b.date + b.start));

  return { mentors: [...ids.values()], slots, updatedAt: retrievedAt };
}
