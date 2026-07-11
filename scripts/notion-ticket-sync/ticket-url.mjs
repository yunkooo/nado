const NOTION_PAGE_URL_PATTERN =
  /https?:\/\/(?:www\.)?(?:app\.)?notion\.(?:so|com)\/[^\s<>)]+/i;
const COMPACT_NOTION_ID_PATTERN = /[0-9a-f]{32}/i;
const DASHED_NOTION_ID_PATTERN =
  /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;

export function parseTicketUrlFromBody(body = "") {
  const ticketLine = body
    .split("\n")
    .find((line) => /^\s*-?\s*Ticket\s*:/i.test(line));

  if (!ticketLine) {
    return null;
  }

  const match = ticketLine.match(NOTION_PAGE_URL_PATTERN);

  return match ? match[0] : null;
}

export function extractNotionPageId(ticketUrl) {
  try {
    const url = new URL(ticketUrl);
    const path = decodeURIComponent(url.pathname);
    const dashedId = path.match(DASHED_NOTION_ID_PATTERN)?.[0];
    const compactId = path.match(COMPACT_NOTION_ID_PATTERN)?.[0];

    if (dashedId) {
      return dashedId.toLowerCase();
    }

    if (compactId) {
      return formatCompactUuid(compactId);
    }
  } catch {
    return null;
  }

  return null;
}

export function normalizeNotionId(id) {
  return String(id ?? "")
    .replaceAll("-", "")
    .toLowerCase();
}

function formatCompactUuid(compactId) {
  const id = compactId.toLowerCase();

  return [
    id.slice(0, 8),
    id.slice(8, 12),
    id.slice(12, 16),
    id.slice(16, 20),
    id.slice(20),
  ].join("-");
}
