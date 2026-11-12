import { fetchMentorProfiles } from "@/lib/mentor-profiles";
import { toPublic } from "@/lib/public-slots";
import { fetchSlots } from "@/lib/redash";
import SlotBoard from "./slot-board";

// 요청마다 렌더링하되, Redash · 멘토 DB 응답은 각각 5분간 서버에 캐시된다.
export const dynamic = "force-dynamic";

export default async function Page() {
  try {
    const [{ rows, retrievedAt }, profiles] = await Promise.all([fetchSlots(300), fetchMentorProfiles()]);
    return <SlotBoard data={toPublic(rows, retrievedAt, profiles)} />;
  } catch (e) {
    console.error("[page] 데이터 로드 실패:", e);
    return (
      <main className="page">
        <div className="notice">
          <strong>예약 가능 시간을 불러오지 못했어요.</strong>
          <p>잠시 후 다시 시도해 주세요.</p>
        </div>
      </main>
    );
  }
}
