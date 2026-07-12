import { Badge, Button, Card, Chip, Stack, Text } from "@nado/ui/native";
import { View } from "react-native";
import { styles } from "../../styles/mobileStyles";
import {
  getMobileTokenParityDemoSections,
  MOBILE_DESIGN_DEMO_BUNDLE_MARKER,
  type MobileTokenParityDemoSection,
} from "./designTokenDemo";

const mobileTokenParityDemoSections = getMobileTokenParityDemoSections();
const handleDemoChipPress = () => undefined;

export function MobileTokenParityDemoScreen() {
  return (
    <Stack style={styles.pageStack} testID={MOBILE_DESIGN_DEMO_BUNDLE_MARKER}>
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

          {renderMobileTokenParityDemoSample(section)}

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

function renderMobileTokenParityDemoSample(
  section: MobileTokenParityDemoSection,
) {
  switch (section.kind) {
    case "color":
      return (
        <Stack
          direction="horizontal"
          gap="sm"
          style={styles.designDemoSwatchRow}
        >
          <View style={styles.designDemoPrimarySwatch} />
          <View style={styles.designDemoSurfaceSwatch} />
        </Stack>
      );
    case "button":
      return (
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
      );
    case "primitive":
      return (
        <Card
          accessibilityLabel="Card Badge Chip token sample"
          padding="md"
          radius="md"
          tone="surface"
        >
          <Stack gap="sm">
            <Stack
              direction="horizontal"
              gap="xs"
              style={styles.designDemoPrimitiveHeader}
            >
              <Badge tone="neutral">neutral</Badge>
              <Badge tone="warning">warning</Badge>
            </Stack>
            <Text size="sm" tone="muted">
              Card surface와 action chip이 같은 native facade에서 렌더링돼요.
            </Text>
            <Chip
              accessibilityLabel="Save setup sample"
              label="setup · 준비"
              onPress={handleDemoChipPress}
              prefix="+ 저장"
            />
          </Stack>
        </Card>
      );
  }
}
