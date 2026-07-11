import { describe, expect, it } from "vitest";
import { runSync } from "../notion-ticket-sync.mjs";
import { createNotionTicketPage, pullRequest } from "./test-helpers.mjs";

describe("Notion ticket binding", () => {
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
          return Response.json(
            createNotionTicketPage({
              dataSourceId: "11111111-2222-3333-4444-555555555555",
            }),
          );
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

  it("treats pull requests with a missing head repository as unsafe fork PRs", async () => {
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
              repo: null,
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
          action: "opened",
          pull_request: {
            ...pullRequest,
            number: 42,
            url: pullRequestUrl,
          },
        }),
    });

    expect(result.ok).toBe(true);
    expect(result.skipped).toBe(true);
    expect(result.reason).toBe("Skipping Notion sync for a fork pull request");
    expect(requests).toHaveLength(1);
    expect(requests[0].url).toBe(pullRequestUrl);
  });
});
