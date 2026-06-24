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
const notionTicketSkillSource = readFileSync(
  new URL("../.agents/skills/notion-ticket-pr-loop/SKILL.md", import.meta.url),
  "utf8",
);
const notionTicketSchemaSource = readFileSync(
  new URL("../docs/workflow/notion-ticket-db-schema.md", import.meta.url),
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
    expect(
      deriveCiResult({
        action: "synchronize",
        pullRequest,
      }),
    ).toBe("pending");
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

  it("records push metadata for synchronize events", () => {
    const properties = buildNotionPropertiesForEvent({
      action: "synchronize",
      ciStatus: "Pending",
      now,
      pullRequest: {
        ...pullRequest,
        head: {
          ...pullRequest.head,
          sha: "abcdef1234567890",
        },
        number: 42,
        title: "Notion 티켓 push 메타데이터 반영",
      },
    });

    expect(properties["Last Push At"].date.start).toBe(now);
    expect(properties["Last Head SHA"].rich_text[0].text.content).toBe(
      "abcdef1234567890",
    );
    expect(properties["Last Push Summary"].rich_text[0].text.content).toContain(
      "PR #42",
    );
    expect(properties["Last Push Summary"].rich_text[0].text.content).toContain(
      "abcdef1",
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

  it("keeps CI and review fields out of PR body edit syncs", () => {
    const plan = createSyncPlan({
      action: "edited",
      now,
      pullRequest,
      syncMode: "metadata-only",
    });

    expect(plan.ok).toBe(true);
    expect(plan.properties["GitHub PR"].url).toBe(pullRequest.html_url);
    expect(plan.properties["GitHub Branch"].rich_text[0].text.content).toBe(
      "codex/nado-notion-sync",
    );
    expect(plan.properties["CI Status"]).toBeUndefined();
    expect(plan.properties["Last CI Check"]).toBeUndefined();
    expect(plan.properties["상태"]).toBeUndefined();
    expect(plan.properties["Review Status"]).toBeUndefined();
    expect(plan.properties["Last Review Check"]).toBeUndefined();
    expect(plan.properties.Blocker).toBeUndefined();
  });

  it("rejects Notion ticket pages outside the configured data source", async () => {
    const requests = [];

    const result = await runSync({
      env: {
        GITHUB_EVENT_PATH: "pull-request-event.json",
        GITHUB_REPOSITORY: "yunkooo/nado",
        GITHUB_TOKEN: "github-token",
        NOTION_TICKETS_DATA_SOURCE_ID: "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee",
        NOTION_TOKEN: "notion-token",
      },
      fetchImpl: async (url, options = {}) => {
        requests.push({ options, url });

        if (url === "https://api.github.com/repos/yunkooo/nado/pulls/42") {
          return Response.json({
            ...pullRequest,
            number: 42,
            state: "open",
            url,
          });
        }

        if (options.method === "GET") {
          return Response.json({
            parent: {
              data_source_id: "11111111-2222-3333-4444-555555555555",
              type: "data_source_id",
            },
          });
        }

        return Response.json({}, { status: 200 });
      },
      readFile: () =>
        JSON.stringify({
          action: "opened",
          pull_request: {
            ...pullRequest,
            number: 42,
            url: "https://api.github.com/repos/yunkooo/nado/pulls/42",
          },
        }),
    });

    expect(result.ok).toBe(false);
    expect(result.reason).toBe(
      "Notion ticket page is not in the configured Notion data source",
    );
    expect(requests).toHaveLength(2);
    expect(requests[0].url).toBe(
      "https://api.github.com/repos/yunkooo/nado/pulls/42",
    );
    expect(requests[1].options.method).toBe("GET");
    expect(requests[1].options.headers["Notion-Version"]).toBe("2025-09-03");
  });

  it("skips stale synchronize events before writing push metadata", async () => {
    const pullRequestUrl = "https://api.github.com/repos/yunkooo/nado/pulls/42";
    const requests = [];

    const result = await runSync({
      env: {
        GITHUB_EVENT_PATH: "pull-request-event.json",
        GITHUB_REPOSITORY: "yunkooo/nado",
        GITHUB_TOKEN: "github-token",
        NOTION_TICKETS_DATA_SOURCE_ID: "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee",
        NOTION_TOKEN: "notion-token",
      },
      fetchImpl: async (url, options = {}) => {
        requests.push({ options, url });

        if (url === pullRequestUrl) {
          return Response.json({
            ...pullRequest,
            head: {
              ...pullRequest.head,
              sha: "newer-head-sha",
            },
            url: pullRequestUrl,
          });
        }

        return Response.json({}, { status: 200 });
      },
      readFile: () =>
        JSON.stringify({
          action: "synchronize",
          pull_request: {
            ...pullRequest,
            head: {
              ...pullRequest.head,
              sha: "older-head-sha",
            },
            number: 42,
            url: pullRequestUrl,
          },
        }),
    });

    expect(result.ok).toBe(true);
    expect(result.skipped).toBe(true);
    expect(result.reason).toBe(
      "Skipping stale PR-event Notion sync for an outdated synchronize event",
    );
    expect(requests).toHaveLength(1);
    expect(requests[0].url).toBe(pullRequestUrl);
  });

  it("skips stale active PR events when the current PR is already closed", async () => {
    const pullRequestUrl = "https://api.github.com/repos/yunkooo/nado/pulls/42";
    const requests = [];

    const result = await runSync({
      env: {
        GITHUB_EVENT_PATH: "pull-request-event.json",
        GITHUB_REPOSITORY: "yunkooo/nado",
        GITHUB_TOKEN: "github-token",
        NOTION_TICKETS_DATA_SOURCE_ID: "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee",
        NOTION_TOKEN: "notion-token",
      },
      fetchImpl: async (url, options = {}) => {
        requests.push({ options, url });

        if (url === pullRequestUrl) {
          return Response.json({
            ...pullRequest,
            merged: true,
            state: "closed",
            url: pullRequestUrl,
          });
        }

        return Response.json({}, { status: 200 });
      },
      readFile: () =>
        JSON.stringify({
          action: "opened",
          pull_request: {
            ...pullRequest,
            number: 42,
            state: "open",
            url: pullRequestUrl,
          },
        }),
    });

    expect(result.ok).toBe(true);
    expect(result.skipped).toBe(true);
    expect(result.reason).toBe(
      "Skipping stale PR-event Notion sync for a closed pull request",
    );
    expect(requests).toHaveLength(1);
    expect(requests[0].url).toBe(pullRequestUrl);
  });

  it("syncs pull request review changes without touching CI status", async () => {
    const requests = [];

    const result = await runSync({
      env: {
        GITHUB_EVENT_PATH: "pull-request-review-event.json",
        GITHUB_REPOSITORY: "yunkooo/nado",
        GITHUB_TOKEN: "github-token",
        NOTION_TICKETS_DATA_SOURCE_ID: "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee",
        NOTION_TOKEN: "notion-token",
      },
      fetchImpl: async (url, options = {}) => {
        requests.push({ options, url });

        if (
          url ===
          "https://api.github.com/repos/yunkooo/nado/pulls/42/reviews?per_page=100"
        ) {
          return Response.json([
            {
              id: 1,
              state: "CHANGES_REQUESTED",
              submitted_at: "2026-06-24T11:59:00.000Z",
              user: {
                login: "reviewer-a",
              },
            },
          ]);
        }

        if (options.method === "GET") {
          return Response.json({
            parent: {
              data_source_id: "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee",
              type: "data_source_id",
            },
          });
        }

        return Response.json({}, { status: 200 });
      },
      readFile: () =>
        JSON.stringify({
          action: "submitted",
          pull_request: {
            ...pullRequest,
            number: 42,
            url: "https://api.github.com/repos/yunkooo/nado/pulls/42",
          },
          review: {
            state: "changes_requested",
          },
        }),
    });

    expect(result.ok).toBe(true);
    expect(requests).toHaveLength(3);
    expect(requests[0].url).toBe(
      "https://api.github.com/repos/yunkooo/nado/pulls/42/reviews?per_page=100",
    );
    expect(requests[1].options.method).toBe("GET");
    expect(requests[2].options.method).toBe("PATCH");

    const updatedProperties = JSON.parse(requests[2].options.body).properties;

    expect(updatedProperties["Review Status"]).toEqual({
      select: {
        name: "Changes requested",
      },
    });
    expect(updatedProperties["Last Review Check"]).toEqual({
      date: {
        start: expect.any(String),
      },
    });
    expect(updatedProperties["CI Status"]).toBeUndefined();
    expect(updatedProperties["Last CI Check"]).toBeUndefined();
    expect(updatedProperties["상태"]).toBeUndefined();
  });

  it("keeps review status changes requested while any latest reviewer state requests changes", async () => {
    const requests = [];

    const result = await runSync({
      env: {
        GITHUB_EVENT_PATH: "pull-request-review-event.json",
        GITHUB_REPOSITORY: "yunkooo/nado",
        GITHUB_TOKEN: "github-token",
        NOTION_TICKETS_DATA_SOURCE_ID: "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee",
        NOTION_TOKEN: "notion-token",
      },
      fetchImpl: async (url, options = {}) => {
        requests.push({ options, url });

        if (
          url ===
          "https://api.github.com/repos/yunkooo/nado/pulls/42/reviews?per_page=100"
        ) {
          return Response.json([
            {
              id: 1,
              state: "CHANGES_REQUESTED",
              submitted_at: "2026-06-24T11:50:00.000Z",
              user: {
                login: "reviewer-a",
              },
            },
            {
              id: 2,
              state: "APPROVED",
              submitted_at: "2026-06-24T11:55:00.000Z",
              user: {
                login: "reviewer-b",
              },
            },
          ]);
        }

        if (options.method === "GET") {
          return Response.json({
            parent: {
              data_source_id: "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee",
              type: "data_source_id",
            },
          });
        }

        return Response.json({}, { status: 200 });
      },
      readFile: () =>
        JSON.stringify({
          action: "submitted",
          pull_request: {
            ...pullRequest,
            number: 42,
            url: "https://api.github.com/repos/yunkooo/nado/pulls/42",
          },
          review: {
            state: "approved",
          },
        }),
    });

    expect(result.ok).toBe(true);

    const updatedProperties = JSON.parse(requests[2].options.body).properties;

    expect(updatedProperties["Review Status"]).toEqual({
      select: {
        name: "Changes requested",
      },
    });
    expect(updatedProperties["CI Status"]).toBeUndefined();
  });

  it("does not clear a reviewer change request with a later comment-only review", async () => {
    const requests = [];

    const result = await runSync({
      env: {
        GITHUB_EVENT_PATH: "pull-request-review-event.json",
        GITHUB_REPOSITORY: "yunkooo/nado",
        GITHUB_TOKEN: "github-token",
        NOTION_TICKETS_DATA_SOURCE_ID: "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee",
        NOTION_TOKEN: "notion-token",
      },
      fetchImpl: async (url, options = {}) => {
        requests.push({ options, url });

        if (
          url ===
          "https://api.github.com/repos/yunkooo/nado/pulls/42/reviews?per_page=100"
        ) {
          return Response.json([
            {
              id: 1,
              state: "CHANGES_REQUESTED",
              submitted_at: "2026-06-24T11:50:00.000Z",
              user: {
                login: "reviewer-a",
              },
            },
            {
              id: 2,
              state: "COMMENTED",
              submitted_at: "2026-06-24T11:55:00.000Z",
              user: {
                login: "reviewer-a",
              },
            },
            {
              id: 3,
              state: "APPROVED",
              submitted_at: "2026-06-24T11:58:00.000Z",
              user: {
                login: "reviewer-b",
              },
            },
          ]);
        }

        if (options.method === "GET") {
          return Response.json({
            parent: {
              data_source_id: "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee",
              type: "data_source_id",
            },
          });
        }

        return Response.json({}, { status: 200 });
      },
      readFile: () =>
        JSON.stringify({
          action: "submitted",
          pull_request: {
            ...pullRequest,
            number: 42,
            url: "https://api.github.com/repos/yunkooo/nado/pulls/42",
          },
          review: {
            state: "approved",
          },
        }),
    });

    expect(result.ok).toBe(true);

    const updatedProperties = JSON.parse(requests[2].options.body).properties;

    expect(updatedProperties["Review Status"]).toEqual({
      select: {
        name: "Changes requested",
      },
    });
  });

  it("follows paginated review responses before deriving aggregate review status", async () => {
    const reviewsUrl =
      "https://api.github.com/repos/yunkooo/nado/pulls/42/reviews";
    const requests = [];

    const result = await runSync({
      env: {
        GITHUB_EVENT_PATH: "pull-request-review-event.json",
        GITHUB_REPOSITORY: "yunkooo/nado",
        GITHUB_TOKEN: "github-token",
        NOTION_TICKETS_DATA_SOURCE_ID: "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee",
        NOTION_TOKEN: "notion-token",
      },
      fetchImpl: async (url, options = {}) => {
        requests.push({ options, url });

        if (url === reviewsUrl || url === `${reviewsUrl}?per_page=100`) {
          return Response.json(
            [
              {
                id: 1,
                state: "APPROVED",
                submitted_at: "2026-06-24T11:50:00.000Z",
                user: {
                  login: "reviewer-b",
                },
              },
            ],
            {
              headers: {
                Link: `<${reviewsUrl}?per_page=100&page=2>; rel="next"`,
              },
            },
          );
        }

        if (url === `${reviewsUrl}?per_page=100&page=2`) {
          return Response.json([
            {
              id: 2,
              state: "CHANGES_REQUESTED",
              submitted_at: "2026-06-24T11:59:00.000Z",
              user: {
                login: "reviewer-a",
              },
            },
          ]);
        }

        if (options.method === "GET") {
          return Response.json({
            parent: {
              data_source_id: "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee",
              type: "data_source_id",
            },
          });
        }

        return Response.json({}, { status: 200 });
      },
      readFile: () =>
        JSON.stringify({
          action: "submitted",
          pull_request: {
            ...pullRequest,
            number: 42,
            url: "https://api.github.com/repos/yunkooo/nado/pulls/42",
          },
          review: {
            state: "approved",
          },
        }),
    });

    expect(result.ok).toBe(true);
    expect(requests.map((request) => request.url)).toEqual([
      `${reviewsUrl}?per_page=100`,
      `${reviewsUrl}?per_page=100&page=2`,
      "https://api.notion.com/v1/pages/11111111-2222-3333-4444-555555555555",
      "https://api.notion.com/v1/pages/11111111-2222-3333-4444-555555555555",
    ]);

    const updatedProperties = JSON.parse(requests[3].options.body).properties;

    expect(updatedProperties["Review Status"]).toEqual({
      select: {
        name: "Changes requested",
      },
    });
  });

  it("marks review status passed only when aggregate reviews have no active change requests", async () => {
    const requests = [];

    const result = await runSync({
      env: {
        GITHUB_EVENT_PATH: "pull-request-review-event.json",
        GITHUB_REPOSITORY: "yunkooo/nado",
        GITHUB_TOKEN: "github-token",
        NOTION_TICKETS_DATA_SOURCE_ID: "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee",
        NOTION_TOKEN: "notion-token",
      },
      fetchImpl: async (url, options = {}) => {
        requests.push({ options, url });

        if (
          url ===
          "https://api.github.com/repos/yunkooo/nado/pulls/42/reviews?per_page=100"
        ) {
          return Response.json([
            {
              id: 1,
              state: "CHANGES_REQUESTED",
              submitted_at: "2026-06-24T11:50:00.000Z",
              user: {
                login: "reviewer-a",
              },
            },
            {
              id: 2,
              state: "APPROVED",
              submitted_at: "2026-06-24T11:55:00.000Z",
              user: {
                login: "reviewer-a",
              },
            },
          ]);
        }

        if (options.method === "GET") {
          return Response.json({
            parent: {
              data_source_id: "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee",
              type: "data_source_id",
            },
          });
        }

        return Response.json({}, { status: 200 });
      },
      readFile: () =>
        JSON.stringify({
          action: "submitted",
          pull_request: {
            ...pullRequest,
            number: 42,
            url: "https://api.github.com/repos/yunkooo/nado/pulls/42",
          },
          review: {
            state: "approved",
          },
        }),
    });

    expect(result.ok).toBe(true);

    const updatedProperties = JSON.parse(requests[2].options.body).properties;

    expect(updatedProperties["Review Status"]).toEqual({
      select: {
        name: "Passed",
      },
    });
    expect(updatedProperties["CI Status"]).toBeUndefined();
  });

  it("marks dismissed pull request reviews as unknown", () => {
    const plan = createSyncPlan({
      action: "dismissed",
      now,
      pullRequest,
      reviewState: "unknown",
      syncMode: "review-event",
    });

    expect(plan.ok).toBe(true);
    expect(plan.properties["Review Status"]).toEqual({
      select: {
        name: "Unknown",
      },
    });
    expect(plan.properties["Last Review Check"]).toEqual({
      date: {
        start: now,
      },
    });
    expect(plan.properties["CI Status"]).toBeUndefined();
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
              sha: "current-head-sha",
              repo: {
                full_name: "yunkooo/nado",
              },
            },
          });
        }

        if (options.method === "GET") {
          return Response.json({
            parent: {
              data_source_id: "notion-data-source",
              type: "data_source_id",
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
            head_sha: "current-head-sha",
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
    expect(requests[1].options.method).toBe("GET");
    expect(requests[2].url).toBe(
      "https://api.notion.com/v1/pages/11111111-2222-3333-4444-555555555555",
    );
    expect(requests[2].options.method).toBe("PATCH");
    const updatedProperties = JSON.parse(requests[2].options.body).properties;

    expect(updatedProperties["CI Status"]).toEqual({
      select: {
        name: "Failed",
      },
    });
    expect(updatedProperties["상태"]).toBeUndefined();
    expect(updatedProperties["Review Status"]).toBeUndefined();
    expect(updatedProperties["Last Review Check"]).toBeUndefined();
    expect(updatedProperties.Blocker).toBeUndefined();
    expect(updatedProperties["Last Push At"]).toBeUndefined();
    expect(updatedProperties["Last Head SHA"]).toBeUndefined();
    expect(updatedProperties["Last Push Summary"]).toBeUndefined();
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

  it("skips stale CI-result syncs for outdated workflow runs", async () => {
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
              sha: "current-head-sha",
            },
            state: "open",
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
            head_sha: "outdated-head-sha",
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
      "Skipping stale CI-result Notion sync for an outdated workflow run",
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
    expect(notionTicketSyncWorkflowSource).toContain("pull_request_review:");
    expect(notionTicketSyncWorkflowSource).toContain(
      "Checkout trusted base code",
    );
    expect(notionTicketSyncWorkflowSource).toContain(
      "ref: ${{ github.event.pull_request.base.sha }}",
    );
    expect(notionTicketSyncWorkflowSource).toContain(
      "Checkout trusted default branch code",
    );
    expect(notionTicketSyncWorkflowSource).toContain(
      "head.repo.full_name == github.repository",
    );
    expect(notionTicketSyncWorkflowSource).toContain(
      "Skip unavailable trusted sync script",
    );
  });

  it("documents typed ticket creation and push metadata rules", () => {
    for (const workType of [
      "기능",
      "수정",
      "문서",
      "테스트",
      "리팩터",
      "설정",
      "보안",
      "운영",
    ]) {
      expect(notionTicketSchemaSource).toContain(workType);
      expect(notionTicketSkillSource).toContain(workType);
    }

    for (const requiredSection of [
      "배경",
      "작업 범위",
      "완료 조건",
      "제외 범위",
      "검증 계획",
    ]) {
      expect(notionTicketSkillSource).toContain(requiredSection);
    }

    expect(notionTicketSchemaSource).toContain("Last Push At");
    expect(notionTicketSchemaSource).toContain("Last Head SHA");
    expect(notionTicketSchemaSource).toContain("Last Push Summary");
    expect(notionTicketSchemaSource).toContain("pull_request_review");
    expect(notionTicketSchemaSource).toContain("fork PR");
    expect(notionTicketSchemaSource).toContain("2025-09-03");
    expect(notionTicketSchemaSource).toContain("활성 change request");
    expect(notionTicketSchemaSource).toContain("per_page=100");
    expect(notionTicketSchemaSource).toContain("COMMENTED");
    expect(notionTicketSchemaSource).toContain(
      "더 오래된 `pull_request synchronize` job",
    );
    expect(notionTicketSchemaSource).toContain(
      "`closed`를 제외한 `pull_request_target` 이벤트",
    );
  });
});
