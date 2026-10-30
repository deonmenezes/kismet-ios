import { serif, useColors } from "@/theme/colors";

/** Header look shared by every tab's stack: the page background and a bold inline title. Large titles are off: with
 * native tabs on iOS 26 they render blank on every tab except the first one shown. */
export function useStackOptions() {
  const c = useColors();
  return {
    headerLargeTitleEnabled: false,
    headerShadowVisible: false,
    headerLargeTitleShadowVisible: false,
    headerStyle: { backgroundColor: c.bg },
    headerLargeStyle: { backgroundColor: c.bg },
    headerTitleStyle: { color: c.ink, fontFamily: serif.title, fontSize: 19 },
    headerLargeTitleStyle: { color: c.ink, fontFamily: serif.title },
    headerTintColor: c.ink,
    headerBackButtonDisplayMode: "minimal" as const,
    contentStyle: { backgroundColor: c.bg },
  };
}
