import { readFileSync } from "node:fs";
import { runSync } from "../notion-ticket-sync.mjs";

export const now = "2026-06-24T12:00:00.000Z";
export const agentsSource = readFileSync(
  new URL("../../AGENTS.md", import.meta.url),
  "utf8",
);
export const ciWorkflowSource = readFileSync(
  new URL("../../.github/workflows/ci.yml", import.meta.url),
  "utf8",
);
export const dependabotConfigSource = readFileSync(
  new URL("../../.github/dependabot.yml", import.meta.url),
  "utf8",
);
export const issueTemplateConfigSource = readFileSync(
  new URL("../../.github/ISSUE_TEMPLATE/config.yml", import.meta.url),
  "utf8",
);
export const issueWorkflowSource = readFileSync(
  new URL("../../docs/workflow/issue-workflow.md", import.meta.url),
  "utf8",
);
export const notionTicketSyncWorkflowSource = readFileSync(
  new URL("../../.github/workflows/notion-ticket-sync.yml", import.meta.url),
  "utf8",
);
export const notionTicketReviewDispatchWorkflowSource = readFileSync(
  new URL(
    "../../.github/workflows/notion-ticket-review-dispatch.yml",
    import.meta.url,
  ),
  "utf8",
);
export const notionTicketSkillSource = readFileSync(
  new URL(
    "../../.agents/skills/notion-ticket-pr-loop/SKILL.md",
    import.meta.url,
  ),
  "utf8",
);
export const notionTicketSchemaSource = readFileSync(
  new URL("../../docs/workflow/notion-ticket-db-schema.md", import.meta.url),
  "utf8",
);
export const prTemplateSource = readFileSync(
  new URL("../../.github/pull_request_template.md", import.meta.url),
  "utf8",
);
export const prWorkflowSource = readFileSync(
  new URL("../../docs/workflow/pr-workflow.md", import.meta.url),
  "utf8",
);
export const slackFailureActionSource = readFileSync(
  new URL(
    "../../.github/actions/notify-slack-failure/action.yml",
    import.meta.url,
  ),
  "utf8",
);
export const slackPrNotificationWorkflowSource = readFileSync(
  new URL("../../.github/workflows/slack-pr-notify.yml", import.meta.url),
  "utf8",
);

export function workflowJobSource(source, jobName, nextJobName) {
  const start = source.indexOf(`  ${jobName}:`);
  const end =
    nextJobName === undefined
      ? source.length
      : source.indexOf(`  ${nextJobName}:`, start + 1);

  return source.slice(start, end === -1 ? source.length : end);
}

export const pullRequest = {
  body: [
    "## Notion Ticket",
    "",
    "- Ticket: https://app.notion.com/p/Nado-Ticket-11111111222233334444555555555555?pvs=4",
  ].join("\n"),
  base: {
    ref: "main",
  },
  closed_at: "2026-06-24T12:30:00.000Z",
  created_at: "2026-06-24T11:30:00.000Z",
  head: {
    ref: "codex/nado-notion-sync",
    repo: {
      full_name: "yunkooo/nado",
    },
  },
  html_url: "https://github.com/yunkooo/nado/pull/42",
  merged: false,
  merged_at: null,
};

export const defaultDataSourceId = "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee";
export const defaultTicketPageId = "11111111-2222-3333-4444-555555555555";
export const replacementTicketPageId = "99999999-aaaa-bbbb-cccc-dddddddddddd";
export const replacementTicketUrl =
  "https://app.notion.com/p/Replacement-99999999aaaabbbbccccdddddddddddd";

export function createNotionTicketPage({
  blocker = "",
  dataSourceId = defaultDataSourceId,
  gitHubBranch = pullRequest.head.ref,
  gitHubPr = pullRequest.html_url,
  id = defaultTicketPageId,
  includePushMetadata = false,
  status = "IN-review",
} = {}) {
  return {
    id,
    parent: {
      data_source_id: dataSourceId,
      type: "data_source_id",
    },
    properties: {
      Blocker: {
        rich_text: blocker
          ? [
              {
                plain_text: blocker,
                text: {
                  content: blocker,
                },
              },
            ]
          : [],
      },
      "GitHub Branch": {
        rich_text: gitHubBranch
          ? [
              {
                plain_text: gitHubBranch,
                text: {
                  content: gitHubBranch,
                },
              },
            ]
          : [],
      },
      "GitHub PR": {
        url: gitHubPr,
      },
      "PR Created At": {
        date: null,
      },
      상태: {
        status: {
          name: status,
        },
      },
      ...(includePushMetadata
        ? {
            "Last Head SHA": { rich_text: [] },
            "Last Push At": { date: null },
            "Last Push Summary": { rich_text: [] },
          }
        : {}),
    },
  };
}

export async function runPullRequestEvent({
  action = "opened",
  boundPages,
  bindingQueryResponses,
  changes,
  currentPullRequest = {},
  eventPullRequest = {},
  notionPage = createNotionTicketPage(),
} = {}) {
  const pullRequestUrl = "https://api.github.com/repos/yunkooo/nado/pulls/42";
  const notionBindingQueryUrl = `https://api.notion.com/v1/data_sources/${defaultDataSourceId}/query`;
  const bindingQueryResults =
    boundPages ??
    (notionPage.properties?.["GitHub PR"]?.url === pullRequest.html_url
      ? [notionPage]
      : []);
  const queryResponses = bindingQueryResponses ?? [
    {
      has_more: false,
      next_cursor: null,
      results: bindingQueryResults,
    },
  ];
  let queryResponseIndex = 0;
  const requests = [];
  const result = await runSync({
    env: {
      GITHUB_EVENT_PATH: "pull-request-event.json",
      GITHUB_REPOSITORY: "yunkooo/nado",
      GITHUB_TOKEN: "github-token",
      NOTION_TICKETS_DATA_SOURCE_ID: defaultDataSourceId,
      NOTION_TOKEN: "notion-token",
    },
    fetchImpl: async (url, options = {}) => {
      requests.push({ options, url });

      if (url === pullRequestUrl) {
        return Response.json({
          ...pullRequest,
          number: 42,
          state: action === "closed" ? "closed" : "open",
          url: pullRequestUrl,
          ...currentPullRequest,
        });
      }

      if (url === notionBindingQueryUrl && options.method === "POST") {
        const queryResponse = queryResponses[queryResponseIndex];

        if (!queryResponse) {
          throw new Error("Unexpected extra Notion binding query");
        }

        queryResponseIndex += 1;

        return Response.json(queryResponse);
      }

      if (options.method === "GET") {
        return Response.json(notionPage);
      }

      return Response.json({}, { status: 200 });
    },
    readFile: () =>
      JSON.stringify({
        action,
        changes,
        pull_request: {
          ...pullRequest,
          number: 42,
          state: action === "closed" ? "closed" : "open",
          url: pullRequestUrl,
          ...eventPullRequest,
        },
        repository: {
          default_branch: "main",
          url: "https://api.github.com/repos/yunkooo/nado",
        },
      }),
  });

  return { requests, result };
}
