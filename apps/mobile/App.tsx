import { useState } from "react";
import {
  Pressable,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { MAX_ANALYSIS_TEXT_LENGTH } from "@nado/shared";
import {
  ANALYSIS_INPUT_ACCESSIBILITY_LABEL,
  INITIAL_ANALYSIS_TEXT,
  getAnalysisComposerState,
  mobileTabs,
  shouldShowAnalysisResult,
} from "./src/analysisScreen";

const mobileColors = {
  canvas: "#f1f1ed",
  surface: "#ffffff",
  surfaceMuted: "#f7f7f4",
  sidebar: "#e9e9e4",
  sidebarActive: "#d9d9d2",
  ink: "#20201d",
  inkMuted: "#6f6f68",
  border: "#e7e7e2",
  primary: "#26365f",
  primaryInk: "#ffffff",
} as const;

export default function App() {
  const [text, setText] = useState(INITIAL_ANALYSIS_TEXT);
  const [submittedText, setSubmittedText] = useState<string | null>(null);
  const composerState = getAnalysisComposerState(text);
  const shouldShowResult = shouldShowAnalysisResult(text, submittedText);

  const handleAnalyzePress = () => {
    const trimmedText = text.trim();

    if (trimmedText.length === 0) {
      return;
    }

    setSubmittedText(trimmedText);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" />
      <View style={styles.shell}>
        <View style={styles.topbar}>
          <View style={styles.brandGroup}>
            <Text style={styles.logo}>nado</Text>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ disabled: true }}
            disabled
            style={({ pressed }) => [
              styles.loginButton,
              styles.loginButtonDisabled,
              pressed ? styles.pressed : null,
            ]}
          >
            <Text style={styles.loginButtonText}>Google 로그인</Text>
          </Pressable>
        </View>

        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
        >
          {shouldShowResult ? (
            <View style={styles.resultArea}>
              <Text style={styles.resultTitle}>분석 결과</Text>
              <Text style={styles.emptyText}>
                자연스러운 번역, 번역 포인트, 문장별 분석이 이곳에 표시됩니다.
              </Text>
            </View>
          ) : null}
        </ScrollView>

        <View style={styles.bottomArea}>
          <View style={styles.composer}>
            {composerState.helperText ? (
              <Text style={styles.helperText}>{composerState.helperText}</Text>
            ) : null}
            <TextInput
              accessibilityLabel={ANALYSIS_INPUT_ACCESSIBILITY_LABEL}
              multiline
              maxLength={MAX_ANALYSIS_TEXT_LENGTH}
              onChangeText={setText}
              placeholder={composerState.placeholderText}
              placeholderTextColor={mobileColors.inkMuted}
              style={styles.input}
              textAlignVertical="top"
              value={text}
            />
            <View style={styles.composerFooter}>
              <Text style={styles.count}>{composerState.countLabel}</Text>
              <Pressable
                accessibilityRole="button"
                disabled={composerState.isSubmitDisabled}
                onPress={handleAnalyzePress}
                style={({ pressed }) => [
                  styles.analyzeButton,
                  composerState.isSubmitDisabled
                    ? styles.analyzeButtonDisabled
                    : null,
                  pressed && !composerState.isSubmitDisabled
                    ? styles.pressed
                    : null,
                ]}
              >
                <Text
                  style={[
                    styles.analyzeButtonText,
                    composerState.isSubmitDisabled
                      ? styles.analyzeButtonTextDisabled
                      : null,
                  ]}
                >
                  분석
                </Text>
              </Pressable>
            </View>
          </View>

          <View style={styles.tabbar} accessibilityRole="tablist">
            {mobileTabs.map((tab) => {
              const selected = tab.key === "analysis";

              return (
                <Pressable
                  accessibilityRole="tab"
                  accessibilityState={{
                    disabled: tab.disabled,
                    selected,
                  }}
                  disabled={tab.disabled}
                  key={tab.key}
                  style={({ pressed }) => [
                    styles.tabItem,
                    selected ? styles.tabItemActive : null,
                    tab.disabled ? styles.tabItemDisabled : null,
                    pressed ? styles.pressed : null,
                  ]}
                >
                  <Text
                    style={[
                      styles.tabText,
                      selected ? styles.tabTextActive : null,
                      tab.disabled ? styles.tabTextDisabled : null,
                    ]}
                  >
                    {tab.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  analyzeButton: {
    alignItems: "center",
    backgroundColor: mobileColors.primary,
    borderRadius: 8,
    minHeight: 42,
    minWidth: 74,
    paddingHorizontal: 18,
    paddingVertical: 10,
  },
  analyzeButtonDisabled: {
    backgroundColor: mobileColors.sidebarActive,
  },
  analyzeButtonText: {
    color: mobileColors.primaryInk,
    fontSize: 15,
    fontWeight: "800",
  },
  analyzeButtonTextDisabled: {
    color: mobileColors.inkMuted,
  },
  bottomArea: {
    backgroundColor: mobileColors.canvas,
    borderTopColor: mobileColors.border,
    borderTopWidth: 1,
    gap: 10,
    paddingHorizontal: 14,
    paddingTop: 12,
  },
  brandGroup: {
    gap: 2,
  },
  composer: {
    backgroundColor: mobileColors.surface,
    borderColor: mobileColors.border,
    borderRadius: 18,
    borderWidth: 1,
    gap: 10,
    padding: 14,
    shadowColor: mobileColors.ink,
    shadowOffset: { height: 8, width: 0 },
    shadowOpacity: 0.08,
    shadowRadius: 18,
  },
  composerFooter: {
    alignItems: "center",
    flexDirection: "row",
    gap: 12,
    justifyContent: "space-between",
  },
  content: {
    gap: 20,
    padding: 20,
    paddingBottom: 28,
  },
  count: {
    color: mobileColors.inkMuted,
    fontSize: 13,
    fontWeight: "700",
  },
  emptyText: {
    color: mobileColors.inkMuted,
    fontSize: 15,
    lineHeight: 23,
  },
  helperText: {
    color: mobileColors.inkMuted,
    fontSize: 12,
    lineHeight: 18,
  },
  input: {
    color: mobileColors.ink,
    fontSize: 15,
    lineHeight: 22,
    minHeight: 74,
    padding: 0,
  },
  loginButton: {
    alignItems: "center",
    backgroundColor: mobileColors.surfaceMuted,
    borderColor: mobileColors.border,
    borderRadius: 8,
    borderWidth: 1,
    minHeight: 36,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  loginButtonDisabled: {
    opacity: 0.64,
  },
  loginButtonText: {
    color: mobileColors.ink,
    fontSize: 13,
    fontWeight: "800",
  },
  logo: {
    color: mobileColors.primary,
    fontSize: 18,
    fontWeight: "900",
  },
  pressed: {
    opacity: 0.72,
  },
  resultArea: {
    backgroundColor: mobileColors.surface,
    borderColor: mobileColors.border,
    borderRadius: 8,
    borderWidth: 1,
    gap: 8,
    minHeight: 280,
    padding: 18,
  },
  resultTitle: {
    color: mobileColors.ink,
    fontSize: 16,
    fontWeight: "800",
  },
  safeArea: {
    backgroundColor: mobileColors.canvas,
    flex: 1,
  },
  shell: {
    flex: 1,
  },
  tabbar: {
    alignItems: "center",
    backgroundColor: mobileColors.surface,
    borderColor: mobileColors.border,
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: "row",
    gap: 4,
    marginBottom: 8,
    minHeight: 54,
    padding: 4,
  },
  tabItem: {
    alignItems: "center",
    borderRadius: 6,
    flex: 1,
    minHeight: 44,
    justifyContent: "center",
  },
  tabItemActive: {
    backgroundColor: mobileColors.sidebar,
  },
  tabItemDisabled: {
    opacity: 0.54,
  },
  tabText: {
    color: mobileColors.inkMuted,
    fontSize: 13,
    fontWeight: "800",
  },
  tabTextActive: {
    color: mobileColors.primary,
  },
  tabTextDisabled: {
    color: mobileColors.inkMuted,
  },
  topbar: {
    alignItems: "center",
    backgroundColor: mobileColors.canvas,
    borderBottomColor: mobileColors.border,
    borderBottomWidth: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
});
