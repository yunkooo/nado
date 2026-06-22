const color = {
  canvas: "#f1f1ed",
  surface: "#ffffff",
  surfaceMuted: "#f7f7f4",
  soft: "#f7f7f4",
  sidebar: "#e9e9e4",
  sidebarActive: "#d9d9d2",
  ink: "#20201d",
  inkMuted: "#6f6f68",
  muted: "#6f6f68",
  border: "#e7e7e2",
  line: "#e7e7e2",
  primary: "#26365f",
  primaryInk: "#ffffff",
  accent: "#cf3f35",
  blue: "#26365f",
  red: "#cf3f35",
  focus: "#26365f",
} as const;

const radius = {
  sm: "4px",
  md: "8px",
  composer: "18px",
  pill: "999px",
} as const;

const shadow = {
  composer: "0 12px 28px rgba(32, 32, 29, 0.08)",
} as const;

const spacing = {
  xs: "4px",
  sm: "8px",
  md: "12px",
  lg: "16px",
  xl: "24px",
  xxl: "32px",
} as const;

const component = {
  button: {
    radius: radius.md,
    primary: {
      background: color.primary,
      foreground: color.primaryInk,
    },
    secondary: {
      background: color.surfaceMuted,
      border: color.border,
      foreground: color.ink,
    },
    ghost: {
      background: "transparent",
      foreground: color.primary,
    },
    size: {
      sm: {
        height: "32px",
        paddingX: spacing.md,
      },
      md: {
        height: "38px",
        paddingX: spacing.lg,
      },
      icon: {
        height: "38px",
        paddingX: "0px",
        width: "38px",
      },
    },
  },
} as const;

export const tokens = {
  color,
  radius,
  shadow,
  spacing,
  component,
} as const;
