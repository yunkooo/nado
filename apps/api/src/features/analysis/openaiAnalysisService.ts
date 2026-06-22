import {
  DEFAULT_ANALYSIS_MODEL_ID,
  analyzeResponseJsonSchema,
  analyzeResponseSchema,
  isOpenRouterAnalysisModelId,
} from "@nado/shared";
import type {
  AnalysisChunk,
  AnalysisModelId,
  AnalysisSentence,
  AnalysisToken,
  AnalysisVocabularyItem,
  AnalyzeRequest,
  AnalyzeResponse,
} from "@nado/shared";
import { UpstreamTimeoutError } from "../../shared/errors/httpErrors.js";

type FetchLike = (
  input: RequestInfo | URL,
  init?: RequestInit,
) => Promise<Response>;

export type OpenAIAnalysisServiceOptions = {
  apiKey?: string;
  endpoint?: string;
  fetch?: FetchLike;
  model?: string;
  openRouterApiKey?: string;
  openRouterEndpoint?: string;
  openRouterTimeoutMs?: number;
  timeoutMs?: number;
};

const DEFAULT_OPENAI_ENDPOINT = "https://api.openai.com/v1/responses";
const DEFAULT_OPENAI_MODEL = "gpt-5.4-mini";
const DEFAULT_OPENROUTER_ENDPOINT =
  "https://openrouter.ai/api/v1/chat/completions";
const DEFAULT_OPENAI_TIMEOUT_MS = 30_000;
const DEFAULT_OPENROUTER_TIMEOUT_MS = 150_000;

const ANALYSIS_INSTRUCTIONS = [
  "당신은 한국인 영어 학습자를 돕는 영어 독해 분석기입니다.",
  "사용자 입력을 자연스러운 한국어 번역, 번역 포인트, 문장별 chunk 분석, 문법 포인트, 저장 가능한 단어/표현으로 분석하세요.",
  "설명은 한국어로 작성하고, 과도한 리포트가 아니라 200자 이내 짧은 입력을 학습하기에 충분한 밀도로 작성하세요.",
  "vocabularyItems에는 원문 속 모든 영어 단어를 저장 가능한 후보로 포함하세요. 표현/숙어는 추가 후보로 포함할 수 있습니다.",
  "영어 학습 입력으로 보기 어려우면 not_analyzable 상태와 짧은 한국어 이유를 반환하세요.",
  "원문 문장을 단어장 저장 데이터로 보관한다는 표현을 만들지 마세요.",
].join("\n");

export function createOpenAIAnalysisService(
  options: OpenAIAnalysisServiceOptions = {},
) {
  const apiKey = options.apiKey ?? process.env.OPENAI_API_KEY ?? "";
  const endpoint = options.endpoint ?? DEFAULT_OPENAI_ENDPOINT;
  const openRouterApiKey =
    options.openRouterApiKey ?? process.env.OPENROUTER_API_KEY ?? "";
  const openRouterEndpoint =
    options.openRouterEndpoint ?? DEFAULT_OPENROUTER_ENDPOINT;
  const fetchImplementation = options.fetch ?? globalThis.fetch;
  const model =
    options.model ?? process.env.OPENAI_MODEL ?? DEFAULT_OPENAI_MODEL;
  const openAITimeoutMs =
    options.timeoutMs ??
    readTimeoutMs(process.env.OPENAI_TIMEOUT_MS, "OPENAI_TIMEOUT_MS") ??
    DEFAULT_OPENAI_TIMEOUT_MS;
  const openRouterTimeoutMs =
    options.openRouterTimeoutMs ??
    options.timeoutMs ??
    readTimeoutMs(process.env.OPENROUTER_TIMEOUT_MS, "OPENROUTER_TIMEOUT_MS") ??
    DEFAULT_OPENROUTER_TIMEOUT_MS;

  return {
    async analyze(input: AnalyzeRequest): Promise<AnalyzeResponse> {
      const requestedModel = input.model ?? DEFAULT_ANALYSIS_MODEL_ID;

      if (isOpenRouterAnalysisModel(requestedModel)) {
        return analyzeWithOpenRouter({
          apiKey: openRouterApiKey,
          endpoint: openRouterEndpoint,
          fetchImplementation,
          model: requestedModel,
          text: input.text,
          timeoutMs: openRouterTimeoutMs,
        });
      }

      if (apiKey.trim().length === 0) {
        throw new Error("OPENAI_API_KEY is required.");
      }

      for (let attempt = 0; attempt < 2; attempt += 1) {
        const abortController = new AbortController();
        const timeoutId = globalThis.setTimeout(() => {
          abortController.abort();
        }, openAITimeoutMs);

        try {
          const response = await fetchImplementation(endpoint, {
            body: JSON.stringify({
              input: input.text,
              instructions: ANALYSIS_INSTRUCTIONS,
              model,
              store: false,
              text: {
                format: {
                  name: "nado_analysis_response",
                  schema: analyzeResponseJsonSchema,
                  strict: true,
                  type: "json_schema",
                },
              },
            }),
            headers: {
              Authorization: `Bearer ${apiKey}`,
              "Content-Type": "application/json",
            },
            method: "POST",
            signal: abortController.signal,
          });

          if (!response.ok) {
            throw new Error("OpenAI request failed.");
          }

          try {
            return await parseAnalysisResponse(response);
          } catch (error) {
            if (isAbortError(error)) {
              throw error;
            }

            if (attempt === 0 && error instanceof StructuredOutputError) {
              continue;
            }

            throw error;
          }
        } catch (error) {
          if (isAbortError(error)) {
            throw new UpstreamTimeoutError(
              "analysis_timeout",
              "분석 요청 시간이 오래 걸리고 있어요. 잠시 후 다시 시도해 주세요.",
            );
          }

          throw error;
        } finally {
          globalThis.clearTimeout(timeoutId);
        }
      }

      throw new Error("OpenAI structured output retry failed.");
    },
  };
}

async function analyzeWithOpenRouter({
  apiKey,
  endpoint,
  fetchImplementation,
  model,
  text,
  timeoutMs,
}: {
  apiKey: string;
  endpoint: string;
  fetchImplementation: FetchLike;
  model: AnalysisModelId;
  text: string;
  timeoutMs: number;
}): Promise<AnalyzeResponse> {
  if (apiKey.trim().length === 0) {
    throw new Error("OPENROUTER_API_KEY is required.");
  }

  for (let attempt = 0; attempt < 2; attempt += 1) {
    const abortController = new AbortController();
    const timeoutId = globalThis.setTimeout(() => {
      abortController.abort();
    }, timeoutMs);

    try {
      const response = await fetchImplementation(endpoint, {
        body: JSON.stringify({
          messages: [
            {
              content: ANALYSIS_INSTRUCTIONS,
              role: "system",
            },
            {
              content: text,
              role: "user",
            },
          ],
          model,
          provider: {
            require_parameters: true,
          },
          response_format: {
            json_schema: {
              name: "nado_analysis_response",
              schema: analyzeResponseJsonSchema,
              strict: true,
            },
            type: "json_schema",
          },
        }),
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        method: "POST",
        signal: abortController.signal,
      });

      if (!response.ok) {
        throw new Error("OpenRouter request failed.");
      }

      try {
        return await parseOpenRouterAnalysisResponse(response);
      } catch (error) {
        if (isAbortError(error)) {
          throw error;
        }

        if (attempt === 0 && error instanceof StructuredOutputError) {
          continue;
        }

        throw error;
      }
    } catch (error) {
      if (isAbortError(error)) {
        throw new UpstreamTimeoutError(
          "analysis_timeout",
          "분석 요청 시간이 오래 걸리고 있어요. 잠시 후 다시 시도해 주세요.",
        );
      }

      throw error;
    } finally {
      globalThis.clearTimeout(timeoutId);
    }
  }

  throw new Error("OpenRouter structured output retry failed.");
}

async function parseAnalysisResponse(
  response: Response,
): Promise<AnalyzeResponse> {
  const payload = await readJson(response);
  const outputText = extractOutputText(payload);
  const parsedOutput = parseJson(outputText);
  const parsedAnalysis = analyzeResponseSchema.safeParse(parsedOutput);

  if (!parsedAnalysis.success) {
    throw new StructuredOutputError(
      "OpenAI structured output did not match the analysis schema.",
    );
  }

  return normalizeAnalysisChunks(parsedAnalysis.data);
}

async function parseOpenRouterAnalysisResponse(
  response: Response,
): Promise<AnalyzeResponse> {
  const payload = await readJson(response);
  const outputText = extractOpenRouterOutputText(payload);
  const parsedOutput = parseJson(outputText);
  const parsedAnalysis = analyzeResponseSchema.safeParse(parsedOutput);

  if (!parsedAnalysis.success) {
    throw new StructuredOutputError(
      "OpenRouter structured output did not match the analysis schema.",
    );
  }

  return normalizeOpenRouterAnalysisResponse(parsedAnalysis.data);
}

function normalizeAnalysisChunks(analysis: AnalyzeResponse): AnalyzeResponse {
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

function normalizeOpenRouterAnalysisResponse(
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

  for (const word of extractEnglishWords(
    sentence.chunks.map((chunk) => chunk.english).join(" "),
  )) {
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

    if (vocabularyKey) {
      tokens.push({
        text: existingToken?.text ?? word,
        vocabularyKey,
      });
    }
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
      const words = extractEnglishWords(candidate);

      if (item.type === "phrase") {
        for (const word of words) {
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

async function readJson(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch (error) {
    if (isAbortError(error)) {
      throw error;
    }

    throw new StructuredOutputError("OpenAI response was not valid JSON.");
  }
}

function parseJson(value: string): unknown {
  try {
    return JSON.parse(value);
  } catch {
    throw new StructuredOutputError("OpenAI output text was not valid JSON.");
  }
}

function extractOutputText(payload: unknown): string {
  if (!isRecord(payload)) {
    throw new StructuredOutputError(
      "OpenAI response did not include output text.",
    );
  }

  if (typeof payload.output_text === "string") {
    return payload.output_text;
  }

  if (!Array.isArray(payload.output)) {
    throw new StructuredOutputError(
      "OpenAI response did not include output text.",
    );
  }

  const textParts: string[] = [];

  for (const outputItem of payload.output) {
    if (!isRecord(outputItem) || !Array.isArray(outputItem.content)) {
      continue;
    }

    for (const contentItem of outputItem.content) {
      if (isRecord(contentItem) && typeof contentItem.text === "string") {
        textParts.push(contentItem.text);
      }
    }
  }

  if (textParts.length === 0) {
    throw new StructuredOutputError(
      "OpenAI response did not include output text.",
    );
  }

  return textParts.join("");
}

function extractOpenRouterOutputText(payload: unknown): string {
  if (!isRecord(payload) || !Array.isArray(payload.choices)) {
    throw new StructuredOutputError(
      "OpenRouter response did not include output text.",
    );
  }

  const firstChoice = payload.choices[0];

  if (!isRecord(firstChoice) || !isRecord(firstChoice.message)) {
    throw new StructuredOutputError(
      "OpenRouter response did not include output text.",
    );
  }

  const content = firstChoice.message.content;

  if (typeof content === "string") {
    return content;
  }

  if (!Array.isArray(content)) {
    throw new StructuredOutputError(
      "OpenRouter response did not include output text.",
    );
  }

  const textParts = content.flatMap((contentItem) =>
    isRecord(contentItem) && typeof contentItem.text === "string"
      ? [contentItem.text]
      : [],
  );

  if (textParts.length === 0) {
    throw new StructuredOutputError(
      "OpenRouter response did not include output text.",
    );
  }

  return textParts.join("");
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isOpenRouterAnalysisModel(
  model: AnalysisModelId,
): model is Exclude<AnalysisModelId, "gpt-5.4-mini"> {
  return isOpenRouterAnalysisModelId(model);
}

class StructuredOutputError extends Error {}

function isAbortError(error: unknown): boolean {
  return error instanceof DOMException && error.name === "AbortError";
}

function readTimeoutMs(
  value: string | undefined,
  envName: string,
): number | undefined {
  if (value === undefined || value.trim().length === 0) {
    return undefined;
  }

  const timeoutMs = Number(value);

  if (!Number.isInteger(timeoutMs) || timeoutMs <= 0) {
    throw new Error(`${envName} must be a positive integer.`);
  }

  return timeoutMs;
}
