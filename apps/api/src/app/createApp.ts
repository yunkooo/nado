import express from "express";
import type { Express } from "express";
import type { AnalysisUsageService } from "../features/analysis/analysisTypes.js";
import type { AnalyzeService } from "../features/analysis/analysisTypes.js";
import { createOpenAIAnalysisService } from "../features/analysis/openaiAnalysisService.js";
import type { AuthService } from "../features/auth/authService.js";
import type { VocabularyServiceFactory } from "../features/vocabulary/vocabularyTypes.js";
import { loadRootEnv } from "../infrastructure/env/rootEnv.js";
import {
  createSupabaseAnalysisUsageService,
  createSupabaseAuthService,
  createSupabaseVocabularyService,
} from "../infrastructure/supabase/supabaseBackend.js";
import { createCorsMiddleware } from "./middleware/cors.js";
import {
  internalErrorHandler,
  invalidJsonHandler,
} from "./middleware/errorHandlers.js";
import { createAnalysisRoutes } from "./routes/analysisRoutes.js";
import { createHealthRoutes } from "./routes/healthRoutes.js";
import { createVocabularyRoutes } from "./routes/vocabularyRoutes.js";
import { readTrustProxy } from "./trustProxy.js";

loadRootEnv();

export type AppDependencies = {
  allowLocalCors?: boolean;
  analyzeService?: AnalyzeService;
  analysisUsageService?: AnalysisUsageService;
  authService?: AuthService;
  trustProxy?: boolean | number | string;
  usageIpHashSalt?: string;
  vocabularyServiceFactory?: VocabularyServiceFactory;
};

export function createApp(dependencies: AppDependencies = {}): Express {
  const app = express();
  const analyzeService =
    dependencies.analyzeService ?? createOpenAIAnalysisService();
  const analysisUsageService =
    dependencies.analysisUsageService ?? lazySupabaseAnalysisUsageService();
  const authService = dependencies.authService ?? createSupabaseAuthService();
  const usageIpHashSalt =
    dependencies.usageIpHashSalt ??
    process.env.NADO_USAGE_IP_HASH_SALT ??
    "nado-local-dev";
  const vocabularyServiceFactory =
    dependencies.vocabularyServiceFactory ?? createSupabaseVocabularyService;
  const trustProxy =
    dependencies.trustProxy ?? readTrustProxy(process.env.NADO_TRUST_PROXY);
  const allowLocalCors =
    dependencies.allowLocalCors ?? process.env.NODE_ENV !== "production";

  if (trustProxy !== false) {
    app.set("trust proxy", trustProxy);
  }

  app.use(createCorsMiddleware({ allowLocalCors }));
  app.use(express.json());
  app.use(invalidJsonHandler);
  app.use(createHealthRoutes());
  app.use(
    "/api",
    createAnalysisRoutes({
      analysisUsageService,
      analyzeService,
      authService,
      usageIpHashSalt,
    }),
  );
  app.use(
    "/api",
    createVocabularyRoutes({
      authService,
      vocabularyServiceFactory,
    }),
  );
  app.use(internalErrorHandler);

  return app;
}

function lazySupabaseAnalysisUsageService(): AnalysisUsageService {
  return {
    consume: (identity) =>
      createSupabaseAnalysisUsageService().consume(identity),
  };
}

export const app = createApp();
