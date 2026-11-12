import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "1:1 LIVE 멘토링 예약 가능 시간 | 렛츠커리어",
  description: "렛츠커리어 1:1 LIVE 멘토링, 멘토별 예약 가능한 시간을 확인하세요.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ko">
      <head>
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css"
        />
      </head>
      <body className="antialiased">{children}</body>
    </html>
  );
}
