import {
  fetchWithTimeout,
  readApiErrorMessage,
  readJson,
  saveVocabularyResponseSchema,
  vocabularyListResponseSchema,
  type ApiRequestOptions,
  type SaveVocabularyRequest,
  type VocabularyItem,
} from "@nado/shared";
import {
  MOBILE_API_CONFIGURATION_ERROR_MESSAGE,
  MobileApiConfigurationError,
  resolveMobileApiUrl,
  type MobileApiPlatform,
} from "./apiConfig";

export type VocabularyApiOptions = ApiRequestOptions & {
  apiBaseUrl?: string;
  apiPlatform?: MobileApiPlatform | string;
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
const SAVE_VOCABULARY_ERROR_MESSAGE =
  "단어장에 저장하지 못했어요. 잠시 후 다시 시도해 주세요.";
const VOCABULARY_TIMEOUT_MESSAGE =
  "단어장 요청 시간이 오래 걸리고 있어요. 잠시 후 다시 시도해 주세요.";
const SAVE_VOCABULARY_TIMEOUT_MESSAGE =
  "단어장 저장 요청 시간이 오래 걸리고 있어요. 잠시 후 다시 시도해 주세요.";

export async function listVocabulary(
  accessToken: string,
  options: VocabularyApiOptions = {},
): Promise<VocabularyListResult> {
  const fetcher = options.fetcher ?? globalThis.fetch;

  let fetchResult;

  try {
    fetchResult = await fetchWithTimeout(
      resolveMobileApiUrl("/api/vocabulary", options.apiBaseUrl, {
        platform: options.apiPlatform,
      }),
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
        method: "GET",
      },
      {
        fallbackMessage: VOCABULARY_ERROR_MESSAGE,
        fetcher,
        timeoutMessage: VOCABULARY_TIMEOUT_MESSAGE,
        timeoutMs: options.timeoutMs,
      },
    );
  } catch (error) {
    return {
      message:
        error instanceof MobileApiConfigurationError
          ? MOBILE_API_CONFIGURATION_ERROR_MESSAGE
          : VOCABULARY_ERROR_MESSAGE,
      status: "error",
    };
  }

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
  const fetcher = options.fetcher ?? globalThis.fetch;

  let fetchResult;

  try {
    fetchResult = await fetchWithTimeout(
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
      {
        fallbackMessage: VOCABULARY_ERROR_MESSAGE,
        fetcher,
        timeoutMessage: VOCABULARY_TIMEOUT_MESSAGE,
        timeoutMs: options.timeoutMs,
      },
    );
  } catch (error) {
    return {
      message:
        error instanceof MobileApiConfigurationError
          ? MOBILE_API_CONFIGURATION_ERROR_MESSAGE
          : VOCABULARY_ERROR_MESSAGE,
      status: "error",
    };
  }

  if (fetchResult.status === "error") {
    return fetchResult;
  }

  const { response } = fetchResult;
  if (!response.ok) {
    return {
      message: readApiErrorMessage(
        await readJson(response),
        VOCABULARY_ERROR_MESSAGE,
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
  const fetcher = options.fetcher ?? globalThis.fetch;

  let fetchResult;

  try {
    fetchResult = await fetchWithTimeout(
      resolveMobileApiUrl("/api/vocabulary", options.apiBaseUrl, {
        platform: options.apiPlatform,
      }),
      {
        body: JSON.stringify(request),
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        method: "POST",
      },
      {
        fallbackMessage: SAVE_VOCABULARY_ERROR_MESSAGE,
        fetcher,
        timeoutMessage: SAVE_VOCABULARY_TIMEOUT_MESSAGE,
        timeoutMs: options.timeoutMs,
      },
    );
  } catch (error) {
    return {
      message:
        error instanceof MobileApiConfigurationError
          ? MOBILE_API_CONFIGURATION_ERROR_MESSAGE
          : SAVE_VOCABULARY_ERROR_MESSAGE,
      status: "error",
    };
  }

  if (fetchResult.status === "error") {
    return fetchResult;
  }

  const { response } = fetchResult;
  const payload = await readJson(response);

  if (!response.ok) {
    return {
      message: readApiErrorMessage(payload, SAVE_VOCABULARY_ERROR_MESSAGE),
      status: "error",
    };
  }

  const parsed = saveVocabularyResponseSchema.safeParse(payload);

  if (!parsed.success) {
    return {
      message: SAVE_VOCABULARY_ERROR_MESSAGE,
      status: "error",
    };
  }

  return {
    data: parsed.data.item,
    status: "success",
  };
}
