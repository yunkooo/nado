import { createHash } from "node:crypto";
import { Hono } from "hono";
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
  analyzeService?: AnalyzeService;
  analysisUsageService?: AnalysisUsageService;
  authService?: AuthService;
  usageIpHashSalt?: string;
  vocabularyServiceFactory?: VocabularyServiceFactory;
};

export function createApp(dependencies: AppDependencies = {}): Hono {
  const app = new Hono();
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

  app.get("/health", (context) =>
    context.json({
      service: "nado-api",
      status: "ok",
    }),
  );

  app.post("/api/analyze", async (context) => {
    let body: unknown;

    try {
      body = await context.req.json();
    } catch {
      return context.json(
        {
          error: {
            code: "invalid_json",
            message: "Invalid JSON body.",
          },
        },
        400,
      );
    }

    const input = parseAnalyzeInput(body);

    if (!input.ok) {
      return context.json(
        {
          error: {
            code: input.code,
            issues: input.issues,
            message:
              "Text must be a non-empty English sentence up to 500 characters.",
          },
        },
        400,
      );
    }

    if (!isLikelyEnglishLearningText(input.text)) {
      return context.json({
        reason: "영어 문장으로 분석하기 어려운 입력입니다.",
        status: "not_analyzable",
      });
    }

    const usageIdentity = await resolveAnalyzeUsageIdentity(
      context.req.header("Authorization"),
      context.req.header("X-Forwarded-For"),
      context.req.header("X-Real-IP"),
    );
    const usageDecision = await analysisUsageService.consume(usageIdentity);

    if (!usageDecision.ok) {
      return context.json(
        {
          error: {
            code: "rate_limited",
            message: "오늘 사용할 수 있는 분석 횟수를 모두 사용했어요.",
          },
        },
        429,
        {
          "Retry-After": String(usageDecision.retryAfterSeconds),
        },
      );
    }

    try {
      const analysis = analyzeResponseSchema.parse(
        await analyzeService.analyze(input.text),
      );

      return context.json(analysis);
    } catch {
      return context.json(
        {
          error: {
            code: "analysis_failed",
            message: "분석 중 문제가 발생했어요. 잠시 후 다시 시도해 주세요.",
          },
        },
        502,
      );
    }
  });

  app.get("/api/vocabulary", async (context) => {
    const auth = await authenticate(context.req.header("Authorization"));

    if (!auth.ok) {
      return context.json(notAuthenticatedError(), 401);
    }

    const vocabularyService = vocabularyServiceFactory(auth.accessToken);
    const items = await vocabularyService.list(auth.user.id);

    return context.json({ items });
  });

  app.post("/api/vocabulary", async (context) => {
    const auth = await authenticate(context.req.header("Authorization"));

    if (!auth.ok) {
      return context.json(notAuthenticatedError(), 401);
    }

    let body: unknown;

    try {
      body = await context.req.json();
    } catch {
      return context.json(
        {
          error: {
            code: "invalid_json",
            message: "Invalid JSON body.",
          },
        },
        400,
      );
    }

    const parsed = saveVocabularyRequestSchema.safeParse(body);

    if (!parsed.success) {
      return context.json(
        {
          error: {
            code: "invalid_input",
            issues: parsed.error.issues.map((issue) => issue.message),
            message: "Vocabulary term, type, and meaning are required.",
          },
        },
        400,
      );
    }

    const vocabularyService = vocabularyServiceFactory(auth.accessToken);
    const item = await vocabularyService.save(auth.user.id, parsed.data);

    return context.json({ item });
  });

  app.delete("/api/vocabulary/:id", async (context) => {
    const auth = await authenticate(context.req.header("Authorization"));

    if (!auth.ok) {
      return context.json(notAuthenticatedError(), 401);
    }

    const vocabularyService = vocabularyServiceFactory(auth.accessToken);
    const deleted = await vocabularyService.delete(
      auth.user.id,
      context.req.param("id"),
    );

    if (!deleted) {
      return context.json(
        {
          error: {
            code: "not_found",
            message: "단어장 항목을 찾을 수 없습니다.",
          },
        },
        404,
      );
    }

    return context.body(null, 204);
  });

  return app;

  async function authenticate(authorization: string | undefined) {
    const accessToken = parseBearerToken(authorization);

    if (!accessToken) {
      return { ok: false as const };
    }

    const user = await authService.getUser(accessToken);

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
    forwardedFor: string | undefined,
    realIp: string | undefined,
  ): Promise<UsageIdentity> {
    const accessToken = parseBearerToken(authorization);

    if (accessToken) {
      const user = await authService.getUser(accessToken);

      if (user) {
        return {
          ipHash: null,
          userId: user.id,
        };
      }
    }

    return {
      ipHash: hashClientIp(readClientIp(forwardedFor, realIp), usageIpHashSalt),
      userId: null,
    };
  }
}

export const app = createApp();

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

function notAuthenticatedError() {
  return {
    error: {
      code: "not_authenticated",
      message: "Google 로그인이 필요합니다.",
    },
  };
}

function readClientIp(
  forwardedFor: string | undefined,
  realIp: string | undefined,
): string {
  return (
    forwardedFor
      ?.split(",")
      .map((part) => part.trim())
      .find(Boolean) ??
    realIp?.trim() ??
    "unknown"
  );
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
