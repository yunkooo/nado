import { describe, expect, it } from "vitest";
import { createSyncPlan, runSync } from "../notion-ticket-sync.mjs";
import { createNotionTicketPage, now, pullRequest } from "./test-helpers.mjs";

describe("Notion aggregate review sync", () => {
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
          return Response.json(createNotionTicketPage());
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

  it("marks dismissed-only aggregate review state as unknown instead of using a stale event fallback", async () => {
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
              state: "DISMISSED",
              submitted_at: "2026-06-24T11:59:00.000Z",
              user: {
                login: "reviewer-a",
              },
            },
          ]);
        }

        if (options.method === "GET") {
          return Response.json(createNotionTicketPage());
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
        name: "Unknown",
      },
    });
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
});
