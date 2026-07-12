import { ServiceUnavailableError } from "../../shared/errors/httpErrors.js";

export type AuthenticatedUser = {
  id: string;
};

export type AuthService = {
  getUser(accessToken: string): Promise<AuthenticatedUser | null>;
};

export type AuthenticationResult =
  | {
      accessToken: string;
      ok: true;
      user: AuthenticatedUser;
    }
  | { ok: false };

export async function authenticateAuthorizationHeader(
  authorization: string | undefined,
  authService: AuthService,
): Promise<AuthenticationResult> {
  const accessToken = parseBearerToken(authorization);

  if (!accessToken) {
    return { ok: false };
  }

  const user = await getUserOrThrowUnavailable(authService, accessToken);

  if (!user) {
    return { ok: false };
  }

  return {
    accessToken,
    ok: true,
    user,
  };
}

export async function getUserOrThrowUnavailable(
  authService: AuthService,
  accessToken: string,
): Promise<AuthenticatedUser | null> {
  try {
    return await authService.getUser(accessToken);
  } catch (error) {
    throw new ServiceUnavailableError(
      "auth_unavailable",
      "로그인 세션을 확인할 수 없어요. 잠시 후 다시 시도해 주세요.",
      { cause: error, retryable: true },
    );
  }
}

export function parseBearerToken(
  authorization: string | undefined,
): string | null {
  if (!authorization) {
    return null;
  }

  const [scheme, token, extra] = authorization.trim().split(/\s+/);

  if (scheme?.toLowerCase() !== "bearer" || !token || extra) {
    return null;
  }

  return token;
}

export function notAuthenticatedError(requestId: string) {
  return {
    error: {
      code: "not_authenticated",
      message: "Google 로그인이 필요합니다.",
      requestId,
      retryable: false,
    },
  };
}
