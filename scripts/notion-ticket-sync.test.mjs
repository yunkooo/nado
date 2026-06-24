import { describe, expect, it } from "vitest";
import {
  buildNotionPropertiesForEvent,
  createSyncPlan,
  deriveCiResult,
  extractNotionPageId,
  mapCiResultToStatus,
  parseTicketUrlFromBody,
} from "./notion-ticket-sync.mjs";

const now = "2026-06-24T12:00:00.000Z";

const pullRequest = {
  body: [
    "## Notion Ticket",
    "",
    "- Ticket: https://app.notion.com/p/Nado-Ticket-11111111222233334444555555555555?pvs=4",
  ].join("\n"),
  closed_at: "2026-06-24T12:30:00.000Z",
  created_at: "2026-06-24T11:30:00.000Z",
  head: {
    ref: "codex/nado-notion-sync",
  },
  html_url: "https://github.com/yunkooo/nado/pull/42",
  merged: false,
  merged_at: null,
};

describe("notion ticket sync helpers", () => {
  it("parses the Notion ticket URL from the PR template body", () => {
    expect(parseTicketUrlFromBody(pullRequest.body)).toBe(
      "https://app.notion.com/p/Nado-Ticket-11111111222233334444555555555555?pvs=4",
    );
  });

  it("returns null when the PR body has no Notion ticket URL", () => {
    expect(parseTicketUrlFromBody("## Notion Ticket\n\n- Ticket:")).toBeNull();
  });

  it("extracts a page id from compact and dashed Notion URLs", () => {
    expect(
      extractNotionPageId(
        "https://app.notion.com/p/Nado-Ticket-11111111222233334444555555555555?pvs=4",
      ),
    ).toBe("11111111-2222-3333-4444-555555555555");
    expect(
      extractNotionPageId(
        "https://www.notion.so/Task-11111111-2222-3333-4444-555555555555",
      ),
    ).toBe("11111111-2222-3333-4444-555555555555");
  });

  it("maps GitHub Actions job results to Notion CI status values", () => {
    expect(mapCiResultToStatus("success")).toBe("Success");
    expect(mapCiResultToStatus("failure")).toBe("Failed");
    expect(mapCiResultToStatus("cancelled")).toBe("Cancelled");
    expect(mapCiResultToStatus("skipped")).toBe("Unknown");
    expect(mapCiResultToStatus(undefined)).toBe("Pending");
  });

  it("derives one CI result from verify and e2e job results", () => {
    expect(
      deriveCiResult({
        action: "synchronize",
        e2eResult: "success",
        pullRequest,
        verifyResult: "success",
      }),
    ).toBe("success");
    expect(
      deriveCiResult({
        action: "synchronize",
        e2eResult: "skipped",
        pullRequest,
        verifyResult: "failure",
      }),
    ).toBe("failure");
    expect(
      deriveCiResult({
        action: "closed",
        e2eResult: "skipped",
        pullRequest: {
          ...pullRequest,
          merged: true,
        },
        verifyResult: "skipped",
      }),
    ).toBe("success");
  });

  it("builds the In-review properties for an active PR event", () => {
    const properties = buildNotionPropertiesForEvent({
      action: "synchronize",
      ciStatus: "Failed",
      now,
      pullRequest,
    });

    expect(properties["상태"].status.name).toBe("IN-review");
    expect(properties["GitHub PR"].url).toBe(pullRequest.html_url);
    expect(properties["GitHub Branch"].rich_text[0].text.content).toBe(
      "codex/nado-notion-sync",
    );
    expect(properties["CI Status"].select.name).toBe("Failed");
    expect(properties["Review Status"].select.name).toBe("Pending");
    expect(properties["Last CI Check"].date.start).toBe(now);
    expect(properties["Last Review Check"].date.start).toBe(now);
    expect(properties["PR Created At"].date.start).toBe(
      "2026-06-24T11:30:00.000Z",
    );
  });

  it("builds Done properties only when the PR was merged", () => {
    const properties = buildNotionPropertiesForEvent({
      action: "closed",
      ciStatus: "Success",
      now,
      pullRequest: {
        ...pullRequest,
        closed_at: "2026-06-24T12:45:00.000Z",
        merged: true,
        merged_at: "2026-06-24T12:44:00.000Z",
      },
    });

    expect(properties["상태"].status.name).toBe("DONE");
    expect(properties["CI Status"].select.name).toBe("Success");
    expect(properties["Review Status"].select.name).toBe("Passed");
    expect(properties["Merged At"].date.start).toBe("2026-06-24T12:44:00.000Z");
    expect(properties["종료일"].date.start).toBe("2026-06-24T12:45:00.000Z");
    expect(properties.Blocker.rich_text).toEqual([]);
  });

  it("keeps a closed unmerged PR out of Done and records a blocker", () => {
    const properties = buildNotionPropertiesForEvent({
      action: "closed",
      ciStatus: "Unknown",
      now,
      pullRequest,
    });

    expect(properties["상태"]).toBeUndefined();
    expect(properties["CI Status"].select.name).toBe("Unknown");
    expect(properties.Blocker.rich_text[0].text.content).toBe(
      "PR closed without merge",
    );
  });

  it("returns a failed sync plan when the PR is missing a Notion ticket URL", () => {
    const plan = createSyncPlan({
      action: "opened",
      e2eResult: "success",
      now,
      pullRequest: {
        ...pullRequest,
        body: "## Notion Ticket\n\n- Ticket:",
      },
      verifyResult: "success",
    });

    expect(plan.ok).toBe(false);
    expect(plan.reason).toBe("Missing Notion Ticket URL in PR body");
  });
});
