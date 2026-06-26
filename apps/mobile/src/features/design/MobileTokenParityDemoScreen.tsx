import { Button, Stack, Text } from "@nado/ui/native";
import { View } from "react-native";
import { styles } from "../../styles/mobileStyles";
import { getMobileTokenParityDemoSections } from "./designTokenDemo";

const mobileTokenParityDemoSections = getMobileTokenParityDemoSections();

export function MobileTokenParityDemoScreen() {
  return (
    <Stack style={styles.pageStack}>
      <Stack gap="xs" style={styles.pageTitleGroup}>
        <Text style={styles.eyebrow}>Design tokens</Text>
        <Text style={styles.pageTitle}>모바일 디자인 데모</Text>
        <Text style={styles.pageDescription}>
          `@nado/tokens` 변경이 React Native 화면에 반영되는지 확인해요.
        </Text>
      </Stack>

      {mobileTokenParityDemoSections.map((section) => (
        <Stack
          accessibilityLabel={
            section.title === "Primary color" ? "모바일 토큰 데모" : undefined
          }
          key={section.title}
          style={styles.designDemoSurface}
        >
          <Stack gap="xs" style={styles.sectionTitleGroup}>
            <Text style={styles.sectionTitle}>{section.title}</Text>
            <Text style={styles.panelText}>{section.description}</Text>
          </Stack>

          {section.title === "Primary color" ? (
            <Stack
              direction="horizontal"
              gap="sm"
              style={styles.designDemoSwatchRow}
            >
              <View style={styles.designDemoPrimarySwatch} />
              <View style={styles.designDemoSurfaceSwatch} />
            </Stack>
          ) : (
            <Stack
              direction="horizontal"
              gap="sm"
              style={styles.designDemoButtonRow}
            >
              <Button variant="primary">Primary</Button>
              <Button variant="secondary">Secondary</Button>
              <Button
                accessibilityLabel="Send icon token sample"
                size="icon"
                variant="send"
              >
                ↗
              </Button>
            </Stack>
          )}

          <Stack
            direction="horizontal"
            gap="xs"
            style={styles.designDemoTokenSourceList}
          >
            {section.tokenSources.map((tokenSource) => (
              <View key={tokenSource} style={styles.designDemoTokenSource}>
                <Text style={styles.designDemoTokenSourceText}>
                  {tokenSource}
                </Text>
              </View>
            ))}
          </Stack>
        </Stack>
      ))}
    </Stack>
  );
}
