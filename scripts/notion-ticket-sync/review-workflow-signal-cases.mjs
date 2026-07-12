import { describe, expect, it } from "vitest";
import { runSync } from "../notion-ticket-sync.mjs";
import { createNotionTicketPage, pullRequest } from "./test-helpers.mjs";

describe("Notion aggregate review sync", () => {
  it("syncs review status from a trusted workflow_run review signal", async () => {
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
              ref: "main",
            },
            head: {
              ...pullRequest.head,
              repo: {
                full_name: "yunkooo/nado",
              },
            },
            number: 42,
            state: "open",
            url: pullRequestUrl,
          });
        }

        if (url === `${pullRequestUrl}/reviews?per_page=100`) {
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
          return Response.json(createNotionTicketPage());
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
    expect(requests.map((request) => request.url)).toEqual([
      pullRequestUrl,
      `${pullRequestUrl}/reviews?per_page=100`,
      "https://api.notion.com/v1/pages/11111111-2222-3333-4444-555555555555",
      "https://api.notion.com/v1/pages/11111111-2222-3333-4444-555555555555",
    ]);

    const updatedProperties = JSON.parse(requests[3].options.body).properties;

    expect(updatedProperties["Review Status"]).toEqual({
      select: {
        name: "Passed",
      },
    });
    expect(updatedProperties["CI Status"]).toBeUndefined();
    expect(updatedProperties["상태"]).toBeUndefined();
  });
});
