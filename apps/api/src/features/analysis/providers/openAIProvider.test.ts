import { describe, expect, it } from "vitest";
import { MAX_ANALYSIS_PROVIDER_OUTPUT_TOKENS } from "@nado/shared/analysis-input";
import { analyzeWithOpenAI } from "./openAIProvider.js";

const compactAnalyzeResponse = {
  reason: "영어 학습 입력이 아닙니다.",
  result: null,
  status: "not_analyzable",
} as const;

const sampleAnalyzeResponse = {
  reason: compactAnalyzeResponse.reason,
  status: compactAnalyzeResponse.status,
} as const;

describe("analyzeWithOpenAI", () => {
  it("sends a structured Responses API request and parses output text", async () => {
    let request: { input: RequestInfo | URL; init?: RequestInit } | undefined;
    const fetchMock = async (input: RequestInfo | URL, init?: RequestInit) => {
      request = { input, init };

      return new Response(
        JSON.stringify({
          output: [
            {
              content: [
                {
                  text: JSON.stringify(compactAnalyzeResponse),
                  type: "output_text",
                },
              ],
            },
          ],
        }),
        { status: 200 },
      );
    };

    await expect(
      analyzeWithOpenAI({
        apiKey: "test-api-key",
        endpoint: "https://api.openai.test/v1/responses",
        fetchImplementation: fetchMock,
        instructions: "한국인 영어 학습자를 위한 분석 지침",
        model: "gpt-test",
        text: "I was wondering if you could help me.",
        timeoutMs: 1_000,
      }),
    ).resolves.toEqual(sampleAnalyzeResponse);

    expect(request?.input).toBe("https://api.openai.test/v1/responses");
    expect(request?.init?.method).toBe("POST");
    expect(request?.init?.headers).toMatchObject({
      Authorization: "Bearer test-api-key",
      "Content-Type": "application/json",
    });

    const body = JSON.parse(String(request?.init?.body));

    expect(body).toMatchObject({
      input: "I was wondering if you could help me.",
      instructions: "한국인 영어 학습자를 위한 분석 지침",
      max_output_tokens: MAX_ANALYSIS_PROVIDER_OUTPUT_TOKENS,
      model: "gpt-test",
      store: false,
      text: {
        format: {
          name: "nado_analysis_response",
          strict: true,
          type: "json_schema",
        },
      },
    });
    expect(JSON.stringify(body.text.format.schema)).toContain(
      '"tokens":{"type":"null"}',
    );
  });
});
