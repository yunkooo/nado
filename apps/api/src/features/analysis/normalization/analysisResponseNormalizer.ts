import type {
  AnalysisChunk,
  AnalysisSentence,
  AnalysisToken,
  AnalysisVocabularyItem,
  AnalyzeResponse,
} from "@nado/shared/analysis";

export function normalizeAnalysisChunks(
  analysis: AnalyzeResponse,
): AnalyzeResponse {
  if (analysis.status === "not_analyzable") {
    return analysis;
  }

  return {
    ...analysis,
    result: {
      ...analysis.result,
      sentences: analysis.result.sentences.map((sentence) => ({
        ...sentence,
        chunks: mergePredicateAdverbChunks(sentence.chunks),
      })),
    },
  };
}

export function normalizeCompactAnalysisResponse(
  analysis: AnalyzeResponse,
): AnalyzeResponse {
  const normalizedAnalysis = normalizeAnalysisChunks(analysis);

  if (normalizedAnalysis.status === "not_analyzable") {
    return normalizedAnalysis;
  }

  const vocabularyKeyByWord = createVocabularyKeyByWord(
    normalizedAnalysis.result.vocabularyItems,
  );
  const vocabularyKeys = new Set(
    normalizedAnalysis.result.vocabularyItems.map((item) => item.key),
  );

  return {
    ...normalizedAnalysis,
    result: {
      ...normalizedAnalysis.result,
      sentences: normalizedAnalysis.result.sentences.map((sentence) => ({
        ...sentence,
        tokens: supplementSentenceTokens({
          sentence,
          vocabularyKeyByWord,
          vocabularyKeys,
        }),
      })),
    },
  };
}

function supplementSentenceTokens({
  sentence,
  vocabularyKeyByWord,
  vocabularyKeys,
}: {
  sentence: AnalysisSentence;
  vocabularyKeyByWord: Map<string, string>;
  vocabularyKeys: Set<string>;
}): AnalysisToken[] {
  const tokens: AnalysisToken[] = [];
  let existingTokenIndex = 0;

  for (const word of extractEnglishWords(sentence.source)) {
    const existingTokenMatch = findMatchingAnalysisToken(
      sentence.tokens,
      existingTokenIndex,
      word,
    );
    const existingToken = existingTokenMatch?.token;

    if (existingTokenMatch) {
      existingTokenIndex = existingTokenMatch.nextIndex;
    }

    const vocabularyKey =
      resolveValidVocabularyKey(existingToken?.vocabularyKey, vocabularyKeys) ??
      vocabularyKeyByWord.get(normalizeVocabularyMatchText(word));

    tokens.push({
      text: existingToken?.text ?? word,
      vocabularyKey: vocabularyKey ?? null,
    });
  }

  return tokens.length > 0 ? tokens : sentence.tokens;
}

function createVocabularyKeyByWord(vocabularyItems: AnalysisVocabularyItem[]) {
  const vocabularyKeyCandidateByWord = new Map<
    string,
    {
      priority: number;
      vocabularyKey: string;
    }
  >();

  for (const item of vocabularyItems) {
    if (item.type === "word") {
      for (const candidate of [
        {
          priority: vocabularyCandidatePriority.wordTerm,
          value: item.term,
        },
        {
          priority: vocabularyCandidatePriority.wordFallback,
          value: item.baseForm,
        },
        {
          priority: vocabularyCandidatePriority.wordFallback,
          value: item.saveLabel,
        },
      ]) {
        const words = extractEnglishWords(candidate.value);
        const firstWord = words[0];

        if (!firstWord || words.length !== 1) {
          continue;
        }

        setVocabularyKeyCandidate({
          priority: candidate.priority,
          vocabularyKey: item.key,
          vocabularyKeyCandidateByWord,
          word: firstWord,
        });
      }

      continue;
    }

    for (const candidate of [item.term, item.baseForm, item.saveLabel]) {
      for (const word of extractEnglishWords(candidate)) {
        if (shouldIndexPhraseWord(word)) {
          setVocabularyKeyCandidate({
            priority: vocabularyCandidatePriority.phrase,
            vocabularyKey: item.key,
            vocabularyKeyCandidateByWord,
            word,
          });
        }
      }
    }
  }

  return new Map(
    Array.from(vocabularyKeyCandidateByWord, ([word, candidate]) => [
      word,
      candidate.vocabularyKey,
    ]),
  );
}

const vocabularyCandidatePriority = {
  phrase: 1,
  wordFallback: 2,
  wordTerm: 3,
} as const;

function setVocabularyKeyCandidate({
  priority,
  vocabularyKey,
  vocabularyKeyCandidateByWord,
  word,
}: {
  priority: number;
  vocabularyKey: string;
  vocabularyKeyCandidateByWord: Map<
    string,
    {
      priority: number;
      vocabularyKey: string;
    }
  >;
  word: string;
}) {
  const normalizedWord = normalizeVocabularyMatchText(word);
  const existingCandidate = vocabularyKeyCandidateByWord.get(normalizedWord);

  if (!existingCandidate || priority > existingCandidate.priority) {
    vocabularyKeyCandidateByWord.set(normalizedWord, {
      priority,
      vocabularyKey,
    });
  }
}

function findMatchingAnalysisToken(
  tokens: AnalysisToken[],
  startIndex: number,
  word: string,
) {
  const normalizedWord = normalizeVocabularyMatchText(word);

  for (let index = startIndex; index < tokens.length; index += 1) {
    if (
      normalizeVocabularyMatchText(tokens[index]?.text ?? "") === normalizedWord
    ) {
      return {
        nextIndex: index + 1,
        token: tokens[index],
      };
    }
  }

  return null;
}

function resolveValidVocabularyKey(
  vocabularyKey: string | null | undefined,
  vocabularyKeys: Set<string>,
) {
  return vocabularyKey && vocabularyKeys.has(vocabularyKey)
    ? vocabularyKey
    : null;
}

const englishWordPattern = /[A-Za-z]+(?:['’-][A-Za-z]+)*/g;
const ignoredPhraseWordPattern =
  /^(?:a|an|and|as|at|but|by|for|from|if|in|into|of|on|or|the|to|with)$/i;

function extractEnglishWords(text: string) {
  return Array.from(text.matchAll(englishWordPattern), (match) => match[0]);
}

function shouldIndexPhraseWord(word: string) {
  return word.length > 2 && !ignoredPhraseWordPattern.test(word);
}

function normalizeVocabularyMatchText(text: string) {
  return text.normalize("NFKC").toLocaleLowerCase("en-US");
}

const predicateAdverbChunkPattern =
  /^(?:always|usually|often|sometimes|rarely|seldom|frequently|regularly|generally|typically|normally|occasionally|never)\b/i;
const sentenceBoundaryPattern = /[.!?;:]$/;

function mergePredicateAdverbChunks(chunks: AnalysisChunk[]): AnalysisChunk[] {
  const normalizedChunks: AnalysisChunk[] = [];

  for (const chunk of chunks) {
    const previousChunk = normalizedChunks.at(-1);

    if (
      previousChunk &&
      shouldMergePredicateAdverbChunk(previousChunk, chunk)
    ) {
      normalizedChunks[normalizedChunks.length - 1] = {
        english: `${previousChunk.english} ${chunk.english}`,
        literalTranslation: `${previousChunk.literalTranslation} ${chunk.literalTranslation}`,
        role: `${previousChunk.role} ${chunk.role}`,
      };
      continue;
    }

    normalizedChunks.push(chunk);
  }

  return normalizedChunks;
}

function shouldMergePredicateAdverbChunk(
  previousChunk: AnalysisChunk,
  currentChunk: AnalysisChunk,
) {
  return (
    !sentenceBoundaryPattern.test(previousChunk.english.trim()) &&
    predicateAdverbChunkPattern.test(currentChunk.english.trim())
  );
}
