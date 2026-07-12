import type { ReactNode } from "react";
import { Pressable, StatusBar, Text, View } from "react-native";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import type { MobileAuthStateStatus } from "../auth/authState";
import type { MobileTabKey } from "../features/analysis/analysisScreen";
import { styles } from "../styles/mobileStyles";

type MobileNavigationTab = {
  disabled: boolean;
  key: MobileTabKey;
  label: string;
};

export function MobileAppShell({
  activeTab,
  authStatus,
  children,
  navigationTabs,
  onAuthPress,
  onSelectTab,
  overlay,
  saveMessage,
}: {
  activeTab: MobileTabKey;
  authStatus: MobileAuthStateStatus;
  children: ReactNode;
  navigationTabs: readonly MobileNavigationTab[];
  onAuthPress(): void;
  onSelectTab(tab: MobileTabKey): void;
  overlay?: ReactNode;
  saveMessage: string | null;
}) {
  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.safeArea}>
        <StatusBar barStyle="dark-content" />
        <View style={styles.shell}>
          <MobileTopbar authStatus={authStatus} onAuthPress={onAuthPress} />
          <View style={styles.screenArea}>{children}</View>
          <MobileTabbar
            activeTab={activeTab}
            navigationTabs={navigationTabs}
            onSelectTab={onSelectTab}
          />
          {saveMessage ? <MobileSaveToast message={saveMessage} /> : null}
          {overlay}
        </View>
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

function MobileTopbar({
  authStatus,
  onAuthPress,
}: {
  authStatus: MobileAuthStateStatus;
  onAuthPress(): void;
}) {
  return (
    <View style={styles.topbar}>
      <View style={styles.brandGroup}>
        <View
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
          style={styles.logoMark}
        >
          <Text style={styles.logoMarkText}>n</Text>
        </View>
        <Text style={styles.logo}>nado</Text>
      </View>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ disabled: authStatus === "loading" }}
        disabled={authStatus === "loading"}
        onPress={onAuthPress}
        style={({ pressed }) => [
          styles.loginButton,
          authStatus === "loading" ? styles.loginButtonDisabled : null,
          pressed ? styles.pressed : null,
        ]}
      >
        <Text style={styles.loginButtonText}>
          {authStatus === "authenticated"
            ? "로그아웃"
            : authStatus === "loading"
              ? "확인 중"
              : "Google 로그인"}
        </Text>
      </Pressable>
    </View>
  );
}

function MobileTabbar({
  activeTab,
  navigationTabs,
  onSelectTab,
}: {
  activeTab: MobileTabKey;
  navigationTabs: readonly MobileNavigationTab[];
  onSelectTab(tab: MobileTabKey): void;
}) {
  return (
    <View style={styles.bottomArea}>
      <View style={styles.tabbar} accessibilityRole="tablist">
        {navigationTabs.map((tab) => {
          const selected = tab.key === activeTab;

          return (
            <Pressable
              accessibilityRole="tab"
              accessibilityState={{ disabled: tab.disabled, selected }}
              disabled={tab.disabled}
              key={tab.key}
              onPress={() => onSelectTab(tab.key)}
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
  );
}

function MobileSaveToast({ message }: { message: string }) {
  return (
    <View pointerEvents="none" style={styles.toastOverlay}>
      <View accessibilityRole="alert" style={styles.toast}>
        <Text style={styles.toastText}>{message}</Text>
      </View>
    </View>
  );
}
