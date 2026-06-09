import {
  vocabularyListResponseSchema,
  type VocabularyItem,
} from "@nado/shared";
import { resolveMobileApiUrl, type MobileApiPlatform } from "./apiConfig";

type Fetcher = typeof fetch;

export type VocabularyApiOptions = {
  apiBaseUrl?: string;
  apiPlatform?: MobileApiPlatform | string;
  fetcher?: Fetcher;
};

export type VocabularyListResult =
  | { data: VocabularyItem[]; status: "success" }
  | { message: string; status: "error" };

export type DeleteVocabularyResult =
  | { status: "success" }
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
    response = await fetcher(
      resolveMobileApiUrl("/api/vocabulary", options.apiBaseUrl, {
        platform: options.apiPlatform,
      }),
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
        method: "GET",
      },
    );
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
    response = await fetcher(
      resolveMobileApiUrl(
        `/api/vocabulary/${encodeURIComponent(itemId)}`,
        options.apiBaseUrl,
        { platform: options.apiPlatform },
      ),
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
        method: "DELETE",
      },
    );
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
