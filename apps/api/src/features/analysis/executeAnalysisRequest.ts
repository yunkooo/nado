import { analyzeResponseSchema } from "@nado/shared/analysis";
import type { AnalyzeService, AnalysisUsageService } from "./analysisTypes.js";
import type { UsageIdentity } from "./analysisUsageService.js";

export type AnalysisRequestInput = {
  model: Parameters<AnalyzeService["analyze"]>[0]["model"];
  text: string;
};

export type AnalysisRequestStage =
  | "analyze"
  | "responseValidation"
  | "usageConsume"
  | "usageIdentity";

export type AnalysisRequestStageRunner = <T>(
  stage: AnalysisRequestStage,
  operation: () => Promise<T> | T,
) => Promise<T>;

export async function executeAnalysisRequest({
  analyzeService,
  analysisUsageService,
  input,
  onUsageIdentityResolved,
  resolveUsageIdentity,
  runStage,
}: {
  analyzeService: AnalyzeService;
  analysisUsageService: AnalysisUsageService;
  input: AnalysisRequestInput;
  onUsageIdentityResolved?(kind: "anonymous" | "authenticated"): void;
  resolveUsageIdentity(): Promise<UsageIdentity>;
  runStage: AnalysisRequestStageRunner;
}) {
  const usageIdentity = await runStage("usageIdentity", resolveUsageIdentity);
  const usageIdentityKind = usageIdentity.userId
    ? ("authenticated" as const)
    : ("anonymous" as const);
  onUsageIdentityResolved?.(usageIdentityKind);
  const usageDecision = await runStage("usageConsume", () =>
    analysisUsageService.consume(usageIdentity),
  );

  if (!usageDecision.ok) {
    return {
      kind: "rate_limited" as const,
      retryAfterSeconds: usageDecision.retryAfterSeconds,
      usageIdentityKind,
    };
  }

  const rawAnalysis = await runStage("analyze", () =>
    analyzeService.analyze({
      model: input.model,
      text: input.text,
    }),
  );
  const analysis = await runStage("responseValidation", () =>
    analyzeResponseSchema.parse(rawAnalysis),
  );

  return {
    analysis,
    kind: "success" as const,
    usageIdentityKind,
  };
}
