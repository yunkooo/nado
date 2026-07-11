import { describe, expect, it } from "vitest";
import { runSync } from "../notion-ticket-sync.mjs";
import { createNotionTicketPage, pullRequest } from "./test-helpers.mjs";

describe("Notion CI sync", () => {
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
          return Response.json(
            createNotionTicketPage({ dataSourceId: "notion-data-source" }),
          );
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
    expect(updatedProperties["GitHub PR"]).toBeUndefined();
    expect(updatedProperties["GitHub Branch"]).toBeUndefined();
    expect(updatedProperties["PR Created At"]).toBeUndefined();
  });

  it("skips CI-result syncs for pull requests that do not target main", async () => {
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
            base: {
              ref: "feature/base",
            },
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
            default_branch: "main",
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
    expect(result.skipped).toBe(true);
    expect(result.reason).toBe(
      "Skipping Notion sync for a pull request that does not target main",
    );
    expect(requests).toHaveLength(1);
    expect(requests[0].url).toBe(githubPullRequestUrl);
  });

  it("skips fork CI workflow_run events even when PR summaries are missing", async () => {
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
            head_repository: {
              full_name: "contributor/nado",
            },
            pull_requests: [],
          },
        }),
    });

    expect(result.ok).toBe(true);
    expect(result.skipped).toBe(true);
    expect(result.reason).toBe("Skipping Notion sync for a fork pull request");
    expect(requests).toHaveLength(0);
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

  it("skips older CI workflow runs for the same head SHA", async () => {
    const githubPullRequestUrl =
      "https://api.github.com/repos/yunkooo/nado/pulls/42";
    const latestWorkflowRunsUrl =
      "https://api.github.com/repos/yunkooo/nado/actions/workflows/123/runs?event=pull_request&head_sha=current-head-sha&per_page=1";
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

        if (url === latestWorkflowRunsUrl) {
          return Response.json({
            workflow_runs: [
              {
                head_sha: "current-head-sha",
                id: 101,
                run_attempt: 1,
              },
            ],
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
            id: 100,
            pull_requests: [
              {
                number: 42,
                url: githubPullRequestUrl,
              },
            ],
            run_attempt: 1,
            workflow_id: 123,
          },
        }),
    });

    expect(result.ok).toBe(true);
    expect(result.skipped).toBe(true);
    expect(result.reason).toBe(
      "Skipping stale CI-result Notion sync for an older workflow run",
    );
    expect(requests.map((request) => request.url)).toEqual([
      githubPullRequestUrl,
      latestWorkflowRunsUrl,
    ]);
  });
});
