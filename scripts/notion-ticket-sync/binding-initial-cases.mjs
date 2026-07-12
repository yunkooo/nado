import { describe, expect, it } from "vitest";
import {
  createNotionTicketPage,
  defaultDataSourceId,
  pullRequest,
  replacementTicketPageId,
  runPullRequestEvent,
} from "./test-helpers.mjs";

describe("Notion ticket binding", () => {
  it("binds an unlinked IN-progrss ticket on the initial PR event", async () => {
    const { requests, result } = await runPullRequestEvent({
      notionPage: createNotionTicketPage({
        gitHubBranch: "",
        gitHubPr: null,
        status: "IN-progrss",
      }),
    });

    expect(result.ok).toBe(true);
    expect(requests).toHaveLength(4);

    expect(requests[2].url).toBe(
      `https://api.notion.com/v1/data_sources/${defaultDataSourceId}/query`,
    );
    expect(requests[2].options.method).toBe("POST");
    expect(JSON.parse(requests[2].options.body)).toEqual({
      filter: {
        property: "GitHub PR",
        url: {
          equals: pullRequest.html_url,
        },
      },
      page_size: 100,
      result_type: "page",
    });

    const updatedProperties = JSON.parse(requests[3].options.body).properties;

    expect(updatedProperties["상태"].status.name).toBe("IN-review");
    expect(updatedProperties["GitHub PR"].url).toBe(pullRequest.html_url);
    expect(updatedProperties["GitHub Branch"].rich_text[0].text.content).toBe(
      pullRequest.head.ref,
    );
  });

  it("idempotently confirms the existing Ticket on an opened-event replay", async () => {
    const { requests, result } = await runPullRequestEvent();

    expect(result.ok).toBe(true);
    expect(requests).toHaveLength(4);
    expect(requests[2].options.method).toBe("POST");

    const updatedProperties = JSON.parse(requests[3].options.body).properties;

    expect(updatedProperties["상태"].status.name).toBe("IN-review");
    expect(updatedProperties["GitHub PR"].url).toBe(pullRequest.html_url);
  });

  it("rejects multiple Tickets persistently linked to the same PR", async () => {
    const notionPage = createNotionTicketPage();
    const { requests, result } = await runPullRequestEvent({
      boundPages: [
        notionPage,
        createNotionTicketPage({ id: replacementTicketPageId }),
      ],
      notionPage,
    });

    expect(result.ok).toBe(false);
    expect(result.reason).toBe(
      "Multiple Notion tickets are linked to the same pull request",
    );
    expect(requests).toHaveLength(3);
  });

  it("follows binding-query pagination before accepting a Ticket", async () => {
    const notionPage = createNotionTicketPage();
    const { requests, result } = await runPullRequestEvent({
      bindingQueryResponses: [
        {
          has_more: true,
          next_cursor: "binding-page-2",
          results: [notionPage],
        },
        {
          has_more: false,
          next_cursor: null,
          results: [createNotionTicketPage({ id: replacementTicketPageId })],
        },
      ],
      notionPage,
    });

    expect(result.ok).toBe(false);
    expect(result.reason).toBe(
      "Multiple Notion tickets are linked to the same pull request",
    );
    expect(requests).toHaveLength(4);
    expect(JSON.parse(requests[3].options.body).start_cursor).toBe(
      "binding-page-2",
    );
  });

  it("fails closed when binding-query pagination has no next cursor", async () => {
    const notionPage = createNotionTicketPage();

    await expect(
      runPullRequestEvent({
        bindingQueryResponses: [
          {
            has_more: true,
            next_cursor: null,
            results: [notionPage],
          },
        ],
        notionPage,
      }),
    ).rejects.toThrow(
      "Notion ticket binding query returned an invalid pagination cursor",
    );
  });

  it("fails closed when page and data-source binding reads disagree", async () => {
    const { requests, result } = await runPullRequestEvent({ boundPages: [] });

    expect(result.ok).toBe(false);
    expect(result.reason).toBe(
      "Notion ticket binding state is inconsistent between the page and data source query",
    );
    expect(requests).toHaveLength(3);
  });

  it("rejects TODO tickets before initial PR binding", async () => {
    const { requests, result } = await runPullRequestEvent({
      notionPage: createNotionTicketPage({
        gitHubBranch: "",
        gitHubPr: null,
        status: "TODO",
      }),
    });

    expect(result.ok).toBe(false);
    expect(result.reason).toBe(
      "Notion ticket must be IN-progrss before initial pull request binding",
    );
    expect(requests).toHaveLength(2);
  });

  it("rejects tickets already linked to another pull request", async () => {
    const { requests, result } = await runPullRequestEvent({
      notionPage: createNotionTicketPage({
        gitHubPr: "https://github.com/yunkooo/nado/pull/41",
      }),
    });

    expect(result.ok).toBe(false);
    expect(result.reason).toBe(
      "Notion ticket is already linked to a different pull request",
    );
    expect(requests).toHaveLength(2);
  });

  it("rejects tickets linked to a different branch", async () => {
    const { requests, result } = await runPullRequestEvent({
      notionPage: createNotionTicketPage({
        gitHubBranch: "feature/different-branch",
      }),
    });

    expect(result.ok).toBe(false);
    expect(result.reason).toBe(
      "Notion ticket branch does not match the pull request head branch",
    );
    expect(requests).toHaveLength(2);
  });

  it("rejects bound tickets with missing branch metadata", async () => {
    const { requests, result } = await runPullRequestEvent({
      notionPage: createNotionTicketPage({ gitHubBranch: "" }),
    });

    expect(result.ok).toBe(false);
    expect(result.reason).toBe(
      "Pull-request-bound Notion ticket is missing its GitHub branch",
    );
    expect(requests).toHaveLength(2);
  });

  it("fails when the data source lacks required ticket binding properties", async () => {
    const notionPage = createNotionTicketPage();
    delete notionPage.properties["GitHub Branch"];

    const { requests, result } = await runPullRequestEvent({ notionPage });

    expect(result.ok).toBe(false);
    expect(result.reason).toBe(
      "Notion data source is missing required ticket binding properties: GitHub Branch",
    );
    expect(requests).toHaveLength(2);
  });

  it("rejects active PR events for tickets already marked DONE", async () => {
    const { requests, result } = await runPullRequestEvent({
      action: "reopened",
      notionPage: createNotionTicketPage({ status: "DONE" }),
    });

    expect(result.ok).toBe(false);
    expect(result.reason).toBe(
      "A pull-request-bound Notion ticket must remain IN-review",
    );
    expect(requests).toHaveLength(2);
  });
});
