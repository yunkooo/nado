#!/usr/bin/env node

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const NOTION_API_VERSION = "2025-09-03";
const GITHUB_API_VERSION = "2022-11-28";
const NOTION_PAGE_URL_PATTERN =
  /https?:\/\/(?:www\.)?(?:app\.)?notion\.(?:so|com)\/[^\s<>)]+/i;
const COMPACT_NOTION_ID_PATTERN = /[0-9a-f]{32}/i;
const DASHED_NOTION_ID_PATTERN =
  /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;

export function parseTicketUrlFromBody(body = "") {
  const ticketLine = body
    .split("\n")
    .find((line) => /^\s*-?\s*Ticket\s*:/i.test(line));

  if (!ticketLine) {
    return null;
  }

  const match = ticketLine.match(NOTION_PAGE_URL_PATTERN);

  return match ? match[0] : null;
}

export function extractNotionPageId(ticketUrl) {
  try {
    const url = new URL(ticketUrl);
    const path = decodeURIComponent(url.pathname);
    const dashedId = path.match(DASHED_NOTION_ID_PATTERN)?.[0];
    const compactId = path.match(COMPACT_NOTION_ID_PATTERN)?.[0];

    if (dashedId) {
      return dashedId.toLowerCase();
    }

    if (compactId) {
      return formatCompactUuid(compactId);
    }
  } catch {
    return null;
  }

  return null;
}

export function mapCiResultToStatus(result) {
  if (!result) {
    return "Pending";
  }

  switch (result.toLowerCase()) {
    case "success":
      return "Success";
    case "failure":
    case "timed_out":
    case "action_required":
      return "Failed";
    case "cancelled":
      return "Cancelled";
    case "pending":
    case "queued":
    case "requested":
    case "waiting":
    case "in_progress":
      return "Pending";
    case "skipped":
      return "Unknown";
    default:
      return "Unknown";
  }
}

export function deriveCiResult({
  action,
  ciResult,
  e2eResult,
  pullRequest,
  verifyResult,
}) {
  if (ciResult) {
    return ciResult;
  }

  if (action === "closed" && pullRequest?.merged) {
    return "success";
  }

  const jobResults = [verifyResult, e2eResult].filter(Boolean);

  if (jobResults.some((result) => result === "failure")) {
    return "failure";
  }

  if (jobResults.some((result) => result === "cancelled")) {
    return "cancelled";
  }

  if (
    jobResults.length > 0 &&
    jobResults.every((result) => result === "success")
  ) {
    return "success";
  }

  if (jobResults.some((result) => result === "in_progress")) {
    return "pending";
  }

  if (
    ["opened", "reopened", "synchronize", "ready_for_review"].includes(action)
  ) {
    return "pending";
  }

  return "unknown";
}

export function buildNotionPropertiesForEvent({
  action,
  ciStatus,
  now,
  pullRequest,
  reviewState,
  syncMode = "pr-event",
}) {
  if (!pullRequest) {
    throw new Error("pullRequest is required");
  }

  const isCiResultSync = syncMode === "ci-result";
  const isMetadataOnlySync = syncMode === "metadata-only";
  const isReviewSync = syncMode === "review-event";
  const shouldUpdateCi = isCiResultSync || action === "closed";
  const properties = {
    "GitHub PR": { url: pullRequest.html_url ?? null },
    "GitHub Branch": richText(pullRequest.head?.ref ?? ""),
  };

  if (shouldUpdateCi) {
    properties["CI Status"] = select(ciStatus ?? "Unknown");
    properties["Last CI Check"] = date(now);
  }

  if (pullRequest.created_at) {
    properties["PR Created At"] = date(pullRequest.created_at);
  }

  if (syncMode === "pr-event" && action === "synchronize") {
    properties["Last Push At"] = date(now);
    properties["Last Head SHA"] = richText(pullRequest.head?.sha ?? "");
    properties["Last Push Summary"] = richText(buildPushSummary(pullRequest));
  }

  if (action === "closed") {
    if (pullRequest.merged) {
      const completedAt = pullRequest.closed_at ?? now;
      const mergedAt = pullRequest.merged_at ?? completedAt;

      return {
        ...properties,
        상태: status("DONE"),
        "Review Status": select("Passed"),
        "Last Review Check": date(now),
        "Merged At": date(mergedAt),
        종료일: date(completedAt),
        Blocker: richText(""),
      };
    }

    return {
      ...properties,
      Blocker: richText("PR closed without merge"),
    };
  }

  if (isReviewSync) {
    const reviewStatus = mapReviewStateToStatus({
      reviewAction: action,
      reviewState,
    });

    if (reviewStatus) {
      properties["Review Status"] = select(reviewStatus);
    }

    properties["Last Review Check"] = date(now);

    return properties;
  }

  if (isCiResultSync || isMetadataOnlySync) {
    return properties;
  }

  return {
    ...properties,
    상태: status("IN-review"),
    Blocker: richText(""),
  };
}

function buildPushSummary(pullRequest) {
  const branch = pullRequest.head?.ref ?? "unknown branch";
  const headSha = pullRequest.head?.sha ?? "";
  const shortSha = headSha ? headSha.slice(0, 7) : "unknown";
  const prLabel = pullRequest.number ? `PR #${pullRequest.number}` : "PR";
  const title = pullRequest.title ? ` - ${pullRequest.title}` : "";

  return `${prLabel} pushed ${shortSha} to ${branch}${title}`;
}

export function createSyncPlan({
  action,
  ciResult,
  e2eResult,
  now = new Date().toISOString(),
  pullRequest,
  reviewState,
  syncMode = "pr-event",
  verifyResult,
}) {
  const ticketUrl = parseTicketUrlFromBody(pullRequest?.body ?? "");

  if (!ticketUrl) {
    return {
      ok: false,
      reason: "Missing Notion Ticket URL in PR body",
    };
  }

  const pageId = extractNotionPageId(ticketUrl);

  if (!pageId) {
    return {
      ok: false,
      reason: `Invalid Notion Ticket URL: ${ticketUrl}`,
    };
  }

  return {
    ok: true,
    pageId,
    properties: buildNotionPropertiesForEvent({
      action,
      ciStatus: mapCiResultToStatus(
        deriveCiResult({
          action,
          ciResult,
          e2eResult,
          pullRequest,
          verifyResult,
        }),
      ),
      now,
      pullRequest,
      reviewState,
      syncMode,
    }),
    ticketUrl,
  };
}

export async function runSync({
  env = process.env,
  fetchImpl = globalThis.fetch,
  readFile = readFileSync,
} = {}) {
  const requiredEnv = [
    "GITHUB_EVENT_PATH",
    "NOTION_TOKEN",
    "NOTION_TICKETS_DATA_SOURCE_ID",
  ];
  const missingEnv = requiredEnv.filter((name) => !env[name]);

  if (missingEnv.length > 0) {
    return {
      ok: false,
      reason: `Missing required environment variables: ${missingEnv.join(", ")}`,
    };
  }

  const event = JSON.parse(readFile(env.GITHUB_EVENT_PATH, "utf8"));
  const syncInput = await resolveSyncInput({
    env,
    event,
    fetchImpl,
  });

  if (!syncInput.ok) {
    return syncInput;
  }

  if (syncInput.skipped) {
    return syncInput;
  }

  if (
    isCrossRepositoryPullRequest(syncInput.pullRequest, env.GITHUB_REPOSITORY)
  ) {
    return {
      ok: true,
      reason: "Skipping Notion sync for a fork pull request",
      skipped: true,
    };
  }

  const syncPlan = createSyncPlan({
    action: syncInput.action,
    ciResult: syncInput.ciResult,
    e2eResult: env.E2E_RESULT,
    pullRequest: syncInput.pullRequest,
    reviewState: syncInput.reviewState,
    syncMode: syncInput.syncMode,
    verifyResult: env.VERIFY_RESULT,
  });

  if (!syncPlan.ok) {
    return syncPlan;
  }

  const pageValidation = await validateNotionTicketPage({
    dataSourceId: env.NOTION_TICKETS_DATA_SOURCE_ID,
    fetchImpl,
    notionToken: env.NOTION_TOKEN,
    pageId: syncPlan.pageId,
  });

  if (!pageValidation.ok) {
    return pageValidation;
  }

  await updateNotionPage({
    fetchImpl,
    notionToken: env.NOTION_TOKEN,
    pageId: syncPlan.pageId,
    properties: syncPlan.properties,
  });

  return {
    ok: true,
    pageId: syncPlan.pageId,
    ticketUrl: syncPlan.ticketUrl,
  };
}

async function resolveSyncInput({ env, event, fetchImpl }) {
  if (event.inputs?.sync_event === "review") {
    if (!env.GITHUB_TOKEN) {
      return {
        ok: false,
        reason: "Missing required environment variables: GITHUB_TOKEN",
      };
    }

    const pullRequestUrl = buildPullRequestApiUrl({
      number: event.inputs.pr_number,
      repositoryUrl: event.repository?.url,
    });

    if (!pullRequestUrl) {
      return {
        ok: false,
        reason:
          "Workflow dispatch review sync does not include a pull request URL",
      };
    }

    const pullRequest = await fetchGitHubPullRequest({
      fetchImpl,
      githubToken: env.GITHUB_TOKEN,
      pullRequestUrl,
    });

    if (pullRequest.state === "closed") {
      return {
        ok: true,
        reason: "Skipping review Notion sync for a closed pull request",
        skipped: true,
      };
    }

    const reviewState = await resolvePullRequestReviewState({
      fetchImpl,
      githubToken: env.GITHUB_TOKEN,
      pullRequest,
      reviewAction: event.inputs.review_action,
      reviewState: event.inputs.review_state,
    });

    return {
      action: event.inputs.review_action,
      ok: true,
      pullRequest,
      reviewState,
      syncMode: "review-event",
    };
  }

  if (event.review && event.pull_request) {
    if (!env.GITHUB_TOKEN) {
      return {
        ok: false,
        reason: "Missing required environment variables: GITHUB_TOKEN",
      };
    }

    const reviewState = await resolvePullRequestReviewState({
      fetchImpl,
      githubToken: env.GITHUB_TOKEN,
      pullRequest: event.pull_request,
      reviewAction: event.action,
      reviewState: event.review.state,
    });

    return {
      action: event.action,
      ok: true,
      pullRequest: event.pull_request,
      reviewState,
      syncMode: "review-event",
    };
  }

  if (event.pull_request) {
    let pullRequest = event.pull_request;

    if (shouldFetchCurrentPullRequestForEvent(event.action)) {
      if (!env.GITHUB_TOKEN) {
        return {
          ok: false,
          reason: "Missing required environment variables: GITHUB_TOKEN",
        };
      }

      const pullRequestUrl =
        event.pull_request.url ??
        buildPullRequestApiUrl({
          number: event.pull_request.number,
          repositoryUrl: event.repository?.url,
        });

      if (!pullRequestUrl) {
        return {
          ok: false,
          reason: "Pull request event does not include a pull request URL",
        };
      }

      const currentPullRequest = await fetchGitHubPullRequest({
        fetchImpl,
        githubToken: env.GITHUB_TOKEN,
        pullRequestUrl,
      });

      if (event.action === "closed" && currentPullRequest.state !== "closed") {
        return {
          ok: true,
          reason:
            "Skipping stale closed PR-event Notion sync for a reopened pull request",
          skipped: true,
        };
      }

      if (event.action !== "closed" && currentPullRequest.state === "closed") {
        return {
          ok: true,
          reason:
            "Skipping stale PR-event Notion sync for a closed pull request",
          skipped: true,
        };
      }

      if (
        event.action === "synchronize" &&
        isStaleSynchronizeEventForPullRequest(
          event.pull_request,
          currentPullRequest,
        )
      ) {
        return {
          ok: true,
          reason:
            "Skipping stale PR-event Notion sync for an outdated synchronize event",
          skipped: true,
        };
      }

      pullRequest = currentPullRequest;
    }

    return {
      action: event.action,
      ciResult: env.CI_RESULT,
      ok: true,
      pullRequest,
      syncMode: event.action === "edited" ? "metadata-only" : "pr-event",
    };
  }

  if (event.workflow_run?.event !== "pull_request") {
    return {
      ok: false,
      reason: "GitHub event payload does not include a pull request",
    };
  }

  const pullRequestSummary = event.workflow_run.pull_requests?.[0];
  const pullRequestUrl =
    pullRequestSummary?.url ??
    buildPullRequestApiUrl({
      number: pullRequestSummary?.number,
      repositoryUrl: event.repository?.url,
    });

  if (!pullRequestUrl) {
    return {
      ok: false,
      reason: "Workflow run event does not include a pull request URL",
    };
  }

  if (!env.GITHUB_TOKEN) {
    return {
      ok: false,
      reason: "Missing required environment variables: GITHUB_TOKEN",
    };
  }

  const pullRequest = await fetchGitHubPullRequest({
    fetchImpl,
    githubToken: env.GITHUB_TOKEN,
    pullRequestUrl,
  });

  if (pullRequest.state === "closed") {
    return {
      ok: true,
      reason: "Skipping CI-result Notion sync for a closed pull request",
      skipped: true,
    };
  }

  if (isStaleWorkflowRunForPullRequest(event.workflow_run, pullRequest)) {
    return {
      ok: true,
      reason:
        "Skipping stale CI-result Notion sync for an outdated workflow run",
      skipped: true,
    };
  }

  return {
    action: "synchronize",
    ciResult: env.CI_RESULT ?? event.workflow_run.conclusion,
    ok: true,
    pullRequest,
    syncMode: "ci-result",
  };
}

function shouldFetchCurrentPullRequestForEvent(action) {
  return [
    "closed",
    "edited",
    "opened",
    "ready_for_review",
    "reopened",
    "synchronize",
  ].includes(action);
}

function isStaleWorkflowRunForPullRequest(workflowRun, pullRequest) {
  return isStalePullRequestHead({
    currentPullRequest: pullRequest,
    eventHeadSha: workflowRun?.head_sha,
  });
}

function isStaleSynchronizeEventForPullRequest(eventPullRequest, pullRequest) {
  return isStalePullRequestHead({
    currentPullRequest: pullRequest,
    eventHeadSha: eventPullRequest?.head?.sha,
  });
}

function isStalePullRequestHead({ currentPullRequest, eventHeadSha }) {
  const runHeadSha = eventHeadSha;
  const currentHeadSha = currentPullRequest.head?.sha;

  return Boolean(runHeadSha && currentHeadSha && runHeadSha !== currentHeadSha);
}

function mapReviewStateToStatus({ reviewState }) {
  switch (reviewState?.toLowerCase()) {
    case "approved":
      return "Passed";
    case "changes_requested":
      return "Changes requested";
    case "unknown":
      return "Unknown";
    default:
      return null;
  }
}

async function resolvePullRequestReviewState({
  fetchImpl,
  githubToken,
  pullRequest,
  reviewAction,
  reviewState,
}) {
  const reviewsUrl = buildPullRequestReviewsApiUrl(pullRequest);

  if (!reviewsUrl) {
    return reviewAction === "dismissed" ? "unknown" : reviewState;
  }

  const reviews = await fetchGitHubPullRequestReviews({
    fetchImpl,
    githubToken,
    reviewsUrl,
  });

  return deriveReviewStateFromReviews({
    fallbackState: reviewAction === "dismissed" ? "unknown" : reviewState,
    reviews,
  });
}

function deriveReviewStateFromReviews({ fallbackState, reviews }) {
  const latestDecisiveByReviewer = new Map();

  for (const review of reviews ?? []) {
    const reviewer = review.user?.login;
    const submittedAt = review.submitted_at ?? "";
    const reviewState = review.state?.toLowerCase();

    if (!reviewer || !isDecisiveReviewState(reviewState)) {
      continue;
    }

    const previousReview = latestDecisiveByReviewer.get(reviewer);

    if (!previousReview || submittedAt >= (previousReview.submitted_at ?? "")) {
      latestDecisiveByReviewer.set(reviewer, {
        ...review,
        state: reviewState,
      });
    }
  }

  const latestStates = Array.from(latestDecisiveByReviewer.values()).map(
    (review) => review.state,
  );

  if (latestStates.includes("changes_requested")) {
    return "changes_requested";
  }

  if (latestStates.includes("approved")) {
    return "approved";
  }

  return fallbackState;
}

function isDecisiveReviewState(reviewState) {
  return ["approved", "changes_requested", "dismissed"].includes(reviewState);
}

function buildPullRequestApiUrl({ number, repositoryUrl }) {
  if (!number || !repositoryUrl) {
    return null;
  }

  return `${repositoryUrl}/pulls/${number}`;
}

function buildPullRequestReviewsApiUrl(pullRequest) {
  if (!pullRequest?.url) {
    return null;
  }

  return `${pullRequest.url}/reviews`;
}

function isCrossRepositoryPullRequest(pullRequest, repository) {
  if (!repository) {
    return false;
  }

  const headRepository = pullRequest.head?.repo?.full_name;

  return Boolean(headRepository && headRepository !== repository);
}

function isNotionPageInDataSource(page, dataSourceId) {
  const pageParentId = getNotionPageParentDataSourceId(page);

  return Boolean(
    pageParentId &&
    normalizeNotionId(pageParentId) === normalizeNotionId(dataSourceId),
  );
}

function getNotionPageParentDataSourceId(page) {
  const parent = page?.parent;

  if (!parent) {
    return null;
  }

  if (parent.type === "data_source_id") {
    return parent.data_source_id;
  }

  if (parent.type === "database_id") {
    return parent.database_id;
  }

  return null;
}

function normalizeNotionId(id) {
  return String(id ?? "")
    .replaceAll("-", "")
    .toLowerCase();
}

function formatCompactUuid(compactId) {
  const id = compactId.toLowerCase();

  return [
    id.slice(0, 8),
    id.slice(8, 12),
    id.slice(12, 16),
    id.slice(16, 20),
    id.slice(20),
  ].join("-");
}

function richText(content) {
  if (!content) {
    return { rich_text: [] };
  }

  return {
    rich_text: [
      {
        text: {
          content,
        },
      },
    ],
  };
}

function select(name) {
  return {
    select: {
      name,
    },
  };
}

function status(name) {
  return {
    status: {
      name,
    },
  };
}

function date(start) {
  return {
    date: {
      start,
    },
  };
}

async function updateNotionPage({
  fetchImpl,
  notionToken,
  pageId,
  properties,
}) {
  const response = await fetchImpl(
    `https://api.notion.com/v1/pages/${pageId}`,
    {
      body: JSON.stringify({ properties }),
      headers: {
        Authorization: `Bearer ${notionToken}`,
        "Content-Type": "application/json",
        "Notion-Version": NOTION_API_VERSION,
      },
      method: "PATCH",
    },
  );

  if (!response.ok) {
    const errorBody = await response.text();
    const permissionHint =
      response.status === 404
        ? " Check that the Notion ticket page and its parent data source are shared with the integration configured by NOTION_TOKEN."
        : "";

    throw new Error(
      `Notion page update failed (${response.status}): ${errorBody}${permissionHint}`,
    );
  }
}

async function validateNotionTicketPage({
  dataSourceId,
  fetchImpl,
  notionToken,
  pageId,
}) {
  const page = await retrieveNotionPage({
    fetchImpl,
    notionToken,
    pageId,
  });

  if (!isNotionPageInDataSource(page, dataSourceId)) {
    return {
      ok: false,
      reason: "Notion ticket page is not in the configured Notion data source",
    };
  }

  return {
    ok: true,
  };
}

async function retrieveNotionPage({ fetchImpl, notionToken, pageId }) {
  const response = await fetchImpl(
    `https://api.notion.com/v1/pages/${pageId}`,
    {
      headers: {
        Authorization: `Bearer ${notionToken}`,
        "Notion-Version": NOTION_API_VERSION,
      },
      method: "GET",
    },
  );

  if (!response.ok) {
    const errorBody = await response.text();
    const permissionHint =
      response.status === 404
        ? " Check that the Notion ticket page and its parent data source are shared with the integration configured by NOTION_TOKEN."
        : "";

    throw new Error(
      `Notion page retrieval failed (${response.status}): ${errorBody}${permissionHint}`,
    );
  }

  return response.json();
}

async function fetchGitHubPullRequest({
  fetchImpl,
  githubToken,
  pullRequestUrl,
}) {
  const response = await fetchImpl(pullRequestUrl, {
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${githubToken}`,
      "X-GitHub-Api-Version": GITHUB_API_VERSION,
    },
  });

  if (!response.ok) {
    const errorBody = await response.text();

    throw new Error(
      `GitHub pull request fetch failed (${response.status}): ${errorBody}`,
    );
  }

  return response.json();
}

async function fetchGitHubPullRequestReviews({
  fetchImpl,
  githubToken,
  reviewsUrl,
}) {
  const reviews = [];
  let nextUrl = buildPaginatedGitHubUrl(reviewsUrl);

  while (nextUrl) {
    const response = await fetchImpl(nextUrl, {
      headers: {
        Accept: "application/vnd.github+json",
        Authorization: `Bearer ${githubToken}`,
        "X-GitHub-Api-Version": GITHUB_API_VERSION,
      },
    });

    if (!response.ok) {
      const errorBody = await response.text();

      throw new Error(
        `GitHub pull request reviews fetch failed (${response.status}): ${errorBody}`,
      );
    }

    const pageReviews = await response.json();

    if (Array.isArray(pageReviews)) {
      reviews.push(...pageReviews);
    }

    nextUrl = parseGitHubNextLink(response.headers.get("link"));
  }

  return reviews;
}

function buildPaginatedGitHubUrl(url) {
  try {
    const paginatedUrl = new URL(url);
    paginatedUrl.searchParams.set("per_page", "100");

    return paginatedUrl.toString();
  } catch {
    const separator = url.includes("?") ? "&" : "?";

    return `${url}${separator}per_page=100`;
  }
}

function parseGitHubNextLink(linkHeader) {
  if (!linkHeader) {
    return null;
  }

  const nextLink = linkHeader
    .split(",")
    .find((link) => /;\s*rel="next"\s*$/i.test(link.trim()));

  return nextLink?.match(/<([^>]+)>/)?.[1] ?? null;
}

async function main() {
  try {
    const result = await runSync();

    if (!result.ok) {
      console.error(result.reason);
      process.exitCode = 1;
      return;
    }

    if (result.skipped) {
      console.log(result.reason);
      return;
    }

    console.log(`Notion ticket synced: ${result.ticketUrl}`);
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  await main();
}
