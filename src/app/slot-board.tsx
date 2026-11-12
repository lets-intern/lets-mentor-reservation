"use client";

import { useEffect, useMemo, useState } from "react";
import type { PublicData, PublicMentor, PublicSlot } from "@/lib/public-slots";

const WEEKDAY = ["일", "월", "화", "수", "목", "금", "토"];
const dayInfo = (d: string) => {
  const wd = new Date(`${d}T00:00:00+09:00`).getUTCDay();
  const [, m, day] = d.split("-").map(Number);
  return { m, day, wd: WEEKDAY[wd], sun: wd === 0, sat: wd === 6 };
};
const shortDay = (d: string) => {
  const i = dayInfo(d);
  return `${i.m}/${i.day}(${i.wd})`;
};
const startsAt = (s: PublicSlot) => new Date(`${s.date}T${s.start}:00+09:00`);
const initialOf = (name: string) => name.replace("렛츠커리어 ", "").slice(0, 1);

export default function SlotBoard({ data }: { data: PublicData }) {
  // 서버 캐시 사이에 지나간 시간은 브라우저에서 한 번 더 걸러낸다.
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => setNow(new Date()), []);
  const slots = useMemo(
    () => (now ? data.slots.filter((s) => startsAt(s) > now) : data.slots),
    [data.slots, now],
  );

  const byMentor = useMemo(() => {
    const m = new Map<string, PublicSlot[]>();
    for (const s of slots) m.set(s.mentorId, [...(m.get(s.mentorId) ?? []), s]);
    return m;
  }, [slots]);

  const dates = useMemo(() => [...new Set(slots.map((s) => s.date))].sort(), [slots]);

  const programOptions = useMemo(() => {
    const set = new Set<string>();
    for (const m of data.mentors) m.profile?.programs.forEach((p) => set.add(p));
    return [...set];
  }, [data.mentors]);

  const [program, setProgram] = useState<string | null>(null);
  const [query, setQuery] = useState("");

  const mentors = useMemo(() => {
    const q = query.trim().toLowerCase();
    return data.mentors
      .filter((m) => byMentor.has(m.id))
      .filter((m) => !program || m.profile?.programs.includes(program))
      .filter((m) => {
        if (!q) return true;
        const p = m.profile;
        const hay = [m.nickname, p?.company, p?.jobRole, ...(p?.desiredJobRoles ?? []), ...(p?.careers ?? []), ...(p?.documentPasses ?? [])];
        return hay.some((v) => v?.toLowerCase().includes(q));
      })
      .sort((a, b) => startsAt(byMentor.get(a.id)![0]).getTime() - startsAt(byMentor.get(b.id)![0]).getTime());
  }, [data.mentors, byMentor, program, query]);

  const updated = new Date(data.updatedAt).toLocaleString("ko-KR", {
    timeZone: "Asia/Seoul",
    month: "long",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });

  const totalMentors = data.mentors.filter((m) => byMentor.has(m.id)).length;

  return (
    <main className="page">
      <header className="hero">
        <p className="eyebrow">LETS CAREER · 1:1 LIVE 멘토링</p>
        <h1>나에게 맞는 멘토와 예약 가능한 시간을 한눈에</h1>
        <p className="lead">
          멘토마다 전문 직무와 봐줄 수 있는 서류가 달라요. 프로필을 확인하고 원하는 날짜를 눌러 시간을 확인하세요.
        </p>
      </header>

      {totalMentors === 0 ? (
        <div className="notice">
          <strong>지금은 예약 가능한 시간이 없어요.</strong>
          <p>새 일정이 열리면 이 페이지에 바로 표시돼요.</p>
        </div>
      ) : (
        <>
          <div className="toolbar">
            <input
              type="search"
              className="search"
              placeholder="직무나 기업으로 찾기 (예: 마케팅, 삼성)"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              aria-label="직무나 기업으로 멘토 찾기"
            />
            {programOptions.length > 0 && (
              <div className="chips" role="group" aria-label="봐줄 수 있는 서류로 거르기">
                <button className="chip" aria-pressed={program === null} onClick={() => setProgram(null)}>
                  전체
                </button>
                {programOptions.map((p) => (
                  <button
                    key={p}
                    className="chip"
                    aria-pressed={program === p}
                    onClick={() => setProgram(program === p ? null : p)}
                  >
                    {p}
                  </button>
                ))}
              </div>
            )}
            <p className="result-count">
              멘토 <b>{mentors.length}</b>명
              {mentors.length !== totalMentors && <span> / 전체 {totalMentors}명</span>}
            </p>
          </div>

          <div className="mentor-cards">
            {mentors.map((m) => (
              <MentorCard key={m.id} mentor={m} slots={byMentor.get(m.id)!} dates={dates} />
            ))}
            {mentors.length === 0 && (
              <div className="notice">
                <strong>조건에 맞는 멘토가 없어요.</strong>
                <p>검색어나 서류 종류를 바꿔 보세요.</p>
              </div>
            )}
          </div>
        </>
      )}

      <footer className="foot">
        <p>{updated} 기준이에요. 예약 상황에 따라 실제 예약 가능 여부는 달라질 수 있어요.</p>
      </footer>
    </main>
  );
}

function MentorCard({ mentor, slots, dates }: { mentor: PublicMentor; slots: PublicSlot[]; dates: string[] }) {
  const counts = useMemo(() => {
    const c = new Map<string, number>();
    for (const s of slots) c.set(s.date, (c.get(s.date) ?? 0) + 1);
    return c;
  }, [slots]);
  const [openDate, setOpenDate] = useState<string>(slots[0].date);
  const activeDate = counts.has(openDate) ? openDate : slots[0].date;
  const times = slots.filter((s) => s.date === activeDate);
  const p = mentor.profile;
  const headline = [p?.company, p?.jobRole].filter(Boolean).join(" · ");

  return (
    <article className="mcard">
      <header className="mcard-head">
        <span className="avatar" aria-hidden>
          {initialOf(mentor.nickname)}
        </span>
        <div className="mcard-title">
          <h2>{mentor.nickname}</h2>
          {headline && <p className="headline">{headline}</p>}
        </div>
        <div className="mcard-side">
          <p className="soonest">
            가장 빠른 시간 <b>{shortDay(slots[0].date)} {slots[0].start}</b>
          </p>
          {mentor.bookingUrl && (
            <a className="cta" href={mentor.bookingUrl} target="_blank" rel="noopener noreferrer">
              예약하러 가기 <span aria-hidden>→</span>
            </a>
          )}
        </div>
      </header>

      {p && (
        <dl className="profile">
          {p.desiredJobRoles.length > 0 && (
            <Row label="멘토링 직무">
              <ul className="tags">
                {p.desiredJobRoles.map((r) => (
                  <li key={r}>{r}</li>
                ))}
              </ul>
            </Row>
          )}
          {p.programs.length > 0 && (
            <Row label="봐줄 수 있는 서류">
              <ul className="tags accent">
                {p.programs.map((r) => (
                  <li key={r}>{r}</li>
                ))}
              </ul>
            </Row>
          )}
          {p.documentPasses.length > 0 && (
            <Row label="서류 합격">
              <Clamp items={p.documentPasses} max={4} />
            </Row>
          )}
          {p.careers.length > 0 && (
            <Row label="경력">
              <Clamp items={p.careers} max={2} />
            </Row>
          )}
        </dl>
      )}

      <div className="avail">
        <p className="avail-label">
          예약 가능한 날짜 <span>총 {slots.length}개 시간</span>
        </p>
        <div className="day-row" role="radiogroup" aria-label={`${mentor.nickname} 예약 가능한 날짜`}>
          {dates.map((d) => {
            const i = dayInfo(d);
            const n = counts.get(d) ?? 0;
            return (
              <button
                key={d}
                role="radio"
                aria-checked={d === activeDate}
                disabled={n === 0}
                className={`day ${i.sun ? "sun" : i.sat ? "sat" : ""}`}
                onClick={() => setOpenDate(d)}
                aria-label={`${i.m}월 ${i.day}일 ${i.wd}요일, ${n ? `${n}개 시간` : "예약 불가"}`}
              >
                <span className="day-d">
                  {i.m}/{i.day}
                </span>
                <span className="day-w">{i.wd}</span>
                <span className="day-n">{n || "–"}</span>
              </button>
            );
          })}
        </div>
        <div className="times-wrap">
          <span className="times-date">{shortDay(activeDate)}</span>
          <ul className="times">
            {times.map((s) => (
              <li key={s.start}>{s.start}</li>
            ))}
          </ul>
        </div>
      </div>
    </article>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="prow">
      <dt>{label}</dt>
      <dd>{children}</dd>
    </div>
  );
}

function Clamp({ items, max }: { items: string[]; max: number }) {
  const [open, setOpen] = useState(false);
  const shown = open ? items : items.slice(0, max);
  return (
    <span className="clamp">
      {shown.join(", ")}
      {items.length > max && (
        <button className="more" onClick={() => setOpen(!open)}>
          {open ? "접기" : `외 ${items.length - max}개 더보기`}
        </button>
      )}
    </span>
  );
}
