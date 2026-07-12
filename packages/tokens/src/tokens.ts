const color = {
  canvas: "#f1f1ed",
  surface: "#ffffff",
  surfaceMuted: "#f7f7f4",
  soft: "#f7f7f4",
  sidebar: "#e9e9e4",
  sidebarActive: "#d9d9d2",
  ink: "#20201d",
  inkMuted: "#696962",
  muted: "#696962",
  border: "#e7e7e2",
  line: "#e7e7e2",
  primary: "#26365f",
  primaryInk: "#ffffff",
  accent: "#bf352d",
  blue: "#26365f",
  red: "#bf352d",
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

const typography = {
  text: {
    size: {
      xs: "12px",
      sm: "14px",
      md: "16px",
      lg: "18px",
      xl: "22px",
    },
    lineHeight: {
      xs: "17px",
      sm: "21px",
      md: "26px",
      lg: "28px",
      xl: "32px",
    },
    weight: {
      regular: 400,
      medium: 600,
      bold: 700,
      heavy: 800,
    },
  },
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
    send: {
      background: color.primary,
      foreground: color.primaryInk,
    },
    size: {
      sm: {
        height: "32px",
        paddingX: spacing.md,
      },
      md: {
        height: "40px",
        paddingX: spacing.lg,
      },
      icon: {
        height: "38px",
        paddingX: "0px",
        radius: radius.pill,
        width: "38px",
      },
    },
  },
  chip: {
    background: "#f6f8ff",
    border: "#d8d8d2",
    foreground: color.primary,
    gap: "6px",
    minHeight: "31px",
    paddingX: "10px",
    paddingY: "7px",
    prefix: color.primary,
    radius: "7px",
  },
  reviewCard: {
    answer: {
      background: "#f6f8ff",
      border: "#d5dbea",
      foreground: color.inkMuted,
      padding: "14px",
      radius: "7px",
    },
  },
} as const;

export const tokens = {
  color,
  radius,
  shadow,
  spacing,
  typography,
  component,
} as const;
