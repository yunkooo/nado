import { useEffect, useMemo, useState } from "react";
import {
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  View,
} from "react-native";
import { Button, Card } from "@nado/ui/native";
import {
  createReviewCardKey,
  getCurrentReviewIndex,
  getNextReviewIndex,
  getReviewCard,
  getReviewableItems,
  reviewDirectionOptions,
  type ReviewDirection,
} from "@nado/shared/review";
import type { MobileAuthStateStatus } from "../auth/authState";
import { MobileRefreshButton } from "../components/MobileRefreshButton";
import { MobileStatePanel } from "../components/MobileStatePanel";
import { StatusCard } from "../components/StatusCard";
import { getMobileVocabularyPanelState } from "../components/mobilePanelState";
import type { MobileVocabularyState } from "../features/vocabulary/useMobileVocabulary";
import { mobileColors, styles } from "../styles/mobileStyles";

type ReviewScreenProps = {
  authMessage: string | null;
  authStatus: MobileAuthStateStatus;
  isRefreshing: boolean;
  onRefresh: () => void;
  vocabularyState: MobileVocabularyState;
};

export function ReviewScreen({
  authMessage,
  authStatus,
  isRefreshing,
  onRefresh,
  vocabularyState,
}: ReviewScreenProps) {
  const [currentItemId, setCurrentItemId] = useState<string | null>(null);
  const [revealedCardKey, setRevealedCardKey] = useState<string | null>(null);
  const [direction, setDirection] =
    useState<ReviewDirection>("english-to-korean");
  const items = useMemo(
    () => getReviewableItems(vocabularyState.items),
    [vocabularyState.items],
  );
  const panelState = getMobileVocabularyPanelState(authStatus, vocabularyState);
  const isRefreshDisabled =
    authStatus !== "authenticated" ||
    isRefreshing ||
    vocabularyState.status === "loading";
  const currentCardIndex = getCurrentReviewIndex(items, currentItemId);
  const currentItem = items[currentCardIndex] ?? null;
  const currentCard = currentItem
    ? getReviewCard(currentItem, direction)
    : null;
  const currentCardKey = currentItem
    ? createReviewCardKey(currentItem, direction)
    : null;
  const isAnswerRevealed =
    currentCardKey !== null && revealedCardKey === currentCardKey;

  useEffect(() => {
    setCurrentItemId((itemId) => {
      if (itemId && items.some((item) => item.id === itemId)) {
        return itemId;
      }

      return items[0]?.id ?? null;
    });
  }, [items]);

  const handleNextReviewCard = () => {
    const nextIndex = getNextReviewIndex(currentCardIndex, items.length);
    setCurrentItemId(items[nextIndex]?.id ?? null);
    setRevealedCardKey(null);
  };

  return (
    <ScrollView
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl
          colors={[mobileColors.primary]}
          onRefresh={onRefresh}
          refreshing={isRefreshing}
          tintColor={mobileColors.inkMuted}
        />
      }
    >
      {authMessage ? (
        <StatusCard message={authMessage} title="로그인 안내" tone="error" />
      ) : null}
      <View style={styles.pageHeader}>
        <View style={styles.pageTitleGroup}>
          <Text style={styles.eyebrow}>Review</Text>
          <Text style={styles.pageTitle}>복습</Text>
        </View>
        <MobileRefreshButton
          accessibilityLabel="복습 새로고침"
          isDisabled={isRefreshDisabled}
          isRefreshing={isRefreshing}
          onRefresh={onRefresh}
        />
      </View>

      <View style={styles.pageLayout}>
        {panelState === "list" && currentCard ? (
          <>
            {vocabularyState.message ? (
              <StatusCard
                message={vocabularyState.message}
                title={null}
                tone="error"
              />
            ) : null}
            <View style={styles.reviewControls} accessibilityLabel="복습 방향">
              {reviewDirectionOptions.map((option) => {
                const selected = option.key === direction;

                return (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityState={{ selected }}
                    key={option.key}
                    onPress={() => {
                      setDirection(option.key);
                      setRevealedCardKey(null);
                    }}
                    style={[
                      styles.reviewDirection,
                      selected ? styles.reviewDirectionActive : null,
                    ]}
                  >
                    <Text
                      style={[
                        styles.reviewDirectionText,
                        selected ? styles.reviewDirectionTextActive : null,
                      ]}
                    >
                      {option.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            <Card
              padding="xl"
              radius="md"
              style={styles.reviewCard}
              tone="elevated"
            >
              <Text style={styles.eyebrow}>My flashcard</Text>
              <Text style={styles.reviewMeta}>
                {currentCardIndex + 1} / {items.length}
              </Text>
              <Text style={styles.reviewTerm}>{currentCard.prompt}</Text>
              <Text
                accessibilityElementsHidden={
                  isAnswerRevealed ? undefined : true
                }
                importantForAccessibility={
                  isAnswerRevealed ? "auto" : "no-hide-descendants"
                }
                style={[
                  styles.reviewAnswer,
                  isAnswerRevealed ? styles.reviewAnswerRevealed : null,
                ]}
              >
                {currentCard.answer}
              </Text>
            </Card>

            <View style={styles.reviewActions}>
              <Button
                accessibilityState={{ selected: isAnswerRevealed }}
                onPress={() => {
                  if (!currentCardKey) {
                    return;
                  }

                  setRevealedCardKey((cardKey) =>
                    cardKey === currentCardKey ? null : currentCardKey,
                  );
                }}
                style={styles.reviewActionButton}
                variant="secondary"
              >
                {isAnswerRevealed ? "정답 가리기" : "정답 보기"}
              </Button>
              <Button
                onPress={handleNextReviewCard}
                style={styles.reviewActionButton}
                variant="primary"
              >
                다음
              </Button>
            </View>
          </>
        ) : (
          <MobileStatePanel
            message={vocabularyState.message}
            state={panelState === "list" ? "empty" : panelState}
            type="review"
          />
        )}
      </View>
    </ScrollView>
  );
}
