import { useAuthState } from "../../auth/authState";
import { useVocabularyState } from "./vocabularyState";
import { VocabularyList } from "./VocabularyList";
import { VocabularyPanel, VocabularySummary } from "./VocabularyPanels";
import { useVocabularyDeleteAction } from "./useVocabularyDeleteAction";
import { getVocabularyPanelState } from "./vocabularyViewState";

type VocabularyStatus = "loading" | "ready";

export function VocabularyFlow() {
  const authState = useAuthState();
  const vocabularyState = useVocabularyState();
  const { deleteItem, deleteMessage, deletingItemId } =
    useVocabularyDeleteAction(authState);
  const items = vocabularyState.items;
  const status: VocabularyStatus =
    authState.status === "loading" || vocabularyState.status === "loading"
      ? "loading"
      : "ready";
  const loadMessage = vocabularyState.message;
  const isLoading = status === "loading";
  const panelState = getVocabularyPanelState({
    authStatus: authState.status,
    isLoading,
    itemCount: items.length,
    message: loadMessage,
  });
  const isSummaryAvailable =
    panelState !== "loading" &&
    panelState !== "auth_required" &&
    panelState !== "error";

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
            deletingItemId={deletingItemId}
            isLoading={isLoading}
            items={items}
            onDeleteItem={deleteItem}
          />
        ) : null}
      </section>
    </section>
  );
}
