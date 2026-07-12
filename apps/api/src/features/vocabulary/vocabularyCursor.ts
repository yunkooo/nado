import { BadRequestError } from "../../shared/errors/httpErrors.js";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export type VocabularyCursor = {
  id: string;
  updatedAt: string;
};

export function encodeVocabularyCursor(cursor: VocabularyCursor): string {
  return Buffer.from(JSON.stringify(cursor), "utf8").toString("base64url");
}

export function decodeVocabularyCursor(
  encodedCursor: string | undefined,
): VocabularyCursor | undefined {
  if (encodedCursor === undefined) {
    return undefined;
  }

  try {
    const decoded = Buffer.from(encodedCursor, "base64url").toString("utf8");
    const value: unknown = JSON.parse(decoded);

    if (!isVocabularyCursor(value)) {
      throw new Error("Vocabulary cursor payload is invalid.");
    }

    return value;
  } catch (error) {
    throw new BadRequestError(
      "invalid_input",
      "단어장 페이지 커서가 올바르지 않습니다.",
      error,
    );
  }
}

function isVocabularyCursor(value: unknown): value is VocabularyCursor {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const cursor = value as Record<string, unknown>;

  return (
    Object.keys(cursor).length === 2 &&
    typeof cursor.id === "string" &&
    UUID_PATTERN.test(cursor.id) &&
    typeof cursor.updatedAt === "string" &&
    isIsoDateTime(cursor.updatedAt)
  );
}

function isIsoDateTime(value: string): boolean {
  const timestamp = Date.parse(value);

  return (
    Number.isFinite(timestamp) && new Date(timestamp).toISOString() === value
  );
}
