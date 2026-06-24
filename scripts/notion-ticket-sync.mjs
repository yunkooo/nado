#!/usr/bin/env node

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const NOTION_API_VERSION = "2022-06-28";
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

  return "unknown";
}

export function buildNotionPropertiesForEvent({
  action,
  ciStatus,
  now,
  pullRequest,
}) {
  if (!pullRequest) {
    throw new Error("pullRequest is required");
  }

  const properties = {
    "GitHub PR": { url: pullRequest.html_url ?? null },
    "GitHub Branch": richText(pullRequest.head?.ref ?? ""),
    "CI Status": select(ciStatus ?? "Unknown"),
    "Last CI Check": date(now),
  };

  if (pullRequest.created_at) {
    properties["PR Created At"] = date(pullRequest.created_at);
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

  return {
    ...properties,
    상태: status("IN-review"),
    "Review Status": select("Pending"),
    "Last Review Check": date(now),
    Blocker: richText(""),
  };
}

export function createSyncPlan({
  action,
  ciResult,
  e2eResult,
  now = new Date().toISOString(),
  pullRequest,
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
  const pullRequest = event.pull_request;

  if (!pullRequest) {
    return {
      ok: false,
      reason: "GitHub event payload does not include pull_request",
    };
  }

  const syncPlan = createSyncPlan({
    action: event.action,
    ciResult: env.CI_RESULT,
    e2eResult: env.E2E_RESULT,
    pullRequest,
    verifyResult: env.VERIFY_RESULT,
  });

  if (!syncPlan.ok) {
    return syncPlan;
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

    throw new Error(
      `Notion page update failed (${response.status}): ${errorBody}`,
    );
  }
}

async function main() {
  try {
    const result = await runSync();

    if (!result.ok) {
      console.error(result.reason);
      process.exitCode = 1;
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
