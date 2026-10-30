import { useColorScheme } from "react-native";

// Kismet: calm and editorial. Warm off-white canvas and plum ink; coral is the one accent (primary button, Yes,
// unread). Hairline borders instead of shadows, no gradients. Brand kit: E:/kismet-brand README.md.
const light = {
  bg: "#FFFBF7",
  bg2: "#F6EEE7", // quiet fills: monogram blocks, pressed rows, chips
  card: "#FFFFFF",
  ink: "#1A0F22",
  muted: "#7A6E7C",
  line: "rgba(26, 15, 34, 0.08)",
  lineStrong: "rgba(26, 15, 34, 0.16)",
  coral: "#FF4F6D",
  coralInk: "#D63452", // coral text on light surfaces (contrast)
  onAccent: "#FFFFFF",
  onInk: "#FFF7F0",
  success: "#2F7D5B",
  scrim: "rgba(26, 15, 34, 0.4)",
};

const dark: typeof light = {
  bg: "#1A0F22",
  bg2: "#2A1D33",
  card: "#221629",
  ink: "#FFF7F0",
  muted: "#B9A9B5",
  line: "rgba(255, 247, 240, 0.10)",
  lineStrong: "rgba(255, 247, 240, 0.20)",
  coral: "#FF4F6D",
  coralInk: "#FF7A91",
  onAccent: "#FFFFFF",
  onInk: "#1A0F22",
  success: "#6FCF9F",
  scrim: "rgba(0, 0, 0, 0.6)",
};

export type Palette = typeof light;
export const palettes = { light, dark };

export function useColors(): Palette {
  return useColorScheme() === "dark" ? dark : light;
}

/** Fraunces, bundled with the app (loaded in app/_layout.tsx): names, titles and answers. Body text stays SF Pro. */
export const serif = {
  title: "Fraunces_600SemiBold",
  text: "Fraunces_400Regular",
  italic: "Fraunces_400Regular_Italic",
};

/** Side margin used across screens. */
export const GUTTER = 20;
