import { FlatList, Pressable, RefreshControl, Text, View } from "react-native";
import {
  createVocabularyMeaningRenderKey,
  getDistinctVocabularyNote,
  type VocabularyItem,
} from "@nado/shared/vocabulary";
import { Badge, Card } from "@nado/ui/native";
import type { MobileAuthStateStatus } from "../auth/authState";
import { MobileRefreshButton } from "../components/MobileRefreshButton";
import { MobileStatePanel } from "../components/MobileStatePanel";
import { StatusCard } from "../components/StatusCard";
import { getMobileVocabularyPanelState } from "../components/mobilePanelState";
import type { MobileVocabularyState } from "../features/vocabulary/useMobileVocabulary";
import { mobileColors, styles } from "../styles/mobileStyles";

type VocabularyScreenProps = {
  authMessage: string | null;
  authStatus: MobileAuthStateStatus;
  deletingItemIds: ReadonlySet<string>;
  isRefreshing: boolean;
  onDeleteItem: (itemId: string) => void;
  onRefresh: () => void;
  vocabularyState: MobileVocabularyState;
};

export function VocabularyScreen({
  authMessage,
  authStatus,
  deletingItemIds,
  isRefreshing,
  onDeleteItem,
  onRefresh,
  vocabularyState,
}: VocabularyScreenProps) {
  const panelState = getMobileVocabularyPanelState(authStatus, vocabularyState);
  const isSummaryAvailable = panelState === "empty" || panelState === "list";
  const isRefreshDisabled =
    authStatus !== "authenticated" ||
    isRefreshing ||
    vocabularyState.status === "loading";
  const listData = panelState === "list" ? vocabularyState.items : [];

  return (
    <FlatList
      contentContainerStyle={styles.content}
      data={listData}
      ItemSeparatorComponent={VocabularyItemSeparator}
      keyExtractor={(item) => item.id}
      ListEmptyComponent={
        panelState === "list" ? null : (
          <MobileStatePanel
            message={vocabularyState.message}
            state={panelState}
            type="vocabulary"
          />
        )
      }
      ListHeaderComponent={
        <View style={styles.vocabularyListHeader}>
          {authMessage ? (
            <StatusCard
              message={authMessage}
              title="로그인 안내"
              tone="error"
            />
          ) : null}
          <View style={styles.pageHeader}>
            <View style={styles.pageTitleGroup}>
              <Text style={styles.eyebrow}>Vocabulary</Text>
              <Text style={styles.pageTitle}>단어장</Text>
            </View>
            <MobileRefreshButton
              accessibilityLabel="단어장 새로고침"
              isDisabled={isRefreshDisabled}
              isRefreshing={isRefreshing}
              onRefresh={onRefresh}
            />
          </View>

          <Card
            accessibilityLabel="단어장 요약"
            padding="md"
            radius="md"
            style={styles.summaryItem}
            tone="surface"
          >
            <Text style={styles.summaryLabel}>저장 항목</Text>
            <Text style={styles.summaryValue}>
              {isSummaryAvailable ? String(vocabularyState.items.length) : "-"}
            </Text>
          </Card>

          {panelState === "list" ? (
            <>
              <View style={styles.sectionHeader}>
                <View style={styles.sectionTitleGroup}>
                  <Text style={styles.eyebrow}>My vocabulary</Text>
                  <Text style={styles.sectionTitle}>
                    저장한 단어를 확인해요
                  </Text>
                </View>
              </View>
              {vocabularyState.message ? (
                <StatusCard
                  message={vocabularyState.message}
                  title={null}
                  tone="error"
                />
              ) : null}
            </>
          ) : null}
        </View>
      }
      refreshControl={
        <RefreshControl
          colors={[mobileColors.primary]}
          onRefresh={onRefresh}
          refreshing={isRefreshing}
          tintColor={mobileColors.inkMuted}
        />
      }
      renderItem={({ item }) => (
        <VocabularyItemCard
          isDeleting={deletingItemIds.has(item.id)}
          item={item}
          onDeleteItem={onDeleteItem}
        />
      )}
    />
  );
}

function VocabularyItemCard({
  isDeleting,
  item,
  onDeleteItem,
}: {
  isDeleting: boolean;
  item: VocabularyItem;
  onDeleteItem: (itemId: string) => void;
}) {
  return (
    <Card
      padding="lg"
      radius="md"
      style={styles.vocabularyItem}
      tone="elevated"
    >
      <View style={styles.cardHeader}>
        <View style={styles.termGroup}>
          <Text style={styles.termText}>{item.term}</Text>
          <Badge size="sm" tone="neutral">
            {item.type}
          </Badge>
        </View>
      </View>
      <View style={styles.meaningList}>
        {item.meanings.map((meaning, meaningIndex) => {
          const meaningDisplayNote = getDistinctVocabularyNote(meaning.note, [
            meaning.meaning,
          ]);

          return (
            <Card
              key={createVocabularyMeaningRenderKey(
                item.id,
                meaning,
                meaningIndex,
              )}
              padding="md"
              radius="md"
              style={styles.meaningCard}
              tone="muted"
            >
              <Text style={styles.meaningText}>{meaning.meaning}</Text>
              {meaningDisplayNote ? (
                <Text style={styles.meaningNote}>{meaningDisplayNote}</Text>
              ) : null}
            </Card>
          );
        })}
      </View>
      <View style={styles.itemFooter}>
        <Text style={styles.itemMeta}>
          {formatVocabularyDate(item.updatedAt)}
        </Text>
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ disabled: isDeleting }}
          disabled={isDeleting}
          onPress={() => onDeleteItem(item.id)}
          style={styles.secondaryButton}
        >
          <Text style={styles.secondaryButtonText}>
            {isDeleting ? "삭제 중" : "삭제"}
          </Text>
        </Pressable>
      </View>
    </Card>
  );
}

function VocabularyItemSeparator() {
  return <View style={styles.vocabularyItemSeparator} />;
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
