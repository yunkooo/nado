import { describe, expect, it } from "vitest";
import { runSync } from "../notion-ticket-sync.mjs";
import { createNotionTicketPage, pullRequest } from "./test-helpers.mjs";

describe("Notion pull request review sync", () => {
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
    expect(updatedProperties["GitHub PR"]).toBeUndefined();
    expect(updatedProperties["GitHub Branch"]).toBeUndefined();
    expect(updatedProperties["PR Created At"]).toBeUndefined();
    expect(updatedProperties.Blocker).toBeUndefined();
  });

  it("skips review results that arrive before the initial PR binding", async () => {
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
              state: "APPROVED",
              submitted_at: "2026-06-24T11:59:00.000Z",
              user: {
                login: "reviewer-a",
              },
            },
          ]);
        }

        if (options.method === "GET") {
          return Response.json(
            createNotionTicketPage({
              gitHubBranch: "",
              gitHubPr: null,
              status: "IN-progrss",
            }),
          );
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

    expect(result).toEqual({
      ok: true,
      reason:
        "Skipping review-event Notion sync until the pull request event creates the initial ticket binding",
      skipped: true,
    });
    expect(requests).toHaveLength(2);
    expect(requests.every(({ options }) => options.method !== "PATCH")).toBe(
      true,
    );
  });

  it("skips trusted review signal syncs for pull requests that do not target main", async () => {
    const requests = [];
    const pullRequestUrl = "https://api.github.com/repos/yunkooo/nado/pulls/42";

    const result = await runSync({
      env: {
        GITHUB_EVENT_PATH: "review-workflow-run-event.json",
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
            base: {
              ref: "feature/base",
            },
            number: 42,
            state: "open",
            url: pullRequestUrl,
          });
        }

        return Response.json({}, { status: 200 });
      },
      readFile: () =>
        JSON.stringify({
          repository: {
            default_branch: "main",
            url: "https://api.github.com/repos/yunkooo/nado",
          },
          workflow_run: {
            conclusion: "success",
            event: "pull_request_review",
            head_repository: {
              full_name: "yunkooo/nado",
            },
            pull_requests: [
              {
                number: 42,
                url: pullRequestUrl,
              },
            ],
          },
        }),
    });

    expect(result.ok).toBe(true);
    expect(result.skipped).toBe(true);
    expect(result.reason).toBe(
      "Skipping Notion sync for a pull request that does not target main",
    );
    expect(requests).toHaveLength(1);
    expect(requests[0].url).toBe(pullRequestUrl);
  });
});
