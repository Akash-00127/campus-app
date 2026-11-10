export const authColors = {
  background: "#F6F9EE",
  surface: "rgba(255,255,255,0.82)",
  input: "rgba(255,255,255,0.80)",
  inputBorder: "#E2EBD7",
  inputActive: "#7C3AED",
  text: "#1E1B4B",
  secondary: "#475569",
  muted: "#8592A6",
  amber: "#D97706",
  link: "#3B82F6",
  toggle: "#E4ECDB",
  error: "#B42318",
  errorBackground: "#FFF0F0",
  errorBorder: "#F5C2C7",
  success: "#247B55",
  successBackground: "#ECFDF3",
  successBorder: "#86EFAC",
} as const;

export const authFonts = {
  regular: "Inter_400Regular",
  medium: "Inter_500Medium",
  semi: "PlusJakartaSans_600SemiBold",
  bold: "PlusJakartaSans_700Bold",
  extra: "PlusJakartaSans_800ExtraBold",
} as const;

export const authGradients = {
  toggle: ["#7E8BEE", "#FF9F64"] as const,
  cta: ["#FF9752", "#A855F7"] as const,
} as const;
