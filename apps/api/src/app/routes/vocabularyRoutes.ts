import { Router } from "express";
import { saveVocabularyRequestSchema } from "@nado/shared";
import {
  authenticateAuthorizationHeader,
  notAuthenticatedError,
  type AuthService,
} from "../../features/auth/authService.js";
import type { VocabularyServiceFactory } from "../../features/vocabulary/vocabularyTypes.js";
import { asyncRoute } from "../../shared/http/asyncRoute.js";
import { readRouteParam } from "../../shared/http/routeParams.js";

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
    asyncRoute(async (request, response) => {
      const auth = await authenticateAuthorizationHeader(
        request.header("Authorization"),
        authService,
      );

      if (!auth.ok) {
        return response.status(401).json(notAuthenticatedError());
      }

      const vocabularyService = vocabularyServiceFactory(auth.accessToken);
      const items = await vocabularyService.list(auth.user.id);

      return response.json({ items });
    }),
  );

  router.post(
    "/vocabulary",
    asyncRoute(async (request, response) => {
      const auth = await authenticateAuthorizationHeader(
        request.header("Authorization"),
        authService,
      );

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

  router.delete(
    "/vocabulary/:id",
    asyncRoute(async (request, response) => {
      const auth = await authenticateAuthorizationHeader(
        request.header("Authorization"),
        authService,
      );

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

  return router;
}
