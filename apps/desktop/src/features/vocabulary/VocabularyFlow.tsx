import { useAuthState } from "../../auth/authState";
import { useVocabularyStateForAuth } from "./vocabularyState";
import { VocabularyList } from "./VocabularyList";
import { VocabularyPanel, VocabularySummary } from "./VocabularyPanels";
import { useVocabularyDeleteAction } from "./useVocabularyDeleteAction";
import { getVocabularyPanelState } from "./vocabularyViewState";

export function VocabularyFlow() {
  const authState = useAuthState();
  const vocabularyState = useVocabularyStateForAuth(authState);
  const { deleteMeaning, deleteMessage, deletingMeaningKeys } =
    useVocabularyDeleteAction(authState);
  const items = vocabularyState.items;
  const loadMessage = vocabularyState.message;
  const isVocabularyLoading = vocabularyState.status === "loading";
  const panelState = getVocabularyPanelState({
    authStatus: authState.status,
    itemCount: items.length,
    message: loadMessage,
    vocabularyStatus: vocabularyState.status,
  });
  const isSummaryAvailable = panelState === "empty" || panelState === "list";

  return (
    <section className="nado-vocabulary-flow">
      <VocabularySummary
        isAvailable={isSummaryAvailable}
        itemCount={items.length}
      />

      <section className="nado-vocabulary-layout">
        {panelState !== "list" ? (
          <VocabularyPanel message={loadMessage} state={panelState} />
        ) : null}

        {panelState === "list" ? (
          <VocabularyList
            deleteMessage={deleteMessage}
            deletingMeaningKeys={deletingMeaningKeys}
            isLoading={isVocabularyLoading}
            items={items}
            onDeleteMeaning={deleteMeaning}
          />
        ) : null}
      </section>
    </section>
  );
}
