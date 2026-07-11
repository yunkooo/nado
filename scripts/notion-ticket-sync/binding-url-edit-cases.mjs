import { describe, expect, it } from "vitest";
import {
  createNotionTicketPage,
  pullRequest,
  replacementTicketPageId,
  replacementTicketUrl,
  runPullRequestEvent,
} from "./test-helpers.mjs";

describe("Notion ticket binding", () => {
  it("rejects replacing one persistently bound Ticket with another before updating Notion", async () => {
    const { requests, result } = await runPullRequestEvent({
      action: "edited",
      boundPages: [createNotionTicketPage()],
      changes: {
        body: {
          from: pullRequest.body,
        },
      },
      currentPullRequest: {
        body: `## Notion Ticket\n\n- Ticket: ${replacementTicketUrl}`,
      },
      notionPage: createNotionTicketPage({
        gitHubBranch: "",
        gitHubPr: null,
        id: replacementTicketPageId,
        status: "IN-progrss",
      }),
    });

    expect(result.ok).toBe(false);
    expect(result.reason).toBe(
      "The Notion Ticket URL cannot be changed after a pull request is linked",
    );
    expect(requests).toHaveLength(3);
    expect(requests[2].options.method).toBe("POST");
  });

  it("rejects replacing a bound Ticket after removing the URL first", async () => {
    const removal = await runPullRequestEvent({
      action: "edited",
      changes: {
        body: {
          from: pullRequest.body,
        },
      },
      currentPullRequest: {
        body: "## Notion Ticket\n\n- Ticket:",
      },
    });

    expect(removal.result.ok).toBe(false);
    expect(removal.result.reason).toBe("Missing Notion Ticket URL in PR body");
    expect(removal.requests).toHaveLength(1);

    const replacement = await runPullRequestEvent({
      action: "edited",
      boundPages: [createNotionTicketPage()],
      changes: {
        body: {
          from: "## Notion Ticket\n\n- Ticket:",
        },
      },
      currentPullRequest: {
        body: `## Notion Ticket\n\n- Ticket: ${replacementTicketUrl}`,
      },
      notionPage: createNotionTicketPage({
        gitHubBranch: "",
        gitHubPr: null,
        id: replacementTicketPageId,
        status: "IN-progrss",
      }),
    });

    expect(replacement.result.ok).toBe(false);
    expect(replacement.result.reason).toBe(
      "The Notion Ticket URL cannot be changed after a pull request is linked",
    );
    expect(replacement.requests).toHaveLength(3);
  });

  it("rejects an opened-event replay when the current body points to another Ticket", async () => {
    const { requests, result } = await runPullRequestEvent({
      boundPages: [createNotionTicketPage()],
      currentPullRequest: {
        body: `## Notion Ticket\n\n- Ticket: ${replacementTicketUrl}`,
      },
      notionPage: createNotionTicketPage({
        gitHubBranch: "",
        gitHubPr: null,
        id: replacementTicketPageId,
        status: "IN-progrss",
      }),
    });

    expect(result.ok).toBe(false);
    expect(result.reason).toBe(
      "The Notion Ticket URL cannot be changed after a pull request is linked",
    );
    expect(requests).toHaveLength(3);
  });

  it("allows replacing a syntactically valid but never-bound Ticket", async () => {
    const { requests, result } = await runPullRequestEvent({
      action: "edited",
      boundPages: [],
      changes: {
        body: {
          from: pullRequest.body,
        },
      },
      currentPullRequest: {
        body: `## Notion Ticket\n\n- Ticket: ${replacementTicketUrl}`,
      },
      notionPage: createNotionTicketPage({
        gitHubBranch: "",
        gitHubPr: null,
        id: replacementTicketPageId,
        status: "IN-progrss",
      }),
    });

    expect(result.ok).toBe(true);
    expect(requests).toHaveLength(4);

    const updatedProperties = JSON.parse(requests[3].options.body).properties;

    expect(updatedProperties["상태"].status.name).toBe("IN-review");
    expect(updatedProperties["GitHub PR"].url).toBe(pullRequest.html_url);
  });

  it("allows URL-format changes that keep the same Notion page ID", async () => {
    const sameTicketUrl =
      "https://www.notion.so/Nado-11111111-2222-3333-4444-555555555555";
    const { requests, result } = await runPullRequestEvent({
      action: "edited",
      changes: {
        body: {
          from: pullRequest.body,
        },
      },
      currentPullRequest: {
        body: `## Notion Ticket\n\n- Ticket: ${sameTicketUrl}`,
      },
    });

    expect(result.ok).toBe(true);
    expect(requests).toHaveLength(3);
    expect(requests.some((request) => request.options.method === "POST")).toBe(
      false,
    );

    const updatedProperties = JSON.parse(requests[2].options.body).properties;

    expect(updatedProperties["상태"]).toBeUndefined();
    expect(updatedProperties["GitHub PR"].url).toBe(pullRequest.html_url);
  });

  it("allows the first valid Ticket URL to be added to an existing PR", async () => {
    const { requests, result } = await runPullRequestEvent({
      action: "edited",
      changes: {
        body: {
          from: "## Notion Ticket\n\n- Ticket:",
        },
      },
      notionPage: createNotionTicketPage({
        gitHubBranch: "",
        gitHubPr: null,
        status: "IN-progrss",
      }),
    });

    expect(result.ok).toBe(true);
    expect(requests).toHaveLength(4);

    const updatedProperties = JSON.parse(requests[3].options.body).properties;

    expect(updatedProperties["상태"].status.name).toBe("IN-review");
    expect(updatedProperties["GitHub PR"].url).toBe(pullRequest.html_url);
  });

  it("does not treat a title-only edit as an initial Ticket binding", async () => {
    const { requests, result } = await runPullRequestEvent({
      action: "edited",
      changes: {
        title: {
          from: "이전 제목",
        },
      },
      notionPage: createNotionTicketPage({
        gitHubBranch: "",
        gitHubPr: null,
        status: "IN-progrss",
      }),
    });

    expect(result.ok).toBe(false);
    expect(result.reason).toBe(
      "Only an initial pull request event may bind an unlinked Notion ticket",
    );
    expect(requests).toHaveLength(2);
  });
});
