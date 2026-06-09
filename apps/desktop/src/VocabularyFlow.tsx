import { useState } from "react";
import { Button } from "@nado/ui";
import { useAuthState } from "./authState";
import { deleteVocabularyItem as deleteVocabularyItemFromApi } from "./vocabularyApi";
import {
  useSyncVocabularyForAuth,
  useVocabularyState,
  vocabularyStateStore,
} from "./vocabularyState";
import { getVocabularyPanelState } from "./vocabularyViewState";

type VocabularyStatus = "loading" | "ready";

export function VocabularyFlow() {
  const authState = useAuthState();
  const vocabularyState = useVocabularyState();
  const [deleteMessage, setDeleteMessage] = useState<string | null>(null);
  const [deletingItemId, setDeletingItemId] = useState<string | null>(null);
  const items = vocabularyState.items;
  const status: VocabularyStatus =
    authState.status === "loading" || vocabularyState.status === "loading"
      ? "loading"
      : "ready";
  const message = deleteMessage ?? vocabularyState.message;
  const isLoading = status === "loading";
  const panelState = getVocabularyPanelState({
    authStatus: authState.status,
    isLoading,
    itemCount: items.length,
    message,
  });
  const summary =
    panelState === "loading" ||
    panelState === "auth_required" ||
    panelState === "error"
      ? { label: "저장 항목", value: "-" }
      : { label: "저장 항목", value: String(items.length) };

  useSyncVocabularyForAuth(authState);

  const deleteItem = async (itemId: string) => {
    if (!authState.accessToken) {
      return;
    }

    setDeletingItemId(itemId);

    const result = await deleteVocabularyItemFromApi(
      itemId,
      authState.accessToken,
    );

    setDeletingItemId(null);

    if (result.status === "success") {
      vocabularyStateStore.removeItem(itemId);
      setDeleteMessage(null);
      return;
    }

    setDeleteMessage(result.message);
  };

  return (
    <section className="nado-vocabulary-flow">
      <section className="nado-vocabulary-summary" aria-label="단어장 요약">
        <article className="nado-vocabulary-summary__item">
          <span>{summary.label}</span>
          <strong>{summary.value}</strong>
        </article>
      </section>

      <section className="nado-vocabulary-layout">
        {panelState === "loading" ? (
          <div
            className="nado-empty-panel nado-empty-panel--compact"
            role="status"
          >
            <span className="nado-eyebrow">확인 중</span>
            <h2>로그인 세션을 확인하고 있어요</h2>
            <p>단어장 데이터를 불러오기 전에 계정 상태를 먼저 확인합니다.</p>
          </div>
        ) : null}

        {panelState === "auth_required" ? (
          <div className="nado-empty-panel nado-empty-panel--compact">
            <span className="nado-eyebrow">로그인 필요</span>
            <h2>로그인 후 단어장을 이용할 수 있어요</h2>
            <p>Google 로그인 후 저장한 단어와 표현을 이곳에서 확인해 주세요.</p>
          </div>
        ) : null}

        {panelState === "error" ? (
          <div
            className="nado-empty-panel nado-empty-panel--compact"
            role="alert"
          >
            <span className="nado-eyebrow">연결 오류</span>
            <h2>단어장을 불러오지 못했어요</h2>
            <p>{message}</p>
          </div>
        ) : null}

        {panelState === "empty" ? (
          <div className="nado-empty-panel nado-empty-panel--compact">
            <span className="nado-eyebrow">저장 전</span>
            <h2>저장된 단어가 아직 없어요</h2>
            <p>분석 결과에서 단어와 표현을 저장하면 이곳에 모을게요.</p>
          </div>
        ) : null}

        {panelState === "list" ? (
          <section
            className="nado-vocabulary-list-wrap"
            aria-label="내 단어장 목록"
          >
            <header className="nado-section-header">
              <div>
                <span className="nado-eyebrow">My vocabulary</span>
                <h2>저장한 단어를 확인해요</h2>
              </div>
              <span>
                {isLoading
                  ? "로그인 세션을 확인하고 있어요"
                  : "분석에서 저장한 항목이에요"}
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
