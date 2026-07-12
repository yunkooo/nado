import {
  ANALYSIS_ERROR_MESSAGES,
  analyzeResponseSchema,
  type AnalyzeResponse,
} from "@nado/shared/analysis";
import { BadGatewayError } from "../../../shared/errors/httpErrors.js";
import {
  normalizeAnalysisChunks,
  normalizeOpenRouterAnalysisResponse,
} from "../normalization/analysisResponseNormalizer.js";

export class StructuredOutputError extends BadGatewayError {
  constructor(message: string, cause?: unknown) {
    super(
      "invalid_analysis_response",
      ANALYSIS_ERROR_MESSAGES.invalid_analysis_response,
      {
        cause: cause ?? new Error(message),
        retryable: true,
      },
    );
  }
}

export async function parseOpenAIAnalysisResponse(
  response: Response,
): Promise<AnalyzeResponse> {
  const payload = await readJson(response, "OpenAI");
  const outputText = extractOpenAIOutputText(payload);
  const parsedAnalysis = parseStructuredAnalysis(outputText, "OpenAI");

  return normalizeAnalysisChunks(parsedAnalysis);
}

export async function parseOpenRouterAnalysisResponse(
  response: Response,
): Promise<AnalyzeResponse> {
  const payload = await readJson(response, "OpenRouter");
  const outputText = extractOpenRouterOutputText(payload);
  const parsedAnalysis = parseStructuredAnalysis(outputText, "OpenRouter");

  return normalizeOpenRouterAnalysisResponse(parsedAnalysis);
}

async function readJson(
  response: Response,
  provider: string,
): Promise<unknown> {
  try {
    return await response.json();
  } catch (error) {
    if (isAbortError(error)) {
      throw error;
    }

    throw new StructuredOutputError(
      `${provider} response was not valid JSON.`,
      error,
    );
  }
}

function parseStructuredAnalysis(
  value: string,
  provider: string,
): AnalyzeResponse {
  let parsedOutput: unknown;

  try {
    parsedOutput = JSON.parse(value);
  } catch (error) {
    throw new StructuredOutputError(
      `${provider} output text was not valid JSON.`,
      error,
    );
  }

  const parsedAnalysis = analyzeResponseSchema.safeParse(parsedOutput);

  if (!parsedAnalysis.success) {
    throw new StructuredOutputError(
      `${provider} structured output did not match the analysis schema.`,
      parsedAnalysis.error,
    );
  }

  return parsedAnalysis.data;
}

function extractOpenAIOutputText(payload: unknown): string {
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

function isAbortError(error: unknown): boolean {
  return (
    (error instanceof DOMException && error.name === "AbortError") ||
    (typeof error === "object" &&
      error !== null &&
      "name" in error &&
      error.name === "AbortError")
  );
}
