import { Router } from "express";

export function createHealthRoutes() {
  const router = Router();

  router.get("/health", (_request, response) =>
    response.json({
      service: "nado-api",
      status: "ok",
    }),
  );

  return router;
}
