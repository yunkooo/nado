import { analyzeResponseJsonSchema, analyzeResponseSchema } from "@nado/shared";
import type { AnalyzeResponse } from "@nado/shared";

type FetchLike = (
  input: RequestInfo | URL,
  init?: RequestInit,
) => Promise<Response>;

export type OpenAIAnalysisServiceOptions = {
  apiKey?: string;
  endpoint?: string;
  fetch?: FetchLike;
  model?: string;
};

const DEFAULT_OPENAI_ENDPOINT = "https://api.openai.com/v1/responses";
const DEFAULT_OPENAI_MODEL = "gpt-5.5";

const ANALYSIS_INSTRUCTIONS = [
  "당신은 한국인 영어 학습자를 돕는 영어 독해 분석기입니다.",
  "사용자 입력을 자연스러운 한국어 번역, 번역 포인트, 문장별 chunk 분석, 문법 포인트, 저장 가능한 단어/표현으로 분석하세요.",
  "설명은 한국어로 작성하고, 과도한 리포트가 아니라 500자 이내 짧은 입력을 학습하기에 충분한 밀도로 작성하세요.",
  "vocabularyItems에는 원문 속 모든 영어 단어를 저장 가능한 후보로 포함하세요. 표현/숙어는 추가 후보로 포함할 수 있습니다.",
  "영어 학습 입력으로 보기 어려우면 not_analyzable 상태와 짧은 한국어 이유를 반환하세요.",
  "원문 문장을 단어장 저장 데이터로 보관한다는 표현을 만들지 마세요.",
].join("\n");

export function createOpenAIAnalysisService(
  options: OpenAIAnalysisServiceOptions = {},
) {
  const apiKey = options.apiKey ?? process.env.OPENAI_API_KEY ?? "";
  const endpoint = options.endpoint ?? DEFAULT_OPENAI_ENDPOINT;
  const fetchImplementation = options.fetch ?? globalThis.fetch;
  const model =
    options.model ?? process.env.OPENAI_MODEL ?? DEFAULT_OPENAI_MODEL;

  return {
    async analyze(text: string): Promise<AnalyzeResponse> {
      if (apiKey.trim().length === 0) {
        throw new Error("OPENAI_API_KEY is required.");
      }

      const response = await fetchImplementation(endpoint, {
        body: JSON.stringify({
          input: text,
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
      });

      if (!response.ok) {
        throw new Error("OpenAI request failed.");
      }

      const payload = await readJson(response);
      const outputText = extractOutputText(payload);
      const parsedOutput = parseJson(outputText);
      const parsedAnalysis = analyzeResponseSchema.safeParse(parsedOutput);

      if (!parsedAnalysis.success) {
        throw new Error(
          "OpenAI structured output did not match the analysis schema.",
        );
      }

      return parsedAnalysis.data;
    },
  };
}

async function readJson(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    throw new Error("OpenAI response was not valid JSON.");
  }
}

function parseJson(value: string): unknown {
  try {
    return JSON.parse(value);
  } catch {
    throw new Error("OpenAI output text was not valid JSON.");
  }
}

function extractOutputText(payload: unknown): string {
  if (!isRecord(payload)) {
    throw new Error("OpenAI response did not include output text.");
  }

  if (typeof payload.output_text === "string") {
    return payload.output_text;
  }

  if (!Array.isArray(payload.output)) {
    throw new Error("OpenAI response did not include output text.");
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
    throw new Error("OpenAI response did not include output text.");
  }

  return textParts.join("");
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
