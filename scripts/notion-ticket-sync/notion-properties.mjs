import { REQUIRED_PUSH_METADATA_PROPERTIES } from "./constants.mjs";
import { mapReviewStateToStatus } from "./github.mjs";

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

export function deriveCiResult({ action, ciResult, e2eResult, verifyResult }) {
  if (ciResult) {
    return ciResult;
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
  const shouldUpdatePrMetadata =
    !isCiResultSync && !isReviewSync && action !== "closed";
  const shouldUpdateCi = isCiResultSync;
  const properties = {};

  if (shouldUpdatePrMetadata) {
    properties["GitHub PR"] = { url: pullRequest.html_url ?? null };
    properties["GitHub Branch"] = richText(pullRequest.head?.ref ?? "");

    if (pullRequest.created_at) {
      properties["PR Created At"] = date(pullRequest.created_at);
    }
  }

  if (shouldUpdateCi) {
    properties["CI Status"] = select(ciStatus ?? "Unknown");
    properties["Last CI Check"] = date(now);
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
        "Merged At": date(mergedAt),
        종료일: date(completedAt),
      };
    }

    return {
      ...properties,
      Blocker: richText("PR closed without merge"),
    };
  }

  if (isReviewSync) {
    const reviewStatus = mapReviewStateToStatus({
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

export function applyOwnedBlockerUpdate({
  action,
  page,
  properties,
  pullRequest,
}) {
  const automaticBlocker = "PR closed without merge";
  const currentBlocker = readRichTextProperty(page?.properties?.Blocker, {
    trim: false,
  });

  if (action === "closed" && !pullRequest?.merged) {
    if (currentBlocker && currentBlocker !== automaticBlocker) {
      delete properties.Blocker;
    }

    return;
  }

  if (
    (action === "reopened" || (action === "closed" && pullRequest?.merged)) &&
    currentBlocker === automaticBlocker
  ) {
    properties.Blocker = richText("");
  }
}

export function validateRequiredPushMetadataProperties({ page, properties }) {
  const notionProperties =
    page?.properties && typeof page.properties === "object"
      ? page.properties
      : {};
  const missingProperties = REQUIRED_PUSH_METADATA_PROPERTIES.filter(
    (propertyName) =>
      propertyName in properties && !(propertyName in notionProperties),
  );

  if (missingProperties.length === 0) {
    return {
      ok: true,
    };
  }

  return {
    ok: false,
    reason: `Notion data source is missing required push metadata properties: ${missingProperties.join(", ")}`,
  };
}

export function richText(content) {
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

export function readRichTextProperty(property, { trim = true } = {}) {
  const richText = Array.isArray(property?.rich_text) ? property.rich_text : [];
  const value = richText
    .map((item) => item?.plain_text ?? item?.text?.content ?? "")
    .join("");

  return trim ? value.trim() : value;
}
