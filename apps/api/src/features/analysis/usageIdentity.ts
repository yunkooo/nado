import { createHash } from "node:crypto";
import type { AuthService } from "../auth/authService.js";
import {
  getUserOrThrowUnavailable,
  parseBearerToken,
} from "../auth/authService.js";
import type { UsageIdentity } from "./analysisUsageService.js";

export async function resolveAnalyzeUsageIdentity({
  authService,
  authorization,
  clientIp,
  usageIpHashSalt,
}: {
  authService: AuthService;
  authorization: string | undefined;
  clientIp: string;
  usageIpHashSalt: string;
}): Promise<UsageIdentity> {
  const accessToken = parseBearerToken(authorization);

  if (accessToken) {
    const user = await getUserOrThrowUnavailable(authService, accessToken);

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

function hashClientIp(ipAddress: string, salt: string): string {
  return createHash("sha256").update(`${salt}:${ipAddress}`).digest("hex");
}
