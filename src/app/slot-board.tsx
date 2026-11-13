"use client";

import { useEffect, useMemo, useState } from "react";
import {
  BOTTOM_MENTORS,
  COMPANY_SIZE_ORDER,
  MENTORING_TYPES,
} from "@/config/mentors";
import { jobFilterGroups } from "@/lib/jobs";
import type { PublicData, PublicMentor, PublicSlot } from "@/lib/public-slots";

const WEEKDAY = ["일", "월", "화", "수", "목", "금", "토"];
const dayInfo = (d: string) => {
  // "YYYY-MM-DD" 는 KST 달력 날짜. UTC 자정으로 읽어야 getUTCDay 가 같은 날의 요일을 준다.
  const wd = new Date(`${d}T00:00:00Z`).getUTCDay();
  const [, m, day] = d.split("-").map(Number);
  return { m, day, wd: WEEKDAY[wd], sun: wd === 0, sat: wd === 6 };
};
const shortDay = (d: string) => {
  const i = dayInfo(d);
  return `${i.m}/${i.day}(${i.wd})`;
};
const startsAt = (s: PublicSlot) => new Date(`${s.date}T${s.start}:00+09:00`);
const withTitle = (name: string) =>
  name.endsWith("멘토") ? name : `${name} 멘토`;

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

  const dates = useMemo(
    () => [...new Set(slots.map((s) => s.date))].sort(),
    [slots],
  );

  // 필터 버튼은 지금 예약 가능한 멘토가 가진 값으로만 만든다.
  const options = useMemo(() => {
    const live = data.mentors.filter((m) => byMentor.has(m.id) && m.profile);
    const collect = (
      pick: (p: NonNullable<PublicMentor["profile"]>) => (string | null)[],
    ) => [
      ...new Set(
        live.flatMap((m) => pick(m.profile!)).filter((v): v is string => !!v),
      ),
    ];
    const sizeRank = (v: string) => {
      const i = COMPANY_SIZE_ORDER.indexOf(v);
      return i === -1 ? COMPANY_SIZE_ORDER.length : i;
    };
    return {
      // 멘토링 유형은 정해진 목록을 항상 보여 주고, 목록에 없는 태그만 뒤에 붙인다.
      program: [
        ...new Set([
          ...MENTORING_TYPES.map((t) => t.label),
          ...collect((p) => p.programs),
        ]),
      ],
      // 직무는 정해진 분류를 항상 보여 주고, 분류에 없는 멘토 직무는 '기타'로 붙인다.
      job: jobFilterGroups(collect((p) => p.jobFilters)),
      size: collect((p) => [p.companySize]).sort(
        (a, b) => sizeRank(a) - sizeRank(b),
      ),
    };
  }, [data.mentors, byMentor]);

  const [program, setProgram] = useState<string | null>(null);
  const [job, setJob] = useState<string | null>(null);
  const [size, setSize] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  // 보기 방식은 주소(?view=calendar)에 남겨 새로고침·링크 공유 때도 유지한다.
  const [view, setViewState] = useState<"mentor" | "calendar">("mentor");
  useEffect(() => {
    if (new URLSearchParams(window.location.search).get("view") === "calendar") setViewState("calendar");
  }, []);
  const setView = (v: "mentor" | "calendar") => {
    setViewState(v);
    const url = new URL(window.location.href);
    if (v === "calendar") url.searchParams.set("view", "calendar");
    else url.searchParams.delete("view");
    window.history.replaceState(null, "", url);
  };

  const mentors = useMemo(() => {
    const q = query.trim().toLowerCase();
    return data.mentors
      .filter((m) => byMentor.has(m.id))
      .filter((m) => !program || m.profile?.programs.includes(program))
      .filter(
        (m) => !job || m.profile?.anyJob || m.profile?.jobFilters.includes(job),
      )
      .filter((m) => !size || m.profile?.companySize === size)
      .filter((m) => {
        if (!q) return true;
        const p = m.profile;
        const hay = [
          m.nickname,
          p?.company,
          p?.jobRole,
          p?.companySize,
          ...(p?.jobs ?? []),
          ...(p?.desiredJobRoles ?? []),
          ...(p?.documentPasses ?? []),
        ];
        return hay.some((v) => v?.toLowerCase().includes(q));
      })
      .sort((a, b) => {
        // BOTTOM_MENTORS 는 맨 아래, 적힌 순서대로. 나머지는 가장 빠른 시간 순.
        const rank = (m: PublicMentor) => {
          const i = BOTTOM_MENTORS.indexOf(m.nickname);
          return i === -1 ? -1 : i;
        };
        const ra = rank(a),
          rb = rank(b);
        if (ra !== rb) return ra - rb;
        return (
          startsAt(byMentor.get(a.id)![0]).getTime() -
          startsAt(byMentor.get(b.id)![0]).getTime()
        );
      });
  }, [data.mentors, byMentor, program, job, size, query]);

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
        <p className="eyebrow">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.png" alt="" width={20} height={17} className="brand-logo" />
          LETS CAREER · 1:1 LIVE 멘토링
        </p>
        <h1>나에게 맞는 멘토와 예약 가능한 시간을 한눈에</h1>
        <p className="lead">
          멘토마다 전문 직무와 멘토링 유형이 달라요. 프로필을 확인하고 원하는
          날짜를 눌러 시간을 확인하세요.
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
            <div className="toolbar-row">
              <div className="filters" role="group" aria-label="멘토 거르기">
                <FilterSelect
                  label="멘토링 유형"
                  options={options.program}
                  value={program}
                  onChange={setProgram}
                />
                <FilterSelect
                  label="직무"
                  groups={options.job}
                  value={job}
                  onChange={setJob}
                />
                <FilterSelect
                  label="기업 규모"
                  options={options.size}
                  value={size}
                  onChange={setSize}
                />
                {(program || job || size) && (
                  <button
                    className="filter-reset"
                    onClick={() => {
                      setProgram(null);
                      setJob(null);
                      setSize(null);
                    }}
                  >
                    초기화
                  </button>
                )}
              </div>
              <div
                className="view-toggle"
                role="radiogroup"
                aria-label="보기 방식"
              >
                <button
                  role="radio"
                  aria-checked={view === "mentor"}
                  onClick={() => setView("mentor")}
                >
                  멘토별
                </button>
                <button
                  role="radio"
                  aria-checked={view === "calendar"}
                  onClick={() => setView("calendar")}
                >
                  날짜별
                </button>
              </div>
            </div>
          </div>

          {view === "calendar" && mentors.length > 0 ? (
            <CalendarGrid mentors={mentors} byMentor={byMentor} now={now} />
          ) : (
            <div className="mentor-cards">
              {mentors.map((m) => (
                <MentorCard
                  key={m.id}
                  mentor={m}
                  slots={byMentor.get(m.id)!}
                  dates={dates}
                />
              ))}
              {mentors.length === 0 && (
                <div className="notice">
                  <strong>조건에 맞는 멘토가 없어요.</strong>
                  <p>검색어나 필터를 바꿔 보세요.</p>
                </div>
              )}
            </div>
          )}
        </>
      )}

      <footer className="foot">
        <p>
          {updated} 기준이에요. 예약 상황에 따라 실제 예약 가능 여부는 달라질 수
          있어요.
        </p>
      </footer>
    </main>
  );
}

function MentorCard({
  mentor,
  slots,
  dates,
}: {
  mentor: PublicMentor;
  slots: PublicSlot[];
  dates: string[];
}) {
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
        <div className="mcard-title">
          <h2>{withTitle(mentor.nickname)}</h2>
          {headline && <p className="headline">{headline}</p>}
        </div>
        <div className="mcard-side">
          <p className="soonest">
            가장 빠른 시간{" "}
            <b>
              {shortDay(slots[0].date)} {slots[0].start}
            </b>
          </p>
          <BookingButton url={mentor.bookingUrl} />
        </div>
      </header>

      {p && (
        <dl className="profile">
          {(p.jobs.length > 0 || p.anyJob) && (
            <Row label="멘토링 직무">
              <ul className="tags">
                {[...p.jobs, ...(p.anyJob ? ["직무무관"] : [])].map((r) => (
                  <li key={r}>{r}</li>
                ))}
              </ul>
            </Row>
          )}
          {p.programs.length > 0 && (
            <Row label="멘토링 유형">
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
        </dl>
      )}

      <div className="avail">
        <p className="avail-label">
          예약 가능한 날짜 <span>총 {slots.length}개 시간</span>
        </p>
        <div
          className="day-row"
          role="radiogroup"
          aria-label={`${mentor.nickname} 예약 가능한 날짜`}
        >
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

const kstToday = (d: Date) => new Date(d.getTime() + 9 * 3600_000).toISOString().slice(0, 10);
const addDay = (d: string) => {
  const t = new Date(`${d}T00:00:00Z`);
  t.setUTCDate(t.getUTCDate() + 1);
  return t.toISOString().slice(0, 10);
};

/** 멘토(행) × 날짜(열) 캘린더. 칸에는 그날 예약 가능한 시간 수, 누르면 아래에 시간이 열린다. */
function CalendarGrid({
  mentors,
  byMentor,
  now,
}: {
  mentors: PublicMentor[];
  byMentor: Map<string, PublicSlot[]>;
  now: Date | null;
}) {
  const today = now ? kstToday(now) : null;

  // 오늘(또는 첫 슬롯 날짜)부터 마지막 슬롯 날짜까지 빠짐없이 이어서 보여 준다.
  const days = useMemo(() => {
    const all = mentors.flatMap((m) => byMentor.get(m.id)!.map((s) => s.date)).sort();
    if (all.length === 0) return [];
    let d = today && today < all[0] ? today : all[0];
    const last = all[all.length - 1];
    const out: string[] = [];
    while (d <= last && out.length < 120) {
      out.push(d);
      d = addDay(d);
    }
    return out;
  }, [mentors, byMentor, today]);

  const counts = useMemo(() => {
    const m = new Map<string, PublicSlot[]>();
    for (const mentor of mentors)
      for (const s of byMentor.get(mentor.id)!) {
        const k = `${mentor.id}|${s.date}`;
        m.set(k, [...(m.get(k) ?? []), s]);
      }
    return m;
  }, [mentors, byMentor]);

  const [picked, setPicked] = useState<{ id: string; date: string } | null>(null);
  const pickedMentor = picked && mentors.find((m) => m.id === picked.id);
  const pickedSlots = picked ? counts.get(`${picked.id}|${picked.date}`) : undefined;

  return (
    <section className="mcard grid-cal" aria-label="날짜별 예약 가능 시간">
      <div className="grid-scroll">
        <table>
          <thead>
            <tr>
              <th scope="col" className="gc-corner">
                멘토
              </th>
              {days.map((d) => {
                const i = dayInfo(d);
                return (
                  <th
                    key={d}
                    scope="col"
                    className={`gc-day ${i.sun ? "sun" : i.sat ? "sat" : ""} ${d === today ? "today" : ""}`}
                  >
                    <span className="gc-day-in">
                      <span className="gc-day-d">
                        {i.m}/{i.day}
                      </span>
                      <span className="gc-day-w">{i.wd}</span>
                    </span>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {mentors.map((m) => (
              <tr key={m.id}>
                <th scope="row" className="gc-mentor">
                  <b>{withTitle(m.nickname)}</b>
                  {m.profile?.company && <span>{m.profile.company}</span>}
                </th>
                {days.map((d) => {
                  const n = counts.get(`${m.id}|${d}`)?.length ?? 0;
                  const on = picked?.id === m.id && picked.date === d;
                  return (
                    <td key={d}>
                      {n > 0 ? (
                        <button
                          className="gc-cell"
                          aria-pressed={on}
                          aria-label={`${withTitle(m.nickname)} ${shortDay(d)} 예약 가능 ${n}개 시간`}
                          onClick={() => setPicked(on ? null : { id: m.id, date: d })}
                        >
                          {n}
                        </button>
                      ) : (
                        <span className="gc-empty" aria-hidden>
                          –
                        </span>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {pickedMentor && pickedSlots ? (
        <div className="gc-detail" aria-live="polite">
          <div className="gc-detail-head">
            <p className="avail-label">
              {withTitle(pickedMentor.nickname)} <span>{shortDay(picked!.date)} · {pickedSlots.length}개 시간</span>
            </p>
            <BookingButton url={pickedMentor.bookingUrl} />
          </div>
          <ul className="times">
            {pickedSlots.map((s) => (
              <li key={s.start}>{s.start}</li>
            ))}
          </ul>
        </div>
      ) : (
        <p className="gc-hint">숫자는 그날 예약 가능한 시간 수예요. 칸을 누르면 시간을 볼 수 있어요.</p>
      )}
    </section>
  );
}

/** 멘토 예약 페이지로 가는 버튼. 주소가 아직 없으면 눌리지 않는 '준비 중' 상태로 보여 준다. */
function BookingButton({ url }: { url: string | null }) {
  if (!url)
    return (
      <span className="cta cta-off" aria-disabled="true">
        예약 페이지 준비 중
      </span>
    );
  return (
    <a className="cta" href={url} target="_blank" rel="noopener noreferrer">
      예약하러 가기 <span aria-hidden>→</span>
    </a>
  );
}

function Row({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
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

function FilterSelect({
  label,
  options = [],
  groups,
  value,
  onChange,
}: {
  label: string;
  options?: string[];
  /** 있으면 분류별로 묶어(optgroup) 보여 준다. */
  groups?: { group: string; options: string[] }[];
  value: string | null;
  onChange: (v: string | null) => void;
}) {
  if (options.length === 0 && !groups?.length) return null;
  const item = (o: string) => (
    <option key={o} value={o}>
      {o}
    </option>
  );
  return (
    <label className="filter" data-active={value !== null}>
      <span className="sr-only">{label}</span>
      <select
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value || null)}
      >
        <option value="">{label}</option>
        {groups
          ? groups.map((g) => (
              <optgroup key={g.group} label={g.group}>
                {g.options.map(item)}
              </optgroup>
            ))
          : options.map(item)}
      </select>
      <svg aria-hidden viewBox="0 0 12 12" width="12" height="12">
        <path
          d="M3 4.5 6 7.5 9 4.5"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </label>
  );
}
