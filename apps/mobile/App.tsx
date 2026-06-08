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
import { getAnalysisComposerState, mobileTabs } from "./src/analysisScreen";

export default function App() {
  const [text, setText] = useState(
    "I was wondering if you could help me with this issue.",
  );
  const composerState = getAnalysisComposerState(text);

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
            style={({ pressed }) => [
              styles.loginButton,
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
          {composerState.hasInput ? (
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
              multiline
              maxLength={MAX_ANALYSIS_TEXT_LENGTH}
              onChangeText={setText}
              placeholder={composerState.placeholderText}
              placeholderTextColor="#7a7a73"
              style={styles.input}
              textAlignVertical="top"
              value={text}
            />
            <View style={styles.composerFooter}>
              <Text style={styles.count}>{composerState.countLabel}</Text>
              <Pressable
                accessibilityRole="button"
                disabled={composerState.isSubmitDisabled}
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
                  accessibilityState={{ selected }}
                  key={tab.key}
                  style={({ pressed }) => [
                    styles.tabItem,
                    selected ? styles.tabItemActive : null,
                    pressed ? styles.pressed : null,
                  ]}
                >
                  <Text
                    style={[
                      styles.tabText,
                      selected ? styles.tabTextActive : null,
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
    backgroundColor: "#26365f",
    borderRadius: 8,
    minHeight: 42,
    minWidth: 74,
    paddingHorizontal: 18,
    paddingVertical: 10,
  },
  analyzeButtonDisabled: {
    backgroundColor: "#d9d9d2",
  },
  analyzeButtonText: {
    color: "#ffffff",
    fontSize: 15,
    fontWeight: "800",
  },
  analyzeButtonTextDisabled: {
    color: "#7a7a73",
  },
  bottomArea: {
    backgroundColor: "#f1f1ed",
    borderTopColor: "#e7e7e2",
    borderTopWidth: 1,
    gap: 10,
    paddingHorizontal: 14,
    paddingTop: 12,
  },
  brandGroup: {
    gap: 2,
  },
  composer: {
    backgroundColor: "#ffffff",
    borderColor: "#e7e7e2",
    borderRadius: 18,
    borderWidth: 1,
    gap: 10,
    padding: 14,
    shadowColor: "#20201d",
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
    color: "#6f6f68",
    fontSize: 13,
    fontWeight: "700",
  },
  emptyText: {
    color: "#6f6f68",
    fontSize: 15,
    lineHeight: 23,
  },
  helperText: {
    color: "#6f6f68",
    fontSize: 12,
    lineHeight: 18,
  },
  input: {
    color: "#20201d",
    fontSize: 15,
    lineHeight: 22,
    minHeight: 74,
    padding: 0,
  },
  loginButton: {
    alignItems: "center",
    backgroundColor: "#f7f7f4",
    borderColor: "#e7e7e2",
    borderRadius: 8,
    borderWidth: 1,
    minHeight: 36,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  loginButtonText: {
    color: "#20201d",
    fontSize: 13,
    fontWeight: "800",
  },
  logo: {
    color: "#26365f",
    fontSize: 18,
    fontWeight: "900",
  },
  pressed: {
    opacity: 0.72,
  },
  resultArea: {
    backgroundColor: "#ffffff",
    borderColor: "#e7e7e2",
    borderRadius: 8,
    borderWidth: 1,
    gap: 8,
    minHeight: 280,
    padding: 18,
  },
  resultTitle: {
    color: "#20201d",
    fontSize: 16,
    fontWeight: "800",
  },
  safeArea: {
    backgroundColor: "#f1f1ed",
    flex: 1,
  },
  shell: {
    flex: 1,
  },
  tabbar: {
    alignItems: "center",
    backgroundColor: "#ffffff",
    borderColor: "#e7e7e2",
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
    backgroundColor: "#e9e9e4",
  },
  tabText: {
    color: "#6f6f68",
    fontSize: 13,
    fontWeight: "800",
  },
  tabTextActive: {
    color: "#26365f",
  },
  topbar: {
    alignItems: "center",
    backgroundColor: "#f1f1ed",
    borderBottomColor: "#e7e7e2",
    borderBottomWidth: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
});
