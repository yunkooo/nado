#!/usr/bin/env node

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import {
  INITIAL_TICKET_BINDING_PENDING,
  validatePersistentTicketBinding,
  validateTicketBinding,
} from "./notion-ticket-sync/binding-validation.mjs";
import { isCrossRepositoryPullRequest } from "./notion-ticket-sync/github.mjs";
import {
  queryNotionPagesByPullRequest,
  updateNotionPage,
  validateNotionTicketPage,
} from "./notion-ticket-sync/notion-client.mjs";
import {
  applyOwnedBlockerUpdate,
  buildNotionPropertiesForEvent,
  deriveCiResult,
  mapCiResultToStatus,
  validateRequiredPushMetadataProperties,
} from "./notion-ticket-sync/notion-properties.mjs";
import {
  createSyncPlan,
  resolveSyncInput,
} from "./notion-ticket-sync/sync-planning.mjs";
import {
  extractNotionPageId,
  parseTicketUrlFromBody,
} from "./notion-ticket-sync/ticket-url.mjs";

export {
  buildNotionPropertiesForEvent,
  createSyncPlan,
  deriveCiResult,
  extractNotionPageId,
  mapCiResultToStatus,
  parseTicketUrlFromBody,
};

export async function runSync({
  env = process.env,
  fetchImpl = globalThis.fetch,
  readFile = readFileSync,
} = {}) {
  const missingEnv = [
    "GITHUB_EVENT_PATH",
    "NOTION_TOKEN",
    "NOTION_TICKETS_DATA_SOURCE_ID",
  ].filter((name) => !env[name]);

  if (missingEnv.length > 0) {
    return {
      ok: false,
      reason: `Missing required environment variables: ${missingEnv.join(", ")}`,
    };
  }

  const event = JSON.parse(readFile(env.GITHUB_EVENT_PATH, "utf8"));
  const syncInput = await resolveSyncInput({ env, event, fetchImpl });

  if (!syncInput.ok || syncInput.skipped) {
    return syncInput;
  }

  if (
    isCrossRepositoryPullRequest(syncInput.pullRequest, env.GITHUB_REPOSITORY)
  ) {
    return {
      ok: true,
      reason: "Skipping Notion sync for a fork pull request",
      skipped: true,
    };
  }

  const syncPlan = createSyncPlan({
    action: syncInput.action,
    ciResult: syncInput.ciResult,
    e2eResult: env.E2E_RESULT,
    pullRequest: syncInput.pullRequest,
    reviewState: syncInput.reviewState,
    syncMode: syncInput.syncMode,
    verifyResult: env.VERIFY_RESULT,
  });

  if (!syncPlan.ok) {
    return syncPlan;
  }

  const pageValidation = await validateNotionTicketPage({
    dataSourceId: env.NOTION_TICKETS_DATA_SOURCE_ID,
    fetchImpl,
    notionToken: env.NOTION_TOKEN,
    pageId: syncPlan.pageId,
  });

  if (!pageValidation.ok) {
    return pageValidation;
  }

  const ticketBindingValidation = validateTicketBinding({
    action: syncInput.action,
    allowInitialBinding: syncInput.mayCreateInitialBinding,
    page: pageValidation.page,
    pullRequest: syncInput.pullRequest,
  });

  if (!ticketBindingValidation.ok) {
    if (
      ticketBindingValidation.code === INITIAL_TICKET_BINDING_PENDING &&
      ["ci-result", "review-event"].includes(syncInput.syncMode)
    ) {
      return {
        ok: true,
        reason: `Skipping ${syncInput.syncMode} Notion sync until the pull request event creates the initial ticket binding`,
        skipped: true,
      };
    }

    return ticketBindingValidation;
  }

  if (syncInput.mayCreateInitialBinding) {
    const boundPages = await queryNotionPagesByPullRequest({
      dataSourceId: env.NOTION_TICKETS_DATA_SOURCE_ID,
      fetchImpl,
      notionToken: env.NOTION_TOKEN,
      pullRequestUrl: syncInput.pullRequest.html_url,
    });
    const persistentBindingValidation = validatePersistentTicketBinding({
      boundPages,
      currentPage: pageValidation.page,
      currentPageId: syncPlan.pageId,
      pullRequestUrl: syncInput.pullRequest.html_url,
    });

    if (!persistentBindingValidation.ok) {
      return persistentBindingValidation;
    }
  }

  applyOwnedBlockerUpdate({
    action: syncInput.action,
    page: pageValidation.page,
    properties: syncPlan.properties,
    pullRequest: syncInput.pullRequest,
  });

  const propertyValidation = validateRequiredPushMetadataProperties({
    page: pageValidation.page,
    properties: syncPlan.properties,
  });

  if (!propertyValidation.ok) {
    return propertyValidation;
  }

  await updateNotionPage({
    fetchImpl,
    notionToken: env.NOTION_TOKEN,
    pageId: syncPlan.pageId,
    properties: syncPlan.properties,
  });

  return {
    ok: true,
    pageId: syncPlan.pageId,
    ticketUrl: syncPlan.ticketUrl,
  };
}

async function main() {
  try {
    const result = await runSync();

    if (!result.ok) {
      console.error(result.reason);
      process.exitCode = 1;
      return;
    }

    if (result.skipped) {
      console.log(result.reason);
      return;
    }

    console.log(`Notion ticket synced: ${result.ticketUrl}`);
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  await main();
}
