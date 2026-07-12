import { Router } from "express";
import { ServiceUnavailableError } from "../../shared/errors/httpErrors.js";
import { asyncRoute } from "../../shared/http/asyncRoute.js";

export type ReadinessService = {
  check(): Promise<void>;
};

export type HealthRoutesDependencies = {
  readinessService: ReadinessService;
};

export function createHealthRoutes({
  readinessService,
}: HealthRoutesDependencies) {
  const router = Router();

  router.get("/health", (_request, response) =>
    response.json({
      service: "nado-api",
      status: "ok",
    }),
  );

  router.get(
    "/ready",
    asyncRoute(async (_request, response) => {
      try {
        await readinessService.check();
      } catch (error) {
        throw new ServiceUnavailableError(
          "service_not_ready",
          "API 의존 서비스를 확인할 수 없습니다.",
          { cause: error, retryable: true },
        );
      }

      return response.json({
        service: "nado-api",
        status: "ready",
      });
    }),
  );

  return router;
}
