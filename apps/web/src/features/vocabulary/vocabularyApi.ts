import {
  saveVocabularyResponseSchema,
  vocabularyListResponseSchema,
  type SaveVocabularyRequest,
  type VocabularyItem,
} from "@nado/shared";
import {
  fetchWithTimeout,
  readApiErrorMessage,
  readJson,
  type ApiRequestOptions,
} from "../../lib/apiClient";

export type VocabularyApiOptions = ApiRequestOptions;

export type VocabularyListResult =
  | { data: VocabularyItem[]; status: "success" }
  | { message: string; status: "error" };

export type DeleteVocabularyResult =
  | { status: "success" }
  | { message: string; status: "error" };

export type SaveVocabularyResult =
  | { data: VocabularyItem; status: "success" }
  | { message: string; status: "error" };

export const VOCABULARY_ERROR_MESSAGE =
  "단어장을 불러오지 못했어요. 잠시 후 다시 시도해 주세요.";
export const DELETE_VOCABULARY_ERROR_MESSAGE =
  "단어장 항목을 삭제하지 못했어요. 잠시 후 다시 시도해 주세요.";
const VOCABULARY_TIMEOUT_MESSAGE =
  "단어장 요청 시간이 오래 걸리고 있어요. 잠시 후 다시 시도해 주세요.";
const DELETE_VOCABULARY_TIMEOUT_MESSAGE =
  "단어장 삭제 요청 시간이 오래 걸리고 있어요. 잠시 후 다시 시도해 주세요.";

export async function listVocabulary(
  accessToken: string,
  options: VocabularyApiOptions = {},
): Promise<VocabularyListResult> {
  const fetchResult = await fetchWithTimeout(
    "/api/vocabulary",
    {
      headers: createAuthHeaders(accessToken),
      method: "GET",
    },
    {
      fallbackMessage: VOCABULARY_ERROR_MESSAGE,
      fetcher: options.fetcher,
      timeoutMessage: VOCABULARY_TIMEOUT_MESSAGE,
      timeoutMs: options.timeoutMs,
    },
  );

  if (fetchResult.status === "error") {
    return fetchResult;
  }

  const { response } = fetchResult;
  const payload = await readJson(response);

  if (!response.ok) {
    return {
      message: readApiErrorMessage(payload, VOCABULARY_ERROR_MESSAGE),
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
  const fetchResult = await fetchWithTimeout(
    `/api/vocabulary/${encodeURIComponent(itemId)}`,
    {
      headers: createAuthHeaders(accessToken),
      method: "DELETE",
    },
    {
      fallbackMessage: DELETE_VOCABULARY_ERROR_MESSAGE,
      fetcher: options.fetcher,
      timeoutMessage: DELETE_VOCABULARY_TIMEOUT_MESSAGE,
      timeoutMs: options.timeoutMs,
    },
  );

  if (fetchResult.status === "error") {
    return fetchResult;
  }

  const { response } = fetchResult;

  if (!response.ok) {
    return {
      message: readApiErrorMessage(
        await readJson(response),
        DELETE_VOCABULARY_ERROR_MESSAGE,
      ),
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
  const fetchResult = await fetchWithTimeout(
    "/api/vocabulary",
    {
      body: JSON.stringify(request),
      headers: {
        ...createAuthHeaders(accessToken),
        "Content-Type": "application/json",
      },
      method: "POST",
    },
    {
      fallbackMessage: VOCABULARY_ERROR_MESSAGE,
      fetcher: options.fetcher,
      timeoutMessage: VOCABULARY_TIMEOUT_MESSAGE,
      timeoutMs: options.timeoutMs,
    },
  );

  if (fetchResult.status === "error") {
    return fetchResult;
  }

  const { response } = fetchResult;
  const payload = await readJson(response);

  if (!response.ok) {
    return {
      message: readApiErrorMessage(payload, VOCABULARY_ERROR_MESSAGE),
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
