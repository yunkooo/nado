import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  buildNotionPropertiesForEvent,
  createSyncPlan,
  deriveCiResult,
  extractNotionPageId,
  mapCiResultToStatus,
  parseTicketUrlFromBody,
  runSync,
} from "./notion-ticket-sync.mjs";

const now = "2026-06-24T12:00:00.000Z";
const ciWorkflowSource = readFileSync(
  new URL("../.github/workflows/ci.yml", import.meta.url),
  "utf8",
);
const notionTicketSyncWorkflowSource = readFileSync(
  new URL("../.github/workflows/notion-ticket-sync.yml", import.meta.url),
  "utf8",
);

const pullRequest = {
  body: [
    "## Notion Ticket",
    "",
    "- Ticket: https://app.notion.com/p/Nado-Ticket-11111111222233334444555555555555?pvs=4",
  ].join("\n"),
  closed_at: "2026-06-24T12:30:00.000Z",
  created_at: "2026-06-24T11:30:00.000Z",
  head: {
    ref: "codex/nado-notion-sync",
  },
  html_url: "https://github.com/yunkooo/nado/pull/42",
  merged: false,
  merged_at: null,
};

describe("notion ticket sync helpers", () => {
  it("parses the Notion ticket URL from the PR template body", () => {
    expect(parseTicketUrlFromBody(pullRequest.body)).toBe(
      "https://app.notion.com/p/Nado-Ticket-11111111222233334444555555555555?pvs=4",
    );
  });

  it("returns null when the PR body has no Notion ticket URL", () => {
    expect(parseTicketUrlFromBody("## Notion Ticket\n\n- Ticket:")).toBeNull();
  });

  it("extracts a page id from compact and dashed Notion URLs", () => {
    expect(
      extractNotionPageId(
        "https://app.notion.com/p/Nado-Ticket-11111111222233334444555555555555?pvs=4",
      ),
    ).toBe("11111111-2222-3333-4444-555555555555");
    expect(
      extractNotionPageId(
        "https://www.notion.so/Task-11111111-2222-3333-4444-555555555555",
      ),
    ).toBe("11111111-2222-3333-4444-555555555555");
  });

  it("maps GitHub Actions job results to Notion CI status values", () => {
    expect(mapCiResultToStatus("success")).toBe("Success");
    expect(mapCiResultToStatus("failure")).toBe("Failed");
    expect(mapCiResultToStatus("cancelled")).toBe("Cancelled");
    expect(mapCiResultToStatus("skipped")).toBe("Unknown");
    expect(mapCiResultToStatus(undefined)).toBe("Pending");
  });

  it("derives one CI result from verify and e2e job results", () => {
    expect(
      deriveCiResult({
        action: "synchronize",
        e2eResult: "success",
        pullRequest,
        verifyResult: "success",
      }),
    ).toBe("success");
    expect(
      deriveCiResult({
        action: "synchronize",
        e2eResult: "skipped",
        pullRequest,
        verifyResult: "failure",
      }),
    ).toBe("failure");
    expect(
      deriveCiResult({
        action: "closed",
        e2eResult: "skipped",
        pullRequest: {
          ...pullRequest,
          merged: true,
        },
        verifyResult: "skipped",
      }),
    ).toBe("success");
  });

  it("builds the In-review properties for an active PR event", () => {
    const properties = buildNotionPropertiesForEvent({
      action: "synchronize",
      ciStatus: "Failed",
      now,
      pullRequest,
    });

    expect(properties["상태"].status.name).toBe("IN-review");
    expect(properties["GitHub PR"].url).toBe(pullRequest.html_url);
    expect(properties["GitHub Branch"].rich_text[0].text.content).toBe(
      "codex/nado-notion-sync",
    );
    expect(properties["CI Status"].select.name).toBe("Failed");
    expect(properties["Review Status"].select.name).toBe("Pending");
    expect(properties["Last CI Check"].date.start).toBe(now);
    expect(properties["Last Review Check"].date.start).toBe(now);
    expect(properties["PR Created At"].date.start).toBe(
      "2026-06-24T11:30:00.000Z",
    );
  });

  it("builds Done properties only when the PR was merged", () => {
    const properties = buildNotionPropertiesForEvent({
      action: "closed",
      ciStatus: "Success",
      now,
      pullRequest: {
        ...pullRequest,
        closed_at: "2026-06-24T12:45:00.000Z",
        merged: true,
        merged_at: "2026-06-24T12:44:00.000Z",
      },
    });

    expect(properties["상태"].status.name).toBe("DONE");
    expect(properties["CI Status"].select.name).toBe("Success");
    expect(properties["Review Status"].select.name).toBe("Passed");
    expect(properties["Merged At"].date.start).toBe("2026-06-24T12:44:00.000Z");
    expect(properties["종료일"].date.start).toBe("2026-06-24T12:45:00.000Z");
    expect(properties.Blocker.rich_text).toEqual([]);
  });

  it("keeps a closed unmerged PR out of Done and records a blocker", () => {
    const properties = buildNotionPropertiesForEvent({
      action: "closed",
      ciStatus: "Unknown",
      now,
      pullRequest,
    });

    expect(properties["상태"]).toBeUndefined();
    expect(properties["CI Status"].select.name).toBe("Unknown");
    expect(properties.Blocker.rich_text[0].text.content).toBe(
      "PR closed without merge",
    );
  });

  it("returns a failed sync plan when the PR is missing a Notion ticket URL", () => {
    const plan = createSyncPlan({
      action: "opened",
      e2eResult: "success",
      now,
      pullRequest: {
        ...pullRequest,
        body: "## Notion Ticket\n\n- Ticket:",
      },
      verifyResult: "success",
    });

    expect(plan.ok).toBe(false);
    expect(plan.reason).toBe("Missing Notion Ticket URL in PR body");
  });

  it("syncs CI results from a workflow_run event after fetching trusted PR details", async () => {
    const githubPullRequestUrl =
      "https://api.github.com/repos/yunkooo/nado/pulls/42";
    const requests = [];

    const result = await runSync({
      env: {
        GITHUB_EVENT_PATH: "workflow-run-event.json",
        GITHUB_REPOSITORY: "yunkooo/nado",
        GITHUB_TOKEN: "github-token",
        NOTION_TICKETS_DATA_SOURCE_ID: "notion-data-source",
        NOTION_TOKEN: "notion-token",
      },
      fetchImpl: async (url, options = {}) => {
        requests.push({ options, url });

        if (url === githubPullRequestUrl) {
          return Response.json({
            ...pullRequest,
            head: {
              ...pullRequest.head,
              repo: {
                full_name: "yunkooo/nado",
              },
            },
          });
        }

        return Response.json({}, { status: 200 });
      },
      readFile: () =>
        JSON.stringify({
          repository: {
            url: "https://api.github.com/repos/yunkooo/nado",
          },
          workflow_run: {
            conclusion: "failure",
            event: "pull_request",
            pull_requests: [
              {
                number: 42,
                url: githubPullRequestUrl,
              },
            ],
          },
        }),
    });

    expect(result.ok).toBe(true);
    expect(requests[0].url).toBe(githubPullRequestUrl);
    expect(requests[0].options.headers.Authorization).toBe(
      "Bearer github-token",
    );
    expect(requests[1].url).toBe(
      "https://api.notion.com/v1/pages/11111111-2222-3333-4444-555555555555",
    );
    expect(
      JSON.parse(requests[1].options.body).properties["CI Status"],
    ).toEqual({
      select: {
        name: "Failed",
      },
    });
  });

  it("skips CI-result syncs for closed pull requests", async () => {
    const githubPullRequestUrl =
      "https://api.github.com/repos/yunkooo/nado/pulls/42";
    const requests = [];

    const result = await runSync({
      env: {
        GITHUB_EVENT_PATH: "workflow-run-event.json",
        GITHUB_REPOSITORY: "yunkooo/nado",
        GITHUB_TOKEN: "github-token",
        NOTION_TICKETS_DATA_SOURCE_ID: "notion-data-source",
        NOTION_TOKEN: "notion-token",
      },
      fetchImpl: async (url, options = {}) => {
        requests.push({ options, url });

        if (url === githubPullRequestUrl) {
          return Response.json({
            ...pullRequest,
            merged: true,
            state: "closed",
          });
        }

        return Response.json({}, { status: 200 });
      },
      readFile: () =>
        JSON.stringify({
          repository: {
            url: "https://api.github.com/repos/yunkooo/nado",
          },
          workflow_run: {
            conclusion: "success",
            event: "pull_request",
            pull_requests: [
              {
                number: 42,
                url: githubPullRequestUrl,
              },
            ],
          },
        }),
    });

    expect(result.ok).toBe(true);
    expect(result.skipped).toBe(true);
    expect(result.reason).toBe(
      "Skipping CI-result Notion sync for a closed pull request",
    );
    expect(requests).toHaveLength(1);
    expect(requests[0].url).toBe(githubPullRequestUrl);
  });

  it("keeps Notion secrets out of PR-controlled CI code", () => {
    expect(ciWorkflowSource).toContain(
      "types: [opened, synchronize, reopened, edited, ready_for_review]",
    );
    expect(ciWorkflowSource).not.toContain(
      "types: [opened, synchronize, reopened, edited, ready_for_review, closed]",
    );
    expect(ciWorkflowSource).not.toContain("NOTION_TOKEN");
    expect(ciWorkflowSource).not.toContain("NOTION_TICKETS_DATA_SOURCE_ID");
    expect(ciWorkflowSource).not.toContain("notion-ticket-sync:");
    expect(notionTicketSyncWorkflowSource).toContain("pull_request_target:");
    expect(notionTicketSyncWorkflowSource).toContain("workflow_run:");
    expect(notionTicketSyncWorkflowSource).toContain(
      "Checkout trusted base code",
    );
    expect(notionTicketSyncWorkflowSource).toContain(
      "ref: ${{ github.event.pull_request.base.sha }}",
    );
    expect(notionTicketSyncWorkflowSource).toContain(
      "Checkout trusted default branch code",
    );
  });
});
