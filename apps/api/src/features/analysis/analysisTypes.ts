import type { AnalyzeResponse } from "@nado/shared/analysis";
import type { AnalysisModelId } from "@nado/shared/analysis-input";
import type {
  AnalysisUsageDecision,
  UsageIdentity,
} from "./analysisUsageService.js";

export type AnalyzeServiceInput = {
  model?: AnalysisModelId;
  text: string;
};

export type AnalyzeService = {
  analyze(input: AnalyzeServiceInput): Promise<AnalyzeResponse>;
};

export type AnalysisUsageService = {
  consume(identity: UsageIdentity): Promise<AnalysisUsageDecision>;
};
