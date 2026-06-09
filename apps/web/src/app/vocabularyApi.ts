import {
  saveVocabularyResponseSchema,
  vocabularyListResponseSchema,
  type SaveVocabularyRequest,
  type VocabularyItem,
} from "@nado/shared";

type Fetcher = typeof fetch;

export type VocabularyApiOptions = {
  fetcher?: Fetcher;
};

export type VocabularyListResult =
  | { data: VocabularyItem[]; status: "success" }
  | { message: string; status: "error" };

export type DeleteVocabularyResult =
  | { status: "success" }
  | { message: string; status: "error" };

export type SaveVocabularyResult =
  | { data: VocabularyItem; status: "success" }
  | { message: string; status: "error" };

const VOCABULARY_ERROR_MESSAGE =
  "단어장을 불러오지 못했어요. 잠시 후 다시 시도해 주세요.";

export async function listVocabulary(
  accessToken: string,
  options: VocabularyApiOptions = {},
): Promise<VocabularyListResult> {
  const fetcher = options.fetcher ?? globalThis.fetch;

  let response: Response;

  try {
    response = await fetcher("/api/vocabulary", {
      headers: createAuthHeaders(accessToken),
      method: "GET",
    });
  } catch {
    return {
      message: VOCABULARY_ERROR_MESSAGE,
      status: "error",
    };
  }

  const payload = await readJson(response);

  if (!response.ok) {
    return {
      message: readErrorMessage(payload),
      status: "error",
    };
  }

  const parsed = vocabularyListResponseSchema.safeParse(payload);

  if (!parsed.success) {
    return {
      message: VOCABULARY_ERROR_MESSAGE,
      status: "error",
    };
  }

  return {
    data: parsed.data.items,
    status: "success",
  };
}

export async function deleteVocabularyItem(
  itemId: string,
  accessToken: string,
  options: VocabularyApiOptions = {},
): Promise<DeleteVocabularyResult> {
  const fetcher = options.fetcher ?? globalThis.fetch;

  let response: Response;

  try {
    response = await fetcher(`/api/vocabulary/${encodeURIComponent(itemId)}`, {
      headers: createAuthHeaders(accessToken),
      method: "DELETE",
    });
  } catch {
    return {
      message: VOCABULARY_ERROR_MESSAGE,
      status: "error",
    };
  }

  if (!response.ok) {
    return {
      message: readErrorMessage(await readJson(response)),
      status: "error",
    };
  }

  return { status: "success" };
}

export async function saveVocabularyItem(
  request: SaveVocabularyRequest,
  accessToken: string,
  options: VocabularyApiOptions = {},
): Promise<SaveVocabularyResult> {
  const fetcher = options.fetcher ?? globalThis.fetch;

  let response: Response;

  try {
    response = await fetcher("/api/vocabulary", {
      body: JSON.stringify(request),
      headers: {
        ...createAuthHeaders(accessToken),
        "Content-Type": "application/json",
      },
      method: "POST",
    });
  } catch {
    return {
      message: VOCABULARY_ERROR_MESSAGE,
      status: "error",
    };
  }

  const payload = await readJson(response);

  if (!response.ok) {
    return {
      message: readErrorMessage(payload),
      status: "error",
    };
  }

  const parsed = saveVocabularyResponseSchema.safeParse(payload);

  if (!parsed.success) {
    return {
      message: VOCABULARY_ERROR_MESSAGE,
      status: "error",
    };
  }

  return {
    data: parsed.data.item,
    status: "success",
  };
}

function createAuthHeaders(accessToken: string) {
  return {
    Authorization: `Bearer ${accessToken}`,
  };
}

async function readJson(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

function readErrorMessage(payload: unknown): string {
  if (isRecord(payload) && isRecord(payload.error)) {
    return typeof payload.error.message === "string"
      ? payload.error.message
      : VOCABULARY_ERROR_MESSAGE;
  }

  return VOCABULARY_ERROR_MESSAGE;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
