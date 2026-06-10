import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import {
  AnalysisResult,
  Chip,
  InputComposer,
  InputSample,
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
      tokens: [
        { text: "We", vocabularyKey: "we" },
        { text: "are", vocabularyKey: "be" },
        { text: "trying", vocabularyKey: "try" },
        { text: "to", vocabularyKey: "to" },
        { text: "build", vocabularyKey: "build" },
        { text: "a", vocabularyKey: "a" },
        { text: "reading", vocabularyKey: "reading" },
        { text: "habit", vocabularyKey: "habit" },
      ],
      grammarPoints: [
        {
          target: "are trying to",
          type: "현재진행",
          explanation: "지금 진행 중인 시도나 노력을 나타낸다.",
        },
      ],
    },
  ],
  vocabularyItems: [
    {
      baseForm: "habit",
      contextMeaning: "반복해서 이어가는 행동을 말합니다.",
      key: "habit",
      meaning: "습관",
      partOfSpeech: "명사",
      term: "habit",
      type: "word",
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

  it("renders submitted input text without a visible sample label", () => {
    const markup = renderToStaticMarkup(
      <InputSample
        maxLength={200}
        text="What to avoid when organizing state"
      />,
    );
    const textIndex = markup.indexOf("What to avoid when organizing state");
    const countIndex = markup.indexOf("35 / 200");

    expect(markup).toContain("What to avoid when organizing state");
    expect(markup).toContain("35 / 200");
    expect(markup).toContain("nado-input-sample__count");
    expect(markup).not.toContain("nado-input-sample__header");
    expect(markup).not.toContain("입력 예시");
    expect(textIndex).toBeGreaterThan(-1);
    expect(countIndex).toBeGreaterThan(textIndex);
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

    expect(markup).toContain('class="nado-chip"');
    expect(markup).not.toContain('<button class="nado-chip"');
  });

  it("shows saved vocabulary suggestions as saved disabled buttons", () => {
    const markup = renderToStaticMarkup(
      <AnalysisResult
        getVocabularySuggestionState={() => "saved"}
        onSaveVocabularySuggestion={noop}
        result={analysisFixture}
      />,
    );

    expect(markup).toContain('<button class="nado-chip"');
    expect(markup).toContain('aria-label="setup: 준비 과정 저장됨"');
    expect(markup).toContain('<span class="nado-chip__prefix">저장됨</span>');
    expect(markup).not.toContain('<span class="nado-chip__prefix">+</span>');
    expect(markup).toContain("disabled");
  });

  it("keeps static chip accessibility labels when rendered as spans", () => {
    const markup = renderToStaticMarkup(
      <AnalysisResult result={analysisFixture} />,
    );

    expect(markup).toContain('aria-label="setup: 준비 과정"');
  });

  it("keeps saving vocabulary suggestions disabled while showing progress", () => {
    const markup = renderToStaticMarkup(
      <AnalysisResult
        getVocabularySuggestionState={() => "saving"}
        onSaveVocabularySuggestion={noop}
        result={analysisFixture}
      />,
    );

    expect(markup).toContain('<span class="nado-chip__prefix">저장 중</span>');
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

  it("renders vocabulary hover popovers for matched sentence words", () => {
    const markup = renderToStaticMarkup(
      <AnalysisResult
        activeVocabularyKey="habit"
        getVocabularySuggestionState={() => "idle"}
        onSaveVocabularySuggestion={noop}
        result={analysisFixture}
      />,
    );

    expect(markup).toContain("nado-word-token-wrap--open");
    expect(markup).toContain('aria-label="habit 뜻과 저장 액션 보기"');
    expect(markup).toContain('aria-expanded="true"');
    expect(markup).toContain("nado-word-popover");
    expect(markup).toContain('role="group"');
    expect(markup).not.toContain('role="tooltip"');
    expect(markup).toContain("명사");
    expect(markup).toContain("습관");
    expect(markup).toContain("반복해서 이어가는 행동을 말합니다.");
    expect(markup).toContain('aria-label="habit 저장"');
    expect(markup).toContain("+ 저장");
  });

  it("shows saved vocabulary popover actions as saved disabled buttons", () => {
    const markup = renderToStaticMarkup(
      <AnalysisResult
        activeVocabularyKey="habit"
        getVocabularySuggestionState={() => "saved"}
        onSaveVocabularySuggestion={noop}
        result={analysisFixture}
      />,
    );

    expect(markup).toContain('aria-label="habit 저장됨"');
    expect(markup).toContain("저장됨");
    expect(markup).toContain("disabled");
    expect(markup).not.toContain("+ 저장");
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
