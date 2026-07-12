import type { AnalyzeResponse } from "@nado/shared/analysis";
import {
  DEFAULT_ANALYSIS_MODEL_ID,
  isOpenRouterAnalysisModelId,
  type AnalysisModelId,
  type AnalyzeRequest,
} from "@nado/shared/analysis-input";
import { analyzeWithOpenAI } from "./providers/openAIProvider.js";
import { analyzeWithOpenRouter } from "./providers/openRouterProvider.js";
import type { FetchLike } from "./providers/providerRequest.js";

export type AnalysisServiceOptions = {
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

export function createAnalysisService(options: AnalysisServiceOptions = {}) {
  const apiKey = options.apiKey ?? process.env.OPENAI_API_KEY ?? "";
  const endpoint = options.endpoint ?? DEFAULT_OPENAI_ENDPOINT;
  const openRouterApiKey =
    options.openRouterApiKey ?? process.env.OPENROUTER_API_KEY ?? "";
  const openRouterEndpoint =
    options.openRouterEndpoint ?? DEFAULT_OPENROUTER_ENDPOINT;
  const fetchImplementation = options.fetch ?? globalThis.fetch;
  const openAIModel =
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
    analyze(input: AnalyzeRequest): Promise<AnalyzeResponse> {
      const requestedModel = input.model ?? DEFAULT_ANALYSIS_MODEL_ID;

      if (isOpenRouterModel(requestedModel)) {
        return analyzeWithOpenRouter({
          apiKey: openRouterApiKey,
          endpoint: openRouterEndpoint,
          fetchImplementation,
          instructions: ANALYSIS_INSTRUCTIONS,
          model: requestedModel,
          text: input.text,
          timeoutMs: openRouterTimeoutMs,
        });
      }

      return analyzeWithOpenAI({
        apiKey,
        endpoint,
        fetchImplementation,
        instructions: ANALYSIS_INSTRUCTIONS,
        model: openAIModel,
        text: input.text,
        timeoutMs: openAITimeoutMs,
      });
    },
  };
}

function isOpenRouterModel(
  model: AnalysisModelId,
): model is Exclude<AnalysisModelId, "gpt-5.4-mini"> {
  return isOpenRouterAnalysisModelId(model);
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
