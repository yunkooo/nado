import { useState } from "react";
import { MAX_ANALYSIS_TEXT_LENGTH } from "@nado/shared";
import { InputComposer } from "@nado/ui";

export function App() {
  const [text, setText] = useState(
    "I was wondering if you could help me with this issue.",
  );

  return (
    <main className="desktop-shell">
      <section className="desktop-main">
        <p className="desktop-eyebrow">Tauri desktop</p>
        <h1>웹 UI를 재사용하는 nado 데스크톱 시작점</h1>
        <p>
          MVP 데스크톱 앱은 온라인 API를 호출하고, 웹과 같은 디자인 시스템
          컴포넌트를 사용합니다.
        </p>
      </section>
      <InputComposer
        actionLabel="분석"
        maxLength={MAX_ANALYSIS_TEXT_LENGTH}
        onSubmit={() => undefined}
        onValueChange={setText}
        placeholder="영어 문장을 입력하세요."
        value={text}
      />
    </main>
  );
}
