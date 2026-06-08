import type { Metadata } from "next";
import "@nado/ui/styles.css";
import "./globals.css";

export const metadata: Metadata = {
  description: "영어 문장을 독해 노트로 바꾸는 학습 도구",
  title: "nado",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
