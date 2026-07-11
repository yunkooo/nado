import { describe, expect, it } from "vitest";
import { runSync } from "../notion-ticket-sync.mjs";
import {
  createNotionTicketPage,
  pullRequest,
  runPullRequestEvent,
} from "./test-helpers.mjs";

describe("Notion pull request lifecycle sync", () => {
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

  it("fails synchronize syncs when required push metadata properties are unavailable", async () => {
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
              sha: "current-head-sha",
            },
            number: 42,
            state: "open",
            title: "필수 push metadata 속성 누락 처리",
            url: pullRequestUrl,
          });
        }

        if (options.method === "GET") {
          return Response.json(createNotionTicketPage());
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
              sha: "current-head-sha",
            },
            number: 42,
            url: pullRequestUrl,
          },
        }),
    });

    expect(result.ok).toBe(false);
    expect(result.reason).toBe(
      "Notion data source is missing required push metadata properties: Last Push At, Last Head SHA, Last Push Summary",
    );
    expect(requests).toHaveLength(2);
    expect(requests[0].url).toBe(pullRequestUrl);
    expect(requests[1].url).toBe(
      "https://api.notion.com/v1/pages/11111111-2222-3333-4444-555555555555",
    );
    expect(requests[1].options.method).toBe("GET");
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

  it("skips stale closed-unmerged events when the current PR was reopened", async () => {
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
            merged: false,
            state: "open",
            url: pullRequestUrl,
          });
        }

        return Response.json({}, { status: 200 });
      },
      readFile: () =>
        JSON.stringify({
          action: "closed",
          pull_request: {
            ...pullRequest,
            merged: false,
            number: 42,
            state: "closed",
            url: pullRequestUrl,
          },
        }),
    });

    expect(result.ok).toBe(true);
    expect(result.skipped).toBe(true);
    expect(result.reason).toBe(
      "Skipping stale closed PR-event Notion sync for a reopened pull request",
    );
    expect(requests).toHaveLength(1);
    expect(requests[0].url).toBe(pullRequestUrl);
  });

  it("preserves a manual Blocker during synchronize events", async () => {
    const { requests, result } = await runPullRequestEvent({
      action: "synchronize",
      notionPage: createNotionTicketPage({
        blocker: "Notion 권한 확인 필요 — 관리자 승인 후 해제",
        includePushMetadata: true,
      }),
    });

    expect(result.ok).toBe(true);

    const updatedProperties = JSON.parse(requests[2].options.body).properties;

    expect(updatedProperties.Blocker).toBeUndefined();
    expect(updatedProperties["Last Push At"]).toBeDefined();
  });

  it("preserves a manual Blocker when a PR closes without merge", async () => {
    const { requests, result } = await runPullRequestEvent({
      action: "closed",
      currentPullRequest: {
        merged: false,
      },
      notionPage: createNotionTicketPage({
        blocker: "외부 승인 대기 — 승인 완료 후 해제",
      }),
    });

    expect(result.ok).toBe(true);

    const updatedProperties = JSON.parse(requests[2].options.body).properties;

    expect(updatedProperties.Blocker).toBeUndefined();
  });

  it("clears only the automatic close Blocker when a PR is reopened", async () => {
    const { requests, result } = await runPullRequestEvent({
      action: "reopened",
      notionPage: createNotionTicketPage({
        blocker: "PR closed without merge",
      }),
    });

    expect(result.ok).toBe(true);

    const updatedProperties = JSON.parse(requests[2].options.body).properties;

    expect(updatedProperties.Blocker.rich_text).toEqual([]);
  });

  it("does not clear a manual Blocker when a PR is reopened", async () => {
    const { requests, result } = await runPullRequestEvent({
      action: "reopened",
      notionPage: createNotionTicketPage({
        blocker: "외부 계정 권한 대기 — 권한 부여 후 해제",
      }),
    });

    expect(result.ok).toBe(true);

    const updatedProperties = JSON.parse(requests[2].options.body).properties;

    expect(updatedProperties.Blocker).toBeUndefined();
  });

  it("preserves Blocker text that only resembles the automatic marker", async () => {
    const { requests, result } = await runPullRequestEvent({
      action: "reopened",
      notionPage: createNotionTicketPage({
        blocker: "PR closed without merge ",
      }),
    });

    expect(result.ok).toBe(true);

    const updatedProperties = JSON.parse(requests[2].options.body).properties;

    expect(updatedProperties.Blocker).toBeUndefined();
  });

  it("allows an idempotent DONE merge event without inferring CI or review results", async () => {
    const { requests, result } = await runPullRequestEvent({
      action: "closed",
      currentPullRequest: {
        closed_at: "2026-06-24T12:45:00.000Z",
        merged: true,
        merged_at: "2026-06-24T12:44:00.000Z",
      },
      notionPage: createNotionTicketPage({
        blocker: "PR closed without merge",
        status: "DONE",
      }),
    });

    expect(result.ok).toBe(true);

    const updatedProperties = JSON.parse(requests[2].options.body).properties;

    expect(updatedProperties["상태"].status.name).toBe("DONE");
    expect(updatedProperties.Blocker.rich_text).toEqual([]);
    expect(updatedProperties["CI Status"]).toBeUndefined();
    expect(updatedProperties["Last CI Check"]).toBeUndefined();
    expect(updatedProperties["Review Status"]).toBeUndefined();
    expect(updatedProperties["Last Review Check"]).toBeUndefined();
    expect(updatedProperties["GitHub PR"]).toBeUndefined();
    expect(updatedProperties["GitHub Branch"]).toBeUndefined();
  });

  it("does not clear a manual Blocker when a PR is merged", async () => {
    const { requests, result } = await runPullRequestEvent({
      action: "closed",
      currentPullRequest: {
        merged: true,
        merged_at: "2026-06-24T12:44:00.000Z",
      },
      notionPage: createNotionTicketPage({
        blocker: "후속 운영 확인 필요 — 배포 검증 후 해제",
      }),
    });

    expect(result.ok).toBe(true);

    const updatedProperties = JSON.parse(requests[2].options.body).properties;

    expect(updatedProperties["상태"].status.name).toBe("DONE");
    expect(updatedProperties.Blocker).toBeUndefined();
  });
});
