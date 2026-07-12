import { StyleSheet } from "react-native";
import {
  mobileColors,
  mobileRadius,
  mobileSpacing,
  mobileTypography,
} from "./mobileTokens";

export const designStyles = StyleSheet.create({
  designDemoButtonRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: mobileSpacing.sm,
  },
  designDemoPrimitiveHeader: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: mobileSpacing.xs,
  },
  designDemoPrimarySwatch: {
    backgroundColor: mobileColors.primary,
    borderRadius: mobileRadius.md,
    flex: 1,
    minHeight: 52,
    minWidth: 120,
  },
  designDemoSurface: {
    backgroundColor: mobileColors.surface,
    borderColor: mobileColors.border,
    borderRadius: mobileRadius.md,
    borderWidth: 1,
    gap: mobileSpacing.md,
    paddingHorizontal: mobileSpacing.lg,
    paddingVertical: mobileSpacing.lg,
  },
  designDemoSurfaceSwatch: {
    backgroundColor: mobileColors.surfaceMuted,
    borderColor: mobileColors.border,
    borderRadius: mobileRadius.md,
    borderWidth: 1,
    flex: 1,
    minHeight: 52,
    minWidth: 120,
  },
  designDemoSwatchRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: mobileSpacing.sm,
  },
  designDemoTokenSource: {
    backgroundColor: mobileColors.surfaceMuted,
    borderColor: mobileColors.border,
    borderRadius: mobileRadius.sm,
    borderWidth: 1,
    maxWidth: "100%",
    minWidth: 0,
    paddingHorizontal: mobileSpacing.sm,
    paddingVertical: mobileSpacing.xs,
  },
  designDemoTokenSourceList: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: mobileSpacing.xs,
  },
  designDemoTokenSourceText: {
    color: mobileColors.inkMuted,
    flexShrink: 1,
    fontSize: 11,
    fontWeight: "700",
    lineHeight: 16,
    minWidth: 0,
  },
  noticePanel: {
    backgroundColor: mobileColors.surfaceMuted,
    borderColor: mobileColors.border,
    borderRadius: mobileRadius.md,
    borderWidth: 1,
    gap: 6,
    paddingHorizontal: mobileSpacing.lg,
    paddingVertical: 14,
  },
  noticeText: {
    color: mobileColors.inkMuted,
    fontSize: mobileTypography.size.sm,
    lineHeight: 22,
  },
  noticeTitle: {
    color: mobileColors.ink,
    fontSize: mobileTypography.size.sm,
    fontWeight: "800",
    lineHeight: 20,
  },
});
