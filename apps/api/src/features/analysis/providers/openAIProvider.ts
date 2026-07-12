import {
  analyzeResponseJsonSchema,
  type AnalyzeResponse,
} from "@nado/shared/analysis";
import { MAX_ANALYSIS_PROVIDER_OUTPUT_TOKENS } from "@nado/shared/analysis-input";
import {
  executeStructuredAnalysisRequest,
  type FetchLike,
} from "./providerRequest.js";
import { parseOpenAIAnalysisResponse } from "./structuredAnalysisResponse.js";

export function analyzeWithOpenAI({
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
  model: string;
  text: string;
  timeoutMs: number;
}): Promise<AnalyzeResponse> {
  return executeStructuredAnalysisRequest({
    apiKey,
    body: {
      input: text,
      instructions,
      max_output_tokens: MAX_ANALYSIS_PROVIDER_OUTPUT_TOKENS,
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
    },
    endpoint,
    fetchImplementation,
    parseResponse: parseOpenAIAnalysisResponse,
    provider: "OpenAI",
    timeoutMs,
  });
}
