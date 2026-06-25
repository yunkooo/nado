import { Text, View } from "react-native";
import { styles } from "../../styles/mobileStyles";
import { getMobileTokenParityDemoSections } from "./designTokenDemo";

const mobileTokenParityDemoSections = getMobileTokenParityDemoSections();

export function MobileTokenParityDemoScreen() {
  return (
    <View style={styles.pageStack}>
      <View style={styles.pageTitleGroup}>
        <Text style={styles.eyebrow}>Design tokens</Text>
        <Text style={styles.pageTitle}>모바일 디자인 데모</Text>
        <Text style={styles.pageDescription}>
          `@nado/tokens` 변경이 React Native 화면에 반영되는지 확인해요.
        </Text>
      </View>

      {mobileTokenParityDemoSections.map((section) => (
        <View
          accessibilityLabel={
            section.title === "Primary color" ? "모바일 토큰 데모" : undefined
          }
          key={section.title}
          style={styles.designDemoSurface}
        >
          <View style={styles.sectionTitleGroup}>
            <Text style={styles.sectionTitle}>{section.title}</Text>
            <Text style={styles.panelText}>{section.description}</Text>
          </View>

          {section.title === "Primary color" ? (
            <View style={styles.designDemoSwatchRow}>
              <View style={styles.designDemoPrimarySwatch} />
              <View style={styles.designDemoSurfaceSwatch} />
            </View>
          ) : (
            <View style={styles.designDemoButtonRow}>
              <View style={styles.designDemoPrimaryButton}>
                <Text style={styles.designDemoPrimaryButtonText}>Primary</Text>
              </View>
              <View style={styles.designDemoSecondaryButton}>
                <Text style={styles.designDemoSecondaryButtonText}>
                  Secondary
                </Text>
              </View>
              <View
                accessibilityLabel="Send icon token sample"
                style={styles.designDemoSendIconButton}
              >
                <Text style={styles.designDemoSendIconButtonText}>↗</Text>
              </View>
            </View>
          )}

          <View style={styles.designDemoTokenSourceList}>
            {section.tokenSources.map((tokenSource) => (
              <View key={tokenSource} style={styles.designDemoTokenSource}>
                <Text style={styles.designDemoTokenSourceText}>
                  {tokenSource}
                </Text>
              </View>
            ))}
          </View>
        </View>
      ))}
    </View>
  );
}
