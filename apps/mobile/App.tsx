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

export default function App() {
  const [text, setText] = useState(
    "I was wondering if you could help me with this issue.",
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" />
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.header}>
          <Text style={styles.logo}>nado</Text>
          <Text style={styles.title}>영어 문장을 독해 노트로 바꾸기</Text>
          <Text style={styles.description}>
            분석, 단어장, 복습 흐름은 API schema를 공유하되 모바일은 React
            Native 화면으로 구현합니다.
          </Text>
        </View>

        <View style={styles.panel}>
          <Text style={styles.sectionTitle}>분석 입력</Text>
          <TextInput
            multiline
            maxLength={MAX_ANALYSIS_TEXT_LENGTH}
            onChangeText={setText}
            placeholder="영어 문장을 입력하세요."
            style={styles.input}
            value={text}
          />
          <View style={styles.composerFooter}>
            <Text style={styles.count}>
              {text.length} / {MAX_ANALYSIS_TEXT_LENGTH}
            </Text>
            <Pressable
              disabled={text.trim().length === 0}
              style={styles.button}
            >
              <Text style={styles.buttonText}>분석</Text>
            </Pressable>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  button: {
    alignItems: "center",
    backgroundColor: "#2f6f57",
    borderRadius: 8,
    minHeight: 44,
    paddingHorizontal: 18,
    paddingVertical: 10,
  },
  buttonText: {
    color: "#ffffff",
    fontWeight: "700",
  },
  composerFooter: {
    alignItems: "center",
    flexDirection: "row",
    gap: 12,
    justifyContent: "flex-end",
  },
  container: {
    gap: 20,
    padding: 20,
  },
  count: {
    color: "#627268",
  },
  description: {
    color: "#627268",
    fontSize: 15,
    lineHeight: 22,
  },
  header: {
    gap: 8,
  },
  input: {
    borderColor: "#d8ded7",
    borderRadius: 8,
    borderWidth: 1,
    color: "#17201b",
    minHeight: 140,
    padding: 12,
    textAlignVertical: "top",
  },
  logo: {
    color: "#2f6f57",
    fontSize: 18,
    fontWeight: "800",
  },
  panel: {
    backgroundColor: "#ffffff",
    borderColor: "#d8ded7",
    borderRadius: 8,
    borderWidth: 1,
    gap: 12,
    padding: 16,
  },
  safeArea: {
    backgroundColor: "#f7f8f5",
    flex: 1,
  },
  sectionTitle: {
    color: "#17201b",
    fontSize: 16,
    fontWeight: "700",
  },
  title: {
    color: "#17201b",
    fontSize: 28,
    fontWeight: "800",
    lineHeight: 34,
  },
});
