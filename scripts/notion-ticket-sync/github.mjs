import { GITHUB_API_VERSION } from "./constants.mjs";

export function shouldFetchCurrentPullRequestForEvent(action) {
  return [
    "closed",
    "edited",
    "opened",
    "ready_for_review",
    "reopened",
    "synchronize",
  ].includes(action);
}

export function isPullRequestTargetingTrustedBase(pullRequest, event) {
  const trustedBaseBranch = getTrustedBaseBranch(event);
  const baseRef = pullRequest?.base?.ref;

  return Boolean(baseRef && baseRef === trustedBaseBranch);
}

export function buildNonTrustedBaseSkipResult(event) {
  return {
    ok: true,
    reason: `Skipping Notion sync for a pull request that does not target ${getTrustedBaseBranch(event)}`,
    skipped: true,
  };
}

function getTrustedBaseBranch(event) {
  return event.repository?.default_branch ?? "main";
}

export function isStaleWorkflowRunForPullRequest(workflowRun, pullRequest) {
  return isStalePullRequestHead({
    currentPullRequest: pullRequest,
    eventHeadSha: workflowRun?.head_sha,
  });
}

export function isOlderWorkflowRunForSameHead(workflowRun, latestWorkflowRun) {
  if (!workflowRun || !latestWorkflowRun) {
    return false;
  }

  if (
    workflowRun.head_sha &&
    latestWorkflowRun.head_sha &&
    workflowRun.head_sha !== latestWorkflowRun.head_sha
  ) {
    return false;
  }

  if (workflowRun.id && latestWorkflowRun.id) {
    if (workflowRun.id !== latestWorkflowRun.id) {
      return true;
    }

    const runAttempt = Number(workflowRun.run_attempt ?? 0);
    const latestRunAttempt = Number(latestWorkflowRun.run_attempt ?? 0);

    return Boolean(
      runAttempt && latestRunAttempt && runAttempt < latestRunAttempt,
    );
  }

  return false;
}

export function isStaleSynchronizeEventForPullRequest(
  eventPullRequest,
  pullRequest,
) {
  return isStalePullRequestHead({
    currentPullRequest: pullRequest,
    eventHeadSha: eventPullRequest?.head?.sha,
  });
}

function isStalePullRequestHead({ currentPullRequest, eventHeadSha }) {
  const currentHeadSha = currentPullRequest.head?.sha;

  return Boolean(
    eventHeadSha && currentHeadSha && eventHeadSha !== currentHeadSha,
  );
}

export function mapReviewStateToStatus({ reviewState }) {
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

export async function resolvePullRequestReviewState({
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

export function deriveReviewStateFromReviews({ fallbackState, reviews }) {
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

  if (latestStates.includes("dismissed")) {
    return "unknown";
  }

  return fallbackState;
}

function isDecisiveReviewState(reviewState) {
  return ["approved", "changes_requested", "dismissed"].includes(reviewState);
}

export function buildPullRequestApiUrl({ number, repositoryUrl }) {
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

export function isCrossRepositoryPullRequest(pullRequest, repository) {
  if (!repository) {
    return false;
  }

  const headRepository = pullRequest.head?.repo?.full_name;

  return !headRepository || headRepository !== repository;
}

export function isCrossRepositoryWorkflowRun(workflowRun, repository) {
  if (!repository) {
    return false;
  }

  const headRepository = workflowRun?.head_repository?.full_name;

  return Boolean(headRepository && headRepository !== repository);
}

export async function fetchGitHubPullRequest({
  fetchImpl,
  githubToken,
  pullRequestUrl,
}) {
  const response = await fetchImpl(pullRequestUrl, {
    headers: githubHeaders(githubToken),
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
      headers: githubHeaders(githubToken),
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

export async function fetchLatestWorkflowRunForHead({
  fetchImpl,
  githubToken,
  repositoryUrl,
  workflowRun,
}) {
  const workflowRunsUrl = buildWorkflowRunsForHeadApiUrl({
    repositoryUrl,
    workflowRun,
  });

  if (!workflowRunsUrl) {
    return null;
  }

  const response = await fetchImpl(workflowRunsUrl, {
    headers: githubHeaders(githubToken),
  });

  if (!response.ok) {
    const errorBody = await response.text();

    throw new Error(
      `GitHub workflow runs fetch failed (${response.status}): ${errorBody}`,
    );
  }

  const body = await response.json();

  return body.workflow_runs?.[0] ?? null;
}

function buildWorkflowRunsForHeadApiUrl({ repositoryUrl, workflowRun }) {
  if (!repositoryUrl || !workflowRun?.workflow_id || !workflowRun?.head_sha) {
    return null;
  }

  const workflowRunsUrl = new URL(
    `${repositoryUrl}/actions/workflows/${workflowRun.workflow_id}/runs`,
  );

  workflowRunsUrl.searchParams.set("event", "pull_request");
  workflowRunsUrl.searchParams.set("head_sha", workflowRun.head_sha);
  workflowRunsUrl.searchParams.set("per_page", "1");

  return workflowRunsUrl.toString();
}

export function buildPaginatedGitHubUrl(url) {
  try {
    const paginatedUrl = new URL(url);
    paginatedUrl.searchParams.set("per_page", "100");

    return paginatedUrl.toString();
  } catch {
    const separator = url.includes("?") ? "&" : "?";

    return `${url}${separator}per_page=100`;
  }
}

export function parseGitHubNextLink(linkHeader) {
  if (!linkHeader) {
    return null;
  }

  const nextLink = linkHeader
    .split(",")
    .find((link) => /;\s*rel="next"\s*$/i.test(link.trim()));

  return nextLink?.match(/<([^>]+)>/)?.[1] ?? null;
}

function githubHeaders(githubToken) {
  return {
    Accept: "application/vnd.github+json",
    Authorization: `Bearer ${githubToken}`,
    "X-GitHub-Api-Version": GITHUB_API_VERSION,
  };
}
