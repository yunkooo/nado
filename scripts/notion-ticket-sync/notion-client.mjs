import { NOTION_API_VERSION } from "./constants.mjs";
import { normalizeNotionId } from "./ticket-url.mjs";

export async function updateNotionPage({
  fetchImpl,
  notionToken,
  pageId,
  properties,
}) {
  const response = await fetchImpl(
    `https://api.notion.com/v1/pages/${pageId}`,
    {
      body: JSON.stringify({ properties }),
      headers: notionHeaders(notionToken, true),
      method: "PATCH",
    },
  );

  if (!response.ok) {
    const errorBody = await response.text();
    const permissionHint =
      response.status === 404
        ? " Check that the Notion ticket page and its parent data source are shared with the integration configured by NOTION_TOKEN."
        : "";

    throw new Error(
      `Notion page update failed (${response.status}): ${errorBody}${permissionHint}`,
    );
  }
}

export async function validateNotionTicketPage({
  dataSourceId,
  fetchImpl,
  notionToken,
  pageId,
}) {
  const page = await retrieveNotionPage({
    fetchImpl,
    notionToken,
    pageId,
  });

  if (!isNotionPageInDataSource(page, dataSourceId)) {
    return {
      ok: false,
      reason: "Notion ticket page is not in the configured Notion data source",
    };
  }

  return {
    ok: true,
    page,
  };
}

export async function queryNotionPagesByPullRequest({
  dataSourceId,
  fetchImpl,
  notionToken,
  pullRequestUrl,
}) {
  const boundPages = [];
  const seenCursors = new Set();
  let startCursor = null;

  while (true) {
    const queryBody = {
      filter: {
        property: "GitHub PR",
        url: {
          equals: pullRequestUrl,
        },
      },
      page_size: 100,
      result_type: "page",
    };

    if (startCursor) {
      queryBody.start_cursor = startCursor;
    }

    const response = await fetchImpl(
      `https://api.notion.com/v1/data_sources/${encodeURIComponent(dataSourceId)}/query`,
      {
        body: JSON.stringify(queryBody),
        headers: notionHeaders(notionToken, true),
        method: "POST",
      },
    );

    if (!response.ok) {
      const errorBody = await response.text();
      const permissionHint =
        response.status === 404
          ? " Check that the Notion ticket data source is shared with the integration configured by NOTION_TOKEN."
          : "";

      throw new Error(
        `Notion ticket binding query failed (${response.status}): ${errorBody}${permissionHint}`,
      );
    }

    const body = await response.json();

    if (!Array.isArray(body.results)) {
      throw new Error(
        "Notion ticket binding query returned an invalid response",
      );
    }

    boundPages.push(...body.results);

    if (boundPages.length >= 2 || !body.has_more) {
      return boundPages;
    }

    const nextCursor = body.next_cursor;

    if (
      typeof nextCursor !== "string" ||
      !nextCursor ||
      seenCursors.has(nextCursor)
    ) {
      throw new Error(
        "Notion ticket binding query returned an invalid pagination cursor",
      );
    }

    seenCursors.add(nextCursor);
    startCursor = nextCursor;
  }
}

async function retrieveNotionPage({ fetchImpl, notionToken, pageId }) {
  const response = await fetchImpl(
    `https://api.notion.com/v1/pages/${pageId}`,
    {
      headers: notionHeaders(notionToken),
      method: "GET",
    },
  );

  if (!response.ok) {
    const errorBody = await response.text();
    const permissionHint =
      response.status === 404
        ? " Check that the Notion ticket page and its parent data source are shared with the integration configured by NOTION_TOKEN."
        : "";

    throw new Error(
      `Notion page retrieval failed (${response.status}): ${errorBody}${permissionHint}`,
    );
  }

  return response.json();
}

function isNotionPageInDataSource(page, dataSourceId) {
  const pageParentId = getNotionPageParentDataSourceId(page);

  return Boolean(
    pageParentId &&
    normalizeNotionId(pageParentId) === normalizeNotionId(dataSourceId),
  );
}

function getNotionPageParentDataSourceId(page) {
  const parent = page?.parent;

  if (!parent) {
    return null;
  }

  if (parent.type === "data_source_id") {
    return parent.data_source_id;
  }

  if (parent.type === "database_id") {
    return parent.database_id;
  }

  return null;
}

function notionHeaders(notionToken, includeContentType = false) {
  return {
    Authorization: `Bearer ${notionToken}`,
    ...(includeContentType ? { "Content-Type": "application/json" } : {}),
    "Notion-Version": NOTION_API_VERSION,
  };
}
