import express from "express";
import type { Express } from "express";
import type { AnalysisUsageService } from "../features/analysis/analysisTypes.js";
import type { AnalyzeService } from "../features/analysis/analysisTypes.js";
import { createAnalysisService } from "../features/analysis/analysisService.js";
import type { AuthService } from "../features/auth/authService.js";
import type { VocabularyServiceFactory } from "../features/vocabulary/vocabularyTypes.js";
import { resolveUsageIpHashSalt } from "../infrastructure/env/apiRuntimeConfig.js";
import { loadRootEnv } from "../infrastructure/env/rootEnv.js";
import {
  createSupabaseAnalysisUsageService,
  createSupabaseAuthService,
  createSupabaseReadinessService,
  createSupabaseVocabularyService,
} from "../infrastructure/supabase/supabaseBackend.js";
import { createCorsMiddleware } from "./middleware/cors.js";
import {
  createInternalErrorHandler,
  invalidJsonHandler,
} from "./middleware/errorHandlers.js";
import type { ApiErrorLogger } from "./middleware/errorHandlers.js";
import { notFoundHandler } from "./middleware/notFound.js";
import {
  createRequestLoggerMiddleware,
  type ApiRequestLogger,
} from "./middleware/requestLogger.js";
import { createRequestContextMiddleware } from "../shared/http/requestContext.js";
import { createAnalysisRoutes } from "./routes/analysisRoutes.js";
import type {
  AnalysisTimingLogEntry,
  AnalysisTimingLogger,
} from "./routes/analysisRoutes.js";
import { createHealthRoutes } from "./routes/healthRoutes.js";
import type { ReadinessService } from "./routes/healthRoutes.js";
import { createVocabularyRoutes } from "./routes/vocabularyRoutes.js";
import { readTrustProxy } from "./trustProxy.js";

loadRootEnv();

export type AppDependencies = {
  allowLocalCors?: boolean;
  analyzeService?: AnalyzeService;
  analysisUsageService?: AnalysisUsageService;
  analysisTimingLogger?: AnalysisTimingLogger;
  authService?: AuthService;
  errorLogger?: ApiErrorLogger;
  readinessService?: ReadinessService;
  requestLogger?: ApiRequestLogger;
  trustProxy?: boolean | number | string;
  usageIpHashSalt?: string;
  vocabularyServiceFactory?: VocabularyServiceFactory;
};

export function createApp(dependencies: AppDependencies = {}): Express {
  const app = express();
  const analyzeService = dependencies.analyzeService ?? createAnalysisService();
  const analysisUsageService =
    dependencies.analysisUsageService ?? lazySupabaseAnalysisUsageService();
  const authService = dependencies.authService ?? createSupabaseAuthService();
  const usageIpHashSalt =
    dependencies.usageIpHashSalt ?? resolveUsageIpHashSalt();
  const vocabularyServiceFactory =
    dependencies.vocabularyServiceFactory ?? createSupabaseVocabularyService;
  const trustProxy =
    dependencies.trustProxy ?? readTrustProxy(process.env.NADO_TRUST_PROXY);
  const allowLocalCors =
    dependencies.allowLocalCors ?? process.env.NODE_ENV !== "production";
  const readinessService =
    dependencies.readinessService ?? lazySupabaseReadinessService();

  if (trustProxy !== false) {
    app.set("trust proxy", trustProxy);
  }

  app.use(createRequestContextMiddleware());
  app.use(
    createRequestLoggerMiddleware(
      dependencies.requestLogger ?? createApiRequestLogger(),
    ),
  );
  app.use(createCorsMiddleware({ allowLocalCors }));
  app.use(express.json());
  app.use(invalidJsonHandler);
  app.use(createHealthRoutes({ readinessService }));
  app.use(
    "/api",
    createAnalysisRoutes({
      analysisUsageService,
      analysisTimingLogger:
        dependencies.analysisTimingLogger ?? createAnalysisTimingLogger(),
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
  app.use(notFoundHandler);
  app.use(
    createInternalErrorHandler(
      dependencies.errorLogger ?? createApiErrorLogger(),
    ),
  );

  return app;
}

function lazySupabaseAnalysisUsageService(): AnalysisUsageService {
  return {
    consume: (identity) =>
      createSupabaseAnalysisUsageService().consume(identity),
  };
}

function lazySupabaseReadinessService(): ReadinessService {
  return {
    check: () => createSupabaseReadinessService().check(),
  };
}

function createAnalysisTimingLogger(): AnalysisTimingLogger | undefined {
  if (process.env.NODE_ENV === "test") {
    return undefined;
  }

  return (entry: AnalysisTimingLogEntry) => {
    console.info("[analysis-timing]", JSON.stringify(entry));
  };
}

function createApiErrorLogger(): ApiErrorLogger | undefined {
  if (process.env.NODE_ENV === "test") {
    return undefined;
  }

  return ({ error, method, path, requestId, statusCode }) => {
    const errorDetails = readErrorDetails(error);

    console.error(
      "[api-error]",
      JSON.stringify({
        ...errorDetails,
        method,
        path,
        requestId,
        statusCode,
      }),
    );
  };
}

function createApiRequestLogger(): ApiRequestLogger | undefined {
  if (process.env.NODE_ENV === "test") {
    return undefined;
  }

  return (entry) => {
    console.info("[api-request]", JSON.stringify(entry));
  };
}

function readErrorDetails(error: unknown) {
  if (error instanceof Error) {
    const causeDetails = readCauseDetails(error.cause);

    return {
      ...causeDetails,
      errorMessage: error.message,
      errorName: error.name,
    };
  }

  return {
    errorMessage: "Unknown error",
    errorName: "UnknownError",
  };
}

function readCauseDetails(cause: unknown) {
  if (cause instanceof Error) {
    return {
      errorCauseMessage: cause.message,
      errorCauseName: cause.name,
    };
  }

  return {};
}
