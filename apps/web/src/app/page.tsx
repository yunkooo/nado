"use client";

import { useState } from "react";
import { MAX_ANALYSIS_TEXT_LENGTH } from "@nado/shared";
import { Button, InputComposer } from "@nado/ui";

const sampleChunks = [
  { english: "I was wondering if", korean: "제가 ~인지 궁금해하고 있었습니다" },
  { english: "you could help me", korean: "당신이 저를 도와줄 수 있는지" },
  { english: "with this issue", korean: "이 문제와 관련해서" },
];

export default function HomePage() {
  const [text, setText] = useState(
    "I was wondering if you could help me with this issue.",
  );

  const helperText =
    text.trim().length === 0
      ? "영어 한 문장 또는 짧은 문단을 입력해 주세요."
      : "입력한 문장은 AI 분석을 위해 전송되며, 단어장에는 원문 문장을 저장하지 않습니다.";

  return (
    <main className="nado-app-shell">
      <aside className="nado-sidebar" aria-label="주요 화면">
        <strong className="nado-logo">nado</strong>
        <nav className="nado-nav">
          <a className="nado-nav__item nado-nav__item--active" href="/">
            분석
          </a>
          <a className="nado-nav__item" href="/vocabulary">
            단어장
          </a>
          <a className="nado-nav__item" href="/review">
            복습
          </a>
        </nav>
      </aside>

      <section className="nado-workspace" aria-label="분석 화면">
        <header className="nado-topbar">
          <div>
            <p className="nado-eyebrow">English reading note</p>
            <h1>영어 문장을 독해 노트로 바꾸기</h1>
          </div>
          <Button variant="secondary">Google 로그인</Button>
        </header>

        <div className="nado-result">
          <section className="nado-section" aria-labelledby="translation-title">
            <h2 id="translation-title">자연스러운 번역</h2>
            <p>이 문제를 도와주실 수 있는지 궁금합니다.</p>
          </section>

          <section className="nado-section" aria-labelledby="point-title">
            <h2 id="point-title">번역 포인트</h2>
            <p>
              <strong>was wondering if</strong>는 직접 묻기보다 부드럽고
              정중하게 요청을 시작하는 표현입니다.
            </p>
          </section>

          <section className="nado-section" aria-labelledby="chunk-title">
            <h2 id="chunk-title">문장별 분석</h2>
            <div className="nado-chunks">
              {sampleChunks.map((chunk, index) => (
                <span className="nado-chunk" key={chunk.english}>
                  <span className="nado-chunk__english">{chunk.english}</span>
                  <span className="nado-chunk__korean">{chunk.korean}</span>
                  {index < sampleChunks.length - 1 ? (
                    <span className="nado-slash">/</span>
                  ) : null}
                </span>
              ))}
            </div>
          </section>

          <section className="nado-section" aria-labelledby="suggestion-title">
            <h2 id="suggestion-title">우선 저장 추천</h2>
            <div className="nado-chip-row">
              <button className="nado-chip" type="button">
                wonder if
              </button>
              <button className="nado-chip" type="button">
                help with
              </button>
            </div>
          </section>
        </div>

        <footer className="nado-composer-wrap">
          <p className="nado-helper">{helperText}</p>
          <InputComposer
            actionLabel="분석"
            maxLength={MAX_ANALYSIS_TEXT_LENGTH}
            onSubmit={() => undefined}
            onValueChange={setText}
            placeholder="영어 문장을 입력하세요."
            value={text}
          />
        </footer>
      </section>
    </main>
  );
}
