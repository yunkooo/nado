import type { MobileSentenceAnalysis } from "../../api/analysisApi";

export function findMatchingMobileSentenceToken(
  tokens: MobileSentenceAnalysis["tokens"],
  startIndex: number,
  word: string,
) {
  const normalizedWord = normalizeMobileVocabularyMatchText(word);

  for (let index = startIndex; index < tokens.length; index += 1) {
    if (
      normalizeMobileVocabularyMatchText(tokens[index]?.text ?? "") ===
      normalizedWord
    ) {
      return {
        nextTokenIndex: index + 1,
        token: tokens[index],
      };
    }
  }

  return {
    nextTokenIndex: startIndex,
    token: undefined,
  };
}

function normalizeMobileVocabularyMatchText(text: string) {
  return text.normalize("NFKC").toLocaleLowerCase("en-US");
}
