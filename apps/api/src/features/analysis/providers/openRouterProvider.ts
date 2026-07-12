import {
  analyzeResponseJsonSchema,
  type AnalyzeResponse,
} from "@nado/shared/analysis";
import {
  MAX_ANALYSIS_PROVIDER_OUTPUT_TOKENS,
  type AnalysisModelId,
} from "@nado/shared/analysis-input";
import {
  executeStructuredAnalysisRequest,
  type FetchLike,
} from "./providerRequest.js";
import { parseOpenRouterAnalysisResponse } from "./structuredAnalysisResponse.js";

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
      },
      response_format: {
        json_schema: {
          name: "nado_analysis_response",
          schema: analyzeResponseJsonSchema,
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
