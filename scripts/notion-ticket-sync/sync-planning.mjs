import {
  buildNonTrustedBaseSkipResult,
  buildPullRequestApiUrl,
  fetchGitHubPullRequest,
  fetchLatestWorkflowRunForHead,
  isCrossRepositoryWorkflowRun,
  isOlderWorkflowRunForSameHead,
  isPullRequestTargetingTrustedBase,
  isStaleSynchronizeEventForPullRequest,
  isStaleWorkflowRunForPullRequest,
  resolvePullRequestReviewState,
  shouldFetchCurrentPullRequestForEvent,
} from "./github.mjs";
import {
  buildNotionPropertiesForEvent,
  deriveCiResult,
  mapCiResultToStatus,
} from "./notion-properties.mjs";
import { extractNotionPageId, parseTicketUrlFromBody } from "./ticket-url.mjs";

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

export async function resolveSyncInput({ env, event, fetchImpl }) {
  if (event.review && event.pull_request) {
    if (!env.GITHUB_TOKEN) {
      return missingGitHubToken();
    }

    if (!isPullRequestTargetingTrustedBase(event.pull_request, event)) {
      return buildNonTrustedBaseSkipResult(event);
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
    return resolvePullRequestEventInput({ env, event, fetchImpl });
  }

  return resolveWorkflowRunInput({ env, event, fetchImpl });
}

async function resolvePullRequestEventInput({ env, event, fetchImpl }) {
  let pullRequest = event.pull_request;

  if (shouldFetchCurrentPullRequestForEvent(event.action)) {
    if (!env.GITHUB_TOKEN) {
      return missingGitHubToken();
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
    const staleResult = stalePullRequestEventResult({
      action: event.action,
      currentPullRequest,
      eventPullRequest: event.pull_request,
    });

    if (staleResult) {
      return staleResult;
    }

    pullRequest = currentPullRequest;
  }

  if (!isPullRequestTargetingTrustedBase(pullRequest, event)) {
    return buildNonTrustedBaseSkipResult(event);
  }

  const bindingEdit = getTicketBindingEdit(event, pullRequest);

  return {
    action: event.action,
    ciResult: env.CI_RESULT,
    mayCreateInitialBinding:
      event.action === "opened" || bindingEdit.isTicketBindingEdit,
    ok: true,
    pullRequest,
    syncMode:
      event.action === "edited" && !bindingEdit.isTicketBindingEdit
        ? "metadata-only"
        : "pr-event",
  };
}

function stalePullRequestEventResult({
  action,
  currentPullRequest,
  eventPullRequest,
}) {
  if (action === "closed" && currentPullRequest.state !== "closed") {
    return skipped(
      "Skipping stale closed PR-event Notion sync for a reopened pull request",
    );
  }

  if (action !== "closed" && currentPullRequest.state === "closed") {
    return skipped(
      "Skipping stale PR-event Notion sync for a closed pull request",
    );
  }

  if (
    action === "synchronize" &&
    isStaleSynchronizeEventForPullRequest(eventPullRequest, currentPullRequest)
  ) {
    return skipped(
      "Skipping stale PR-event Notion sync for an outdated synchronize event",
    );
  }

  return null;
}

function getTicketBindingEdit(event, pullRequest) {
  const previousBody = event.changes?.body?.from;
  const previousTicketPageId = extractTicketPageId(previousBody);
  const currentTicketPageId = extractTicketPageId(pullRequest.body ?? "");

  return {
    isTicketBindingEdit:
      event.action === "edited" &&
      typeof previousBody === "string" &&
      previousTicketPageId !== currentTicketPageId,
  };
}

function extractTicketPageId(body) {
  if (typeof body !== "string") {
    return null;
  }

  const ticketUrl = parseTicketUrlFromBody(body);

  return ticketUrl ? extractNotionPageId(ticketUrl) : null;
}

async function resolveWorkflowRunInput({ env, event, fetchImpl }) {
  const workflowRun = event.workflow_run;

  if (
    workflowRun?.event !== "pull_request" &&
    workflowRun?.event !== "pull_request_review"
  ) {
    return {
      ok: false,
      reason: "GitHub event payload does not include a pull request",
    };
  }

  if (isCrossRepositoryWorkflowRun(workflowRun, env.GITHUB_REPOSITORY)) {
    return skipped("Skipping Notion sync for a fork pull request");
  }

  const pullRequestSummary = workflowRun.pull_requests?.[0];
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
    return missingGitHubToken();
  }

  const pullRequest = await fetchGitHubPullRequest({
    fetchImpl,
    githubToken: env.GITHUB_TOKEN,
    pullRequestUrl,
  });

  if (!isPullRequestTargetingTrustedBase(pullRequest, event)) {
    return buildNonTrustedBaseSkipResult(event);
  }

  if (workflowRun.event === "pull_request_review") {
    return resolveWorkflowReviewInput({ env, fetchImpl, pullRequest });
  }

  if (pullRequest.state === "closed") {
    return skipped("Skipping CI-result Notion sync for a closed pull request");
  }

  if (isStaleWorkflowRunForPullRequest(workflowRun, pullRequest)) {
    return skipped(
      "Skipping stale CI-result Notion sync for an outdated workflow run",
    );
  }

  const latestWorkflowRun = await fetchLatestWorkflowRunForHead({
    fetchImpl,
    githubToken: env.GITHUB_TOKEN,
    repositoryUrl: event.repository?.url,
    workflowRun,
  });

  if (isOlderWorkflowRunForSameHead(workflowRun, latestWorkflowRun)) {
    return skipped(
      "Skipping stale CI-result Notion sync for an older workflow run",
    );
  }

  return {
    action: "synchronize",
    ciResult: env.CI_RESULT ?? workflowRun.conclusion,
    ok: true,
    pullRequest,
    syncMode: "ci-result",
  };
}

async function resolveWorkflowReviewInput({ env, fetchImpl, pullRequest }) {
  if (pullRequest.state === "closed") {
    return skipped("Skipping review Notion sync for a closed pull request");
  }

  const reviewState = await resolvePullRequestReviewState({
    fetchImpl,
    githubToken: env.GITHUB_TOKEN,
    pullRequest,
    reviewAction: "submitted",
    reviewState: "unknown",
  });

  return {
    action: "submitted",
    ok: true,
    pullRequest,
    reviewState,
    syncMode: "review-event",
  };
}

function missingGitHubToken() {
  return {
    ok: false,
    reason: "Missing required environment variables: GITHUB_TOKEN",
  };
}

function skipped(reason) {
  return {
    ok: true,
    reason,
    skipped: true,
  };
}
