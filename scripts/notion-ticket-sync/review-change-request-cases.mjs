import { describe, expect, it } from "vitest";
import { runSync } from "../notion-ticket-sync.mjs";
import { createNotionTicketPage, pullRequest } from "./test-helpers.mjs";

describe("Notion aggregate review sync", () => {
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
});
