import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import {
  AnalysisResult,
  Chip,
  InputComposer,
  ReadingChunkLine,
  type AnalysisResultData,
} from "./index";

const noop = () => undefined;

const analysisFixture: AnalysisResultData = {
  sourceText:
    "We are trying to build a reading habit, but the setup keeps getting in the way.",
  translation: [
    "우리는 읽기 습관을 만들려고 하고 있지만, 준비 과정이 계속 방해가 되고 있다.",
  ],
  translationNotes: [
    {
      term: "setup",
      note: "여기서는 설치보다 준비 과정이나 환경에 가깝다.",
    },
  ],
  sentences: [
    {
      indexLabel: "01",
      chunks: [
        {
          english: "We are trying to build",
          korean: "우리는 만들려고 하고 있다",
        },
        {
          english: "a reading habit",
          korean: "읽기 습관을",
        },
      ],
      naturalTranslation:
        "우리는 읽기 습관을 만들려고 하고 있지만 준비 과정이 방해가 된다.",
      grammarPoints: [
        {
          target: "are trying to",
          type: "현재진행",
          explanation: "지금 진행 중인 시도나 노력을 나타낸다.",
        },
      ],
    },
  ],
  vocabularySuggestions: [
    {
      term: "setup",
      meaning: "준비 과정",
      note: "환경이나 준비 흐름을 뜻합니다.",
      type: "word",
    },
  ],
};

const firstSentence = analysisFixture.sentences[0];

describe("analysis design system components", () => {
  it("renders disabled composer submit state for empty input", () => {
    const markup = renderToStaticMarkup(
      <InputComposer
        label="기본 분석"
        maxLength={200}
        onSubmit={noop}
        onValueChange={noop}
        placeholder="영어 문장을 붙여넣으세요"
        submitAriaLabel="분석 요청"
        value=""
      />,
    );

    expect(markup).toContain("기본 분석");
    expect(markup).toContain("0 / 200");
    expect(markup).toContain("disabled");
    expect(markup).toContain('aria-label="분석 요청"');
  });

  it("counts normalized code points for the composer display", () => {
    const markup = renderToStaticMarkup(
      <InputComposer
        label="기본 분석"
        maxLength={1}
        onSubmit={noop}
        onValueChange={noop}
        placeholder="영어 문장을 붙여넣으세요"
        value="  𝐀  "
      />,
    );

    expect(markup).toContain("1 / 1");
    expect(markup).not.toContain("disabled");
  });

  it("renders text submit button when action label is a word", () => {
    const markup = renderToStaticMarkup(
      <InputComposer
        actionLabel="분석"
        label="기본 분석"
        maxLength={200}
        onSubmit={noop}
        onValueChange={noop}
        placeholder="영어 문장을 붙여넣으세요"
        value="I need help."
      />,
    );

    expect(markup).toContain("분석");
    expect(markup).toContain("nado-button--md");
    expect(markup).not.toContain("nado-button--icon");
  });

  it("renders suggestion chips with prefix and disabled state", () => {
    const markup = renderToStaticMarkup(
      <Chip disabled label="setup" prefix="저장" />,
    );

    expect(markup).toContain("nado-chip");
    expect(markup).toContain("저장");
    expect(markup).toContain("setup");
    expect(markup).toContain("disabled");
  });

  it("renders vocabulary suggestions as static chips by default", () => {
    const markup = renderToStaticMarkup(
      <AnalysisResult result={analysisFixture} />,
    );

    expect(markup).toContain('<span class="nado-chip"');
    expect(markup).not.toContain('<button class="nado-chip"');
  });

  it("renders vocabulary suggestions as save buttons when a handler is provided", () => {
    const markup = renderToStaticMarkup(
      <AnalysisResult
        getVocabularySuggestionState={() => "saved"}
        onSaveVocabularySuggestion={noop}
        result={analysisFixture}
      />,
    );

    expect(markup).toContain('<button class="nado-chip"');
    expect(markup).toContain('aria-label="setup: 준비 과정 저장"');
    expect(markup).toContain("저장됨");
    expect(markup).toContain("disabled");
  });

  it("renders idle vocabulary save buttons with a plus prefix", () => {
    const markup = renderToStaticMarkup(
      <AnalysisResult
        getVocabularySuggestionState={() => "idle"}
        onSaveVocabularySuggestion={noop}
        result={analysisFixture}
      />,
    );

    expect(markup).toContain('<span class="nado-chip__prefix">+</span>');
    expect(markup).toContain('aria-label="setup: 준비 과정 저장"');
  });

  it("renders reading chunks with slash separators", () => {
    expect(firstSentence).toBeDefined();

    const markup = renderToStaticMarkup(
      <ReadingChunkLine chunks={firstSentence?.chunks ?? []} />,
    );

    expect(markup).toContain("We are trying to build");
    expect(markup).toContain("우리는 만들려고 하고 있다");
    expect(markup).toContain("nado-reading-line__slash");
  });

  it("renders the complete analysis result sections", () => {
    const markup = renderToStaticMarkup(
      <AnalysisResult result={analysisFixture} />,
    );

    expect(markup).toContain("전체 자연스러운 번역");
    expect(markup).toContain("번역 포인트");
    expect(markup).toContain("문장별 분석");
    expect(markup).toContain("우선 저장 추천");
    expect(markup).toContain("are trying to");
    expect(markup).toContain("준비 과정");
  });
});
