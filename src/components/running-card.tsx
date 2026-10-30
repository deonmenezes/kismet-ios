import { useEffect, useState } from "react";
import { Text, View } from "react-native";
import Animated, { Easing, FadeIn, useAnimatedStyle, useSharedValue, withRepeat, withTiming } from "react-native-reanimated";
import { serif, useColors } from "@/theme/colors";

const LINES = [
  "Ordering two virtual coconuts...",
  "Comparing favourite sunset spots...",
  "Asking the big question: beach or pool?",
  "Swapping startup war stories...",
  "Checking if they laugh at its jokes...",
  "Taking notes for you, very discreetly...",
];

/** Quiet status while the agent is out chatting (Home polls every 4 s meanwhile). */
export function RunningCard({ count }: { count: number }) {
  const c = useColors();
  const [n, setN] = useState(0);
  const pulse = useSharedValue(0);

  useEffect(() => {
    pulse.value = withRepeat(withTiming(1, { duration: 1200, easing: Easing.inOut(Easing.quad) }), -1, true);
    const t = setInterval(() => setN((x) => (x + 1) % LINES.length), 2600);
    return () => clearInterval(t);
  }, [pulse]);

  const dot = useAnimatedStyle(() => ({ opacity: 0.35 + pulse.value * 0.65 }));

  return (
    <View
      accessibilityLiveRegion="polite"
      style={{ flexDirection: "row", alignItems: "center", gap: 14, borderWidth: 1, borderColor: c.line, backgroundColor: c.card, borderRadius: 20, padding: 18 }}
    >
      <Animated.View style={[{ width: 10, height: 10, borderRadius: 5, backgroundColor: c.coral }, dot]} />
      <View style={{ flex: 1, gap: 3 }}>
        <Text style={{ color: c.ink, fontFamily: serif.title, fontSize: 19 }}>
          Your agent is in {count} chat{count > 1 ? "s" : ""}
        </Text>
        <Animated.Text key={n} entering={FadeIn.duration(400)} numberOfLines={1} style={{ color: c.muted, fontSize: 14 }}>
          {LINES[n]}
        </Animated.Text>
      </View>
    </View>
  );
}
