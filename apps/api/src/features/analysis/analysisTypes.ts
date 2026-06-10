import type { AnalyzeResponse } from "@nado/shared";
import type {
  AnalysisUsageDecision,
  UsageIdentity,
} from "./analysisUsageService.js";

export type AnalyzeService = {
  analyze(text: string): Promise<AnalyzeResponse>;
};

export type AnalysisUsageService = {
  consume(identity: UsageIdentity): Promise<AnalysisUsageDecision>;
};
