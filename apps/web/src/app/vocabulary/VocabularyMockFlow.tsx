"use client";

import { useState } from "react";
import { Button } from "@nado/ui";
import {
  deleteMockVocabularyItem,
  getMockVocabularySummary,
  mockVocabularyItems,
} from "../mockVocabularyFlow";
import type { VocabularyItem } from "@nado/shared";

export function VocabularyMockFlow() {
  const [items, setItems] = useState<VocabularyItem[]>(mockVocabularyItems);
  const summary = getMockVocabularySummary(items);

  const deleteItem = (itemId: string) => {
    setItems((currentItems) => deleteMockVocabularyItem(currentItems, itemId));
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
        {items.length === 0 ? (
          <div className="nado-empty-panel nado-empty-panel--compact">
            <span className="nado-eyebrow">비어 있음</span>
            <h2>단어장 항목이 아직 없어요</h2>
            <p>목업 항목을 모두 삭제했어요. 새로고침하면 다시 시작합니다.</p>
          </div>
        ) : null}

        {items.length > 0 ? (
          <section
            className="nado-vocabulary-list-wrap"
            aria-label="목업 단어장 목록"
          >
            <header className="nado-section-header">
              <div>
                <span className="nado-eyebrow">Mock flow</span>
                <h2>저장된 단어처럼 확인해요</h2>
              </div>
              <span>삭제 버튼으로 상태 변화를 확인해요</span>
            </header>

            <div className="nado-vocabulary-list">
              {items.map((item) => (
                <article className="nado-vocabulary-item" key={item.id}>
                  <header>
                    <div>
                      <span className="nado-vocabulary-type">{item.type}</span>
                      <h2>{item.term}</h2>
                    </div>
                    <time dateTime={item.updatedAt}>2026.06.09</time>
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
                    <span>뜻 {item.meanings.length}개</span>
                    <Button
                      onClick={() => deleteItem(item.id)}
                      size="sm"
                      variant="secondary"
                    >
                      삭제
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
