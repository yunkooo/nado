import { describe, expect, it } from "vitest";
import {
  AnalysisResult,
  Button,
  Card,
  Chip,
  InputComposer,
  InputSample,
  ReadingChunkLine,
  ReviewCard,
  SentenceAnalysis,
  Stack,
  Text,
  VocabularyListItem,
  VocabularySuggestionList,
  VocabularyWordToken,
  tokens,
} from "./web";

describe("@nado/ui/web exports", () => {
  it("re-exports the current Web/Desktop public surface", () => {
    expect(Button).toBeTypeOf("function");
    expect(Card).toBeTypeOf("function");
    expect(Chip).toBeTypeOf("function");
    expect(InputComposer).toBeTypeOf("function");
    expect(Stack).toBeTypeOf("function");
    expect(Text).toBeTypeOf("function");
    expect(AnalysisResult).toBeTypeOf("function");
    expect(InputSample).toBeTypeOf("function");
    expect(ReadingChunkLine).toBeTypeOf("function");
    expect(SentenceAnalysis).toBeTypeOf("function");
    expect(VocabularySuggestionList).toBeTypeOf("function");
    expect(VocabularyWordToken).toBeTypeOf("function");
    expect(ReviewCard).toBeTypeOf("function");
    expect(VocabularyListItem).toBeTypeOf("function");
    expect(tokens.color.primary).toBeTypeOf("string");
  });
});
