import { Router } from "express";
import {
  MAX_VOCABULARY_CURSOR_LENGTH,
  saveVocabularyRequestSchema,
} from "@nado/shared/vocabulary";
import type { AuthService } from "../../features/auth/authService.js";
import type { VocabularyServiceFactory } from "../../features/vocabulary/vocabularyTypes.js";
import { BadRequestError } from "../../shared/errors/httpErrors.js";
import { readRequestId } from "../../shared/http/requestContext.js";
import { readRouteParam } from "../../shared/http/routeParams.js";
import { authenticatedRoute } from "../middleware/authenticatedRoute.js";

export type VocabularyRoutesDependencies = {
  authService: AuthService;
  vocabularyServiceFactory: VocabularyServiceFactory;
};

export function createVocabularyRoutes({
  authService,
  vocabularyServiceFactory,
}: VocabularyRoutesDependencies) {
  const router = Router();

  router.get(
    "/vocabulary",
    authenticatedRoute(authService, async (request, response, auth) => {
      const cursor = readVocabularyCursor(request.query.cursor);
      const vocabularyService = vocabularyServiceFactory(auth.accessToken);
      const page = await vocabularyService.list(auth.user.id, cursor);

      return response.json(page);
    }),
  );

  router.post(
    "/vocabulary",
    authenticatedRoute(authService, async (request, response, auth) => {
      const parsed = saveVocabularyRequestSchema.safeParse(
        request.body as unknown,
      );

      if (!parsed.success) {
        return response.status(400).json({
          error: {
            code: "invalid_input",
            issues: parsed.error.issues.map((issue) => issue.message),
            message: "단어장 저장 입력이 올바르지 않습니다.",
            requestId: readRequestId(response),
            retryable: false,
          },
        });
      }

      const vocabularyService = vocabularyServiceFactory(auth.accessToken);
      const item = await vocabularyService.save(auth.user.id, parsed.data);

      return response.json({ item });
    }),
  );

  router.delete(
    "/vocabulary/:id",
    authenticatedRoute(authService, async (request, response, auth) => {
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
            requestId: readRequestId(response),
            retryable: false,
          },
        });
      }

      return response.status(204).send();
    }),
  );

  return router;
}

function readVocabularyCursor(value: unknown): string | undefined {
  if (value === undefined) {
    return undefined;
  }

  if (
    typeof value !== "string" ||
    value.length === 0 ||
    value.length > MAX_VOCABULARY_CURSOR_LENGTH
  ) {
    throw new BadRequestError(
      "invalid_input",
      "단어장 페이지 커서가 올바르지 않습니다.",
    );
  }

  return value;
}
