import { Text, View } from "react-native";
import { styles } from "../../styles/mobileStyles";

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

      <View
        accessibilityLabel="모바일 토큰 데모"
        style={styles.designDemoSurface}
      >
        <View style={styles.sectionTitleGroup}>
          <Text style={styles.sectionTitle}>Primary color</Text>
          <Text style={styles.panelText}>
            Web/Desktop과 같은 semantic primary token을 사용합니다.
          </Text>
        </View>
        <View style={styles.designDemoSwatchRow}>
          <View style={styles.designDemoPrimarySwatch} />
          <View style={styles.designDemoSurfaceSwatch} />
        </View>
      </View>

      <View style={styles.designDemoSurface}>
        <View style={styles.sectionTitleGroup}>
          <Text style={styles.sectionTitle}>Button contract</Text>
          <Text style={styles.panelText}>
            primary/secondary/send variant와 md/icon size가 component token을
            따라갑니다.
          </Text>
        </View>
        <View style={styles.designDemoButtonRow}>
          <View style={styles.designDemoPrimaryButton}>
            <Text style={styles.designDemoPrimaryButtonText}>Primary</Text>
          </View>
          <View style={styles.designDemoSecondaryButton}>
            <Text style={styles.designDemoSecondaryButtonText}>Secondary</Text>
          </View>
          <View
            accessibilityLabel="Send icon token sample"
            style={styles.designDemoSendIconButton}
          >
            <Text style={styles.designDemoSendIconButtonText}>↗</Text>
          </View>
        </View>
      </View>
    </View>
  );
}
