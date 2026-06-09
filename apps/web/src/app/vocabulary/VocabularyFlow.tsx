"use client";

import { useEffect, useState } from "react";
import { Button } from "@nado/ui";
import { getCurrentAccessToken } from "../authClient";
import {
  deleteMockVocabularyItem,
  getMockVocabularySummary,
  mockVocabularyItems,
} from "../mockVocabularyFlow";
import {
  deleteVocabularyItem as deleteVocabularyItemFromApi,
  listVocabulary,
} from "../vocabularyApi";
import type { VocabularyItem } from "@nado/shared";

type VocabularySource = "account" | "mock";
type VocabularyStatus = "loading" | "ready";

export function VocabularyFlow() {
  const [items, setItems] = useState<VocabularyItem[]>(mockVocabularyItems);
  const [source, setSource] = useState<VocabularySource>("mock");
  const [status, setStatus] = useState<VocabularyStatus>("ready");
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [deletingItemId, setDeletingItemId] = useState<string | null>(null);
  const summary = getMockVocabularySummary(items);

  useEffect(() => {
    let isCurrent = true;

    async function loadVocabularyForSession() {
      setStatus("loading");

      const token = await getCurrentAccessToken();

      if (!isCurrent) {
        return;
      }

      if (!token) {
        setAccessToken(null);
        setItems(mockVocabularyItems);
        setMessage(null);
        setSource("mock");
        setStatus("ready");
        return;
      }

      setAccessToken(token);
      setSource("account");

      const result = await listVocabulary(token);

      if (!isCurrent) {
        return;
      }

      if (result.status === "success") {
        setItems(result.data);
        setMessage(null);
      } else {
        setItems([]);
        setMessage(result.message);
      }

      setStatus("ready");
    }

    void loadVocabularyForSession();

    return () => {
      isCurrent = false;
    };
  }, []);

  const deleteItem = async (itemId: string) => {
    if (!accessToken || source === "mock") {
      setItems((currentItems) =>
        deleteMockVocabularyItem(currentItems, itemId),
      );
      return;
    }

    setDeletingItemId(itemId);

    const result = await deleteVocabularyItemFromApi(itemId, accessToken);

    setDeletingItemId(null);

    if (result.status === "success") {
      setItems((currentItems) =>
        deleteMockVocabularyItem(currentItems, itemId),
      );
      setMessage(null);
      return;
    }

    setMessage(result.message);
  };

  const isAccountSource = source === "account";
  const isLoading = status === "loading";

  return (
    <section className="nado-vocabulary-flow">
      <section className="nado-vocabulary-summary" aria-label="단어장 요약">
        <article className="nado-vocabulary-summary__item">
          <span>{summary.label}</span>
          <strong>{summary.value}</strong>
        </article>
      </section>

      <section className="nado-vocabulary-layout">
        {message ? (
          <div
            className="nado-empty-panel nado-empty-panel--compact"
            role="alert"
          >
            <span className="nado-eyebrow">연결 오류</span>
            <h2>단어장을 불러오지 못했어요</h2>
            <p>{message}</p>
          </div>
        ) : null}

        {items.length === 0 ? (
          <div className="nado-empty-panel nado-empty-panel--compact">
            <span className="nado-eyebrow">
              {isAccountSource ? "저장 전" : "비어 있음"}
            </span>
            <h2>
              {isAccountSource
                ? "저장된 단어가 아직 없어요"
                : "단어장 항목이 아직 없어요"}
            </h2>
            <p>
              {isAccountSource
                ? "분석 결과에서 단어와 표현을 저장하면 이곳에 모을게요."
                : "목업 항목을 모두 삭제했어요. 새로고침하면 다시 시작합니다."}
            </p>
          </div>
        ) : null}

        {items.length > 0 ? (
          <section
            className="nado-vocabulary-list-wrap"
            aria-label={isAccountSource ? "내 단어장 목록" : "목업 단어장 목록"}
          >
            <header className="nado-section-header">
              <div>
                <span className="nado-eyebrow">
                  {isAccountSource ? "My vocabulary" : "Mock flow"}
                </span>
                <h2>
                  {isAccountSource
                    ? "저장한 단어를 확인해요"
                    : "저장된 단어처럼 확인해요"}
                </h2>
              </div>
              <span>
                {isLoading
                  ? "로그인 세션을 확인하고 있어요"
                  : isAccountSource
                    ? "분석에서 저장한 항목이에요"
                    : "삭제 버튼으로 상태 변화를 확인해요"}
              </span>
            </header>

            <div className="nado-vocabulary-list">
              {items.map((item) => (
                <article className="nado-vocabulary-item" key={item.id}>
                  <header>
                    <div>
                      <h2>{item.term}</h2>
                      <span className="nado-vocabulary-type">{item.type}</span>
                    </div>
                  </header>
                  <div
                    className="nado-vocabulary-meaning-list"
                    aria-label={`${item.term} 뜻`}
                  >
                    {item.meanings.map((meaning) => (
                      <span
                        className="nado-vocabulary-meaning"
                        key={`${item.id}-${meaning.meaning}`}
                      >
                        <strong>{meaning.meaning}</strong>
                        {meaning.note ? <small>{meaning.note}</small> : null}
                      </span>
                    ))}
                  </div>
                  <footer className="nado-vocabulary-item__footer">
                    <time
                      className="nado-vocabulary-item__date"
                      dateTime={item.updatedAt}
                    >
                      {formatVocabularyDate(item.updatedAt)}
                    </time>
                    <Button
                      disabled={deletingItemId === item.id}
                      onClick={() => deleteItem(item.id)}
                      size="sm"
                      variant="secondary"
                    >
                      {deletingItemId === item.id ? "삭제 중" : "삭제"}
                    </Button>
                  </footer>
                </article>
              ))}
            </div>
          </section>
        ) : null}
      </section>
    </section>
  );
}

function formatVocabularyDate(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}.${month}.${day}`;
}
