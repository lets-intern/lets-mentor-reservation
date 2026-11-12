import "server-only";
import { BOOKING_URLS } from "@/config/mentors";
import type { MentorProfile } from "./mentor-profiles";
import type { SlotRow } from "./redash";

/** 브라우저로 보내는 공개 데이터. 본명·멘티·프로그램 신청 내역 등은 포함하지 않는다. */
export type PublicMentor = {
  id: string;
  nickname: string;
  bookingUrl: string | null;
  profile: Omit<MentorProfile, "activityName"> | null;
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
  const open = rows.filter((r) => r.예약구분 === "예약가능" && kst(r.슬롯시작) > now);

  const ids = new Map<string, PublicMentor>();
  for (const r of open) {
    if (ids.has(r.멘토명)) continue;
    const found = profiles[r.멘토명.trim()];
    const nickname = found?.activityName || r.멘토닉네임?.trim() || "렛츠커리어 멘토";
    let profile: PublicMentor["profile"] = null;
    if (found) {
      const { activityName: _omit, ...rest } = found;
      void _omit;
      profile = rest;
    }
    ids.set(r.멘토명, {
      id: `m${ids.size + 1}`,
      nickname,
      bookingUrl: BOOKING_URLS[nickname] || BOOKING_URLS[r.멘토닉네임?.trim() ?? ""] || null,
      profile,
    });
  }

  const slots = open
    .map((r) => {
      const [date, start] = r.슬롯시작.split(" ");
      return { mentorId: ids.get(r.멘토명)!.id, date, start, end: r.슬롯종료.split(" ")[1] };
    })
    .sort((a, b) => (a.date + a.start).localeCompare(b.date + b.start));

  return { mentors: [...ids.values()], slots, updatedAt: retrievedAt };
}
