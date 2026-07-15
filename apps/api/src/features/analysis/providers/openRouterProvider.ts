import { type AnalyzeResponse } from "@nado/shared/analysis";
import {
  MAX_ANALYSIS_PROVIDER_OUTPUT_TOKENS,
  type AnalysisModelId,
} from "@nado/shared/analysis-input";
import {
  executeStructuredAnalysisRequest,
  type FetchLike,
} from "./providerRequest.js";
import { openRouterAnalyzeResponseJsonSchema } from "./openRouterAnalysisContract.js";
import { parseOpenRouterAnalysisResponse } from "./structuredAnalysisResponse.js";

const GLM_MODEL_ID: AnalysisModelId = "z-ai/glm-5.2";
const KIMI_MODEL_ID: AnalysisModelId = "moonshotai/kimi-k2.7-code";
const KIMI_STRUCTURED_OUTPUT_PROVIDER = "moonshotai/int4";

export function analyzeWithOpenRouter({
  apiKey,
  endpoint,
  fetchImplementation,
  instructions,
  model,
  text,
  timeoutMs,
}: {
  apiKey: string;
  endpoint: string;
  fetchImplementation: FetchLike;
  instructions: string;
  model: AnalysisModelId;
  text: string;
  timeoutMs: number;
}): Promise<AnalyzeResponse> {
  return executeStructuredAnalysisRequest({
    apiKey,
    body: {
      messages: [
        {
          content: instructions,
          role: "system",
        },
        {
          content: text,
          role: "user",
        },
      ],
      max_tokens: MAX_ANALYSIS_PROVIDER_OUTPUT_TOKENS,
      model,
      provider: {
        require_parameters: true,
        sort: "throughput",
        ...(model === KIMI_MODEL_ID
          ? {
              allow_fallbacks: false,
              only: [KIMI_STRUCTURED_OUTPUT_PROVIDER],
            }
          : {}),
      },
      ...(model === GLM_MODEL_ID
        ? {
            reasoning: { enabled: false },
            temperature: 0,
          }
        : {}),
      response_format: {
        json_schema: {
          name: "nado_analysis_response",
          schema: openRouterAnalyzeResponseJsonSchema,
          strict: true,
        },
        type: "json_schema",
      },
    },
    endpoint,
    fetchImplementation,
    parseResponse: parseOpenRouterAnalysisResponse,
    provider: "OpenRouter",
    timeoutMs,
  });
}
