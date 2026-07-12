import type { Request, RequestHandler, Response } from "express";
import {
  authenticateAuthorizationHeader,
  notAuthenticatedError,
  type AuthenticationResult,
  type AuthService,
} from "../../features/auth/authService.js";
import { asyncRoute } from "../../shared/http/asyncRoute.js";
import { readRequestId } from "../../shared/http/requestContext.js";

type AuthenticatedRequest = Extract<AuthenticationResult, { ok: true }>;

type AuthenticatedRouteHandler = (
  request: Request,
  response: Response,
  auth: AuthenticatedRequest,
) => Promise<unknown> | unknown;

export function authenticatedRoute(
  authService: AuthService,
  handler: AuthenticatedRouteHandler,
): RequestHandler {
  return asyncRoute(async (request, response) => {
    const auth = await authenticateAuthorizationHeader(
      request.header("Authorization"),
      authService,
    );

    if (!auth.ok) {
      return response
        .status(401)
        .json(notAuthenticatedError(readRequestId(response)));
    }

    return handler(request, response, auth);
  });
}
