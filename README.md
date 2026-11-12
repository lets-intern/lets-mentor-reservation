# 렛츠커리어 1:1 LIVE 멘토링 예약 가능 시간

고객에게 멘토별 프로필(멘토링 직무 · 봐줄 수 있는 서류 · 서류 합격 · 경력)과 예약 가능한 시간을 한눈에 보여주는 페이지입니다.

## 데이터

| 데이터 | 출처 | 캐시 |
| --- | --- | --- |
| 예약 가능 슬롯 | Redash 쿼리 #446 (`[렛츠커리어] 1:1 LIVE 멘토링 예약 가능 슬롯`) | 5분 (5분이 지나면 쿼리 재실행) |
| 멘토 프로필 | lets-operation 멘토 DB `/api/external/mentors` | 5분 |

두 데이터는 서버에서 멘토 본명으로 연결합니다. 본명 · 멘티 · 신청 프로그램 · 메모 · SNS 등은 브라우저로 보내지 않습니다.

## 설정

`.env.example` 을 `.env.local` 로 복사해 값을 채웁니다.

- `REDASH_BASE_URL`, `REDASH_API_KEY`, `REDASH_QUERY_ID` — Redash 쿼리 API 키
- `LETS_OPERATION_BASE_URL`, `LETS_OPERATION_API_TOKEN` — lets-operation 의 `EXTERNAL_API_TOKEN` 과 같은 값

멘토별 예약 페이지 링크는 `src/config/mentors.ts` 에 적습니다. 비어 있으면 그 멘토의 예약 버튼이 표시되지 않습니다.

## 실행

```bash
npm install
npm run dev    # http://localhost:3000
```
