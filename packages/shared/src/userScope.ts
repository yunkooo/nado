export function shouldApplyUserScopedMutation(
  requestUserId: string | null | undefined,
  currentUserId: string | null | undefined,
): boolean {
  return Boolean(requestUserId) && requestUserId === currentUserId;
}

export function isCurrentUserScopedRequest(
  requestUserId: string | null,
  currentUserId: string | null,
  requestId: number,
  latestRequestId: number,
): boolean {
  return requestId === latestRequestId && requestUserId === currentUserId;
}
