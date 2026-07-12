import { readRichTextProperty } from "./notion-properties.mjs";
import { normalizeNotionId } from "./ticket-url.mjs";

export const INITIAL_TICKET_BINDING_PENDING = "initial-ticket-binding-pending";

export function validateTicketBinding({
  action,
  allowInitialBinding = false,
  page,
  pullRequest,
}) {
  const notionProperties =
    page?.properties && typeof page.properties === "object"
      ? page.properties
      : {};
  const requiredProperties = ["상태", "GitHub PR", "GitHub Branch"];
  const missingProperties = requiredProperties.filter(
    (propertyName) => !(propertyName in notionProperties),
  );

  if (missingProperties.length > 0) {
    return {
      ok: false,
      reason: `Notion data source is missing required ticket binding properties: ${missingProperties.join(", ")}`,
    };
  }

  const statusName = notionProperties["상태"]?.status?.name ?? null;
  const linkedPullRequestUrl = notionProperties["GitHub PR"]?.url ?? null;
  const linkedBranch = readRichTextProperty(notionProperties["GitHub Branch"]);
  const pullRequestUrl = pullRequest?.html_url ?? null;
  const pullRequestBranch = pullRequest?.head?.ref ?? null;

  if (!pullRequestUrl || !pullRequestBranch) {
    return {
      ok: false,
      reason: "Pull request is missing an HTML URL or head branch",
    };
  }

  if (linkedPullRequestUrl && linkedPullRequestUrl !== pullRequestUrl) {
    return {
      ok: false,
      reason: "Notion ticket is already linked to a different pull request",
    };
  }

  if (linkedPullRequestUrl && !linkedBranch) {
    return {
      ok: false,
      reason: "Pull-request-bound Notion ticket is missing its GitHub branch",
    };
  }

  if (linkedBranch && linkedBranch !== pullRequestBranch) {
    return {
      ok: false,
      reason:
        "Notion ticket branch does not match the pull request head branch",
    };
  }

  if (!linkedPullRequestUrl) {
    if (!allowInitialBinding) {
      return {
        ...(statusName === "IN-progrss"
          ? { code: INITIAL_TICKET_BINDING_PENDING }
          : {}),
        ok: false,
        reason:
          "Only an initial pull request event may bind an unlinked Notion ticket",
      };
    }

    if (statusName !== "IN-progrss") {
      return {
        ok: false,
        reason:
          "Notion ticket must be IN-progrss before initial pull request binding",
      };
    }

    return { ok: true };
  }

  const isIdempotentMergedEvent =
    action === "closed" && pullRequest?.merged && statusName === "DONE";

  if (statusName !== "IN-review" && !isIdempotentMergedEvent) {
    return {
      ok: false,
      reason: "A pull-request-bound Notion ticket must remain IN-review",
    };
  }

  return { ok: true };
}

export function validatePersistentTicketBinding({
  boundPages,
  currentPage,
  currentPageId,
  pullRequestUrl,
}) {
  if (boundPages.some((page) => !page?.id)) {
    return {
      ok: false,
      reason: "Notion ticket binding query returned a page without an ID",
    };
  }

  const boundPageIds = [
    ...new Set(boundPages.map((page) => normalizeNotionId(page.id))),
  ];

  if (boundPageIds.length !== boundPages.length) {
    return {
      ok: false,
      reason: "Notion ticket binding query returned duplicate pages",
    };
  }

  if (boundPageIds.length > 1) {
    return {
      ok: false,
      reason: "Multiple Notion tickets are linked to the same pull request",
    };
  }

  const boundPageId = boundPageIds[0] ?? null;
  const normalizedCurrentPageId = normalizeNotionId(currentPageId);
  const currentPagePullRequestUrl =
    currentPage?.properties?.["GitHub PR"]?.url ?? null;

  if (boundPageId && boundPageId !== normalizedCurrentPageId) {
    return {
      ok: false,
      reason:
        "The Notion Ticket URL cannot be changed after a pull request is linked",
    };
  }

  if (
    (boundPageId === normalizedCurrentPageId) !==
    (currentPagePullRequestUrl === pullRequestUrl)
  ) {
    return {
      ok: false,
      reason:
        "Notion ticket binding state is inconsistent between the page and data source query",
    };
  }

  return { ok: true };
}
