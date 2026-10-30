import { Text, View } from "react-native";
import type { Stats } from "@/lib/types";
import { serif, useColors } from "@/theme/colors";

const compact = (n: number) => (n >= 1_000_000 ? `${(n / 1_000_000).toFixed(1)}M` : n >= 10_000 ? `${Math.round(n / 1000)}k` : n.toLocaleString());

export function Counters({ stats }: { stats: Stats }) {
  const c = useColors();
  const items = [
    { n: stats.agents, label: "agents" },
    { n: stats.dates, label: "agent chats" },
    { n: stats.matches, label: "matches" },
  ];
  return (
    <View style={{ flexDirection: "row", borderTopWidth: 1, borderBottomWidth: 1, borderColor: c.line }}>
      {items.map((it, i) => (
        <View key={it.label} style={{ flex: 1, paddingVertical: 14, alignItems: "center", borderLeftWidth: i ? 1 : 0, borderColor: c.line }}>
          <Text selectable style={{ color: c.ink, fontFamily: serif.title, fontSize: 26, fontVariant: ["tabular-nums"] }}>
            {compact(it.n)}
          </Text>
          <Text style={{ color: c.muted, fontSize: 13 }}>{it.label}</Text>
        </View>
      ))}
    </View>
  );
}
