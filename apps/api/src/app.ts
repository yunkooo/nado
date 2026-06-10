import { createHash } from "node:crypto";
import express from "express";
import type {
  Express,
  NextFunction,
  Request,
  RequestHandler,
  Response,
} from "express";
import {
  analyzeResponseSchema,
  analyzeRequestSchema,
  saveVocabularyRequestSchema,
  isLikelyEnglishLearningText,
} from "@nado/shared";
import type {
  AnalyzeResponse,
  SaveVocabularyRequest,
  VocabularyItem,
} from "@nado/shared";
import type {
  AnalysisUsageDecision,
  UsageIdentity,
} from "./analysisUsageService.js";
import { createOpenAIAnalysisService } from "./openaiAnalysisService.js";
import {
  createSupabaseAnalysisUsageService,
  createSupabaseAuthService,
  createSupabaseVocabularyService,
} from "./supabaseBackend.js";
import { loadRootEnv } from "./rootEnv.js";
import { isHttpError, ServiceUnavailableError } from "./httpErrors.js";
import { createCorsMiddleware } from "./middleware/cors.js";
import {
  internalErrorHandler,
  invalidJsonHandler,
} from "./middleware/errorHandlers.js";

loadRootEnv();

export type AnalyzeInputResult =
  | { ok: true; text: string }
  | { code: "invalid_input"; issues: string[]; ok: false };

export function parseAnalyzeInput(input: unknown): AnalyzeInputResult {
  const parsed = analyzeRequestSchema.safeParse(input);

  if (!parsed.success) {
    return {
      ok: false,
      code: "invalid_input",
      issues: parsed.error.issues.map((issue) => issue.message),
    };
  }

  return {
    ok: true,
    text: parsed.data.text,
  };
}

export type AnalyzeService = {
  analyze(text: string): Promise<AnalyzeResponse>;
};

export type AuthenticatedUser = {
  id: string;
};

export type AuthService = {
  getUser(accessToken: string): Promise<AuthenticatedUser | null>;
};

export type VocabularyService = {
  delete(userId: string, id: string): Promise<boolean>;
  list(userId: string): Promise<VocabularyItem[]>;
  save(userId: string, request: SaveVocabularyRequest): Promise<VocabularyItem>;
};

export type VocabularyServiceFactory = (
  accessToken: string,
) => VocabularyService;

export type AnalysisUsageService = {
  consume(identity: UsageIdentity): Promise<AnalysisUsageDecision>;
};

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

  app.get("/health", (_request, response) =>
    response.json({
      service: "nado-api",
      status: "ok",
    }),
  );

  app.post(
    "/api/analyze",
    asyncRoute(async (request, response) => {
      const input = parseAnalyzeInput(request.body as unknown);

      if (!input.ok) {
        return response.status(400).json({
          error: {
            code: input.code,
            issues: input.issues,
            message:
              "Text must be a non-empty English sentence up to 200 supported characters.",
          },
        });
      }

      if (!isLikelyEnglishLearningText(input.text)) {
        return response.json({
          reason: "영어 문장으로 분석하기 어려운 입력입니다.",
          status: "not_analyzable",
        });
      }

      const usageIdentity = await resolveAnalyzeUsageIdentity(
        request.header("Authorization"),
        readRequestIp(request),
      );
      const usageDecision = await analysisUsageService.consume(usageIdentity);

      if (!usageDecision.ok) {
        return response
          .set("Retry-After", String(usageDecision.retryAfterSeconds))
          .status(429)
          .json({
            error: {
              code: "rate_limited",
              message: "오늘 사용할 수 있는 분석 횟수를 모두 사용했어요.",
            },
          });
      }

      try {
        const analysis = analyzeResponseSchema.parse(
          await analyzeService.analyze(input.text),
        );

        return response.json(analysis);
      } catch (error) {
        if (isHttpError(error)) {
          throw error;
        }

        return response.status(502).json({
          error: {
            code: "analysis_failed",
            message: "분석 중 문제가 발생했어요. 잠시 후 다시 시도해 주세요.",
          },
        });
      }
    }),
  );

  app.get(
    "/api/vocabulary",
    asyncRoute(async (request, response) => {
      const auth = await authenticate(request.header("Authorization"));

      if (!auth.ok) {
        return response.status(401).json(notAuthenticatedError());
      }

      const vocabularyService = vocabularyServiceFactory(auth.accessToken);
      const items = await vocabularyService.list(auth.user.id);

      return response.json({ items });
    }),
  );

  app.post(
    "/api/vocabulary",
    asyncRoute(async (request, response) => {
      const auth = await authenticate(request.header("Authorization"));

      if (!auth.ok) {
        return response.status(401).json(notAuthenticatedError());
      }

      const parsed = saveVocabularyRequestSchema.safeParse(
        request.body as unknown,
      );

      if (!parsed.success) {
        return response.status(400).json({
          error: {
            code: "invalid_input",
            issues: parsed.error.issues.map((issue) => issue.message),
            message: "Vocabulary term, type, and meaning are required.",
          },
        });
      }

      const vocabularyService = vocabularyServiceFactory(auth.accessToken);
      const item = await vocabularyService.save(auth.user.id, parsed.data);

      return response.json({ item });
    }),
  );

  app.delete(
    "/api/vocabulary/:id",
    asyncRoute(async (request, response) => {
      const auth = await authenticate(request.header("Authorization"));

      if (!auth.ok) {
        return response.status(401).json(notAuthenticatedError());
      }

      const vocabularyService = vocabularyServiceFactory(auth.accessToken);
      const deleted = await vocabularyService.delete(
        auth.user.id,
        readRouteParam(request.params.id),
      );

      if (!deleted) {
        return response.status(404).json({
          error: {
            code: "not_found",
            message: "단어장 항목을 찾을 수 없습니다.",
          },
        });
      }

      return response.status(204).send();
    }),
  );

  app.use(internalErrorHandler);

  return app;

  async function authenticate(authorization: string | undefined) {
    const accessToken = parseBearerToken(authorization);

    if (!accessToken) {
      return { ok: false as const };
    }

    let user: AuthenticatedUser | null;

    try {
      user = await authService.getUser(accessToken);
    } catch {
      throw new ServiceUnavailableError(
        "auth_unavailable",
        "로그인 세션을 확인할 수 없어요. 잠시 후 다시 시도해 주세요.",
      );
    }

    if (!user) {
      return { ok: false as const };
    }

    return {
      accessToken,
      ok: true as const,
      user,
    };
  }

  async function resolveAnalyzeUsageIdentity(
    authorization: string | undefined,
    clientIp: string,
  ): Promise<UsageIdentity> {
    const accessToken = parseBearerToken(authorization);

    if (accessToken) {
      let user: AuthenticatedUser | null;

      try {
        user = await authService.getUser(accessToken);
      } catch {
        throw new ServiceUnavailableError(
          "auth_unavailable",
          "로그인 세션을 확인할 수 없어요. 잠시 후 다시 시도해 주세요.",
        );
      }

      if (user) {
        return {
          ipHash: null,
          userId: user.id,
        };
      }
    }

    return {
      ipHash: hashClientIp(clientIp, usageIpHashSalt),
      userId: null,
    };
  }
}

type AsyncRequestHandler = (
  request: Request,
  response: Response,
  next: NextFunction,
) => Promise<unknown> | unknown;

function asyncRoute(handler: AsyncRequestHandler): RequestHandler {
  return (request, response, next) => {
    Promise.resolve(handler(request, response, next)).catch(next);
  };
}

function parseBearerToken(authorization: string | undefined): string | null {
  if (!authorization) {
    return null;
  }

  const [scheme, token, extra] = authorization.trim().split(/\s+/);

  if (scheme?.toLowerCase() !== "bearer" || !token || extra) {
    return null;
  }

  return token;
}

function readRouteParam(value: string | string[] | undefined): string {
  return Array.isArray(value) ? (value[0] ?? "") : (value ?? "");
}

function readRequestIp(request: Request): string {
  return request.ip ?? request.socket.remoteAddress ?? "unknown";
}

function readTrustProxy(value: string | undefined): boolean | number | string {
  if (!value || value === "0" || value.toLowerCase() === "false") {
    return false;
  }

  if (value === "1" || value.toLowerCase() === "true") {
    return true;
  }

  const parsed = Number.parseInt(value, 10);

  if (Number.isFinite(parsed) && String(parsed) === value) {
    return parsed;
  }

  return value;
}

function notAuthenticatedError() {
  return {
    error: {
      code: "not_authenticated",
      message: "Google 로그인이 필요합니다.",
    },
  };
}

function hashClientIp(ipAddress: string, salt: string): string {
  return createHash("sha256").update(`${salt}:${ipAddress}`).digest("hex");
}

function lazySupabaseAnalysisUsageService(): AnalysisUsageService {
  return {
    consume: (identity) =>
      createSupabaseAnalysisUsageService().consume(identity),
  };
}

export const app = createApp();
