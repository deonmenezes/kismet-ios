import { Pressable, Text, View } from "react-native";
import { TabList, TabSlot, TabTrigger, Tabs, type TabTriggerSlotProps } from "expo-router/ui";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useInbox, useMe } from "@/lib/queries";
import { useColors } from "@/theme/colors";

// Web build (previews and automated tests): a bottom tab bar drawn in JS.
const TABS = [
  { name: "(home)", href: "/", label: "Intros", emoji: "🌅" },
  { name: "matches", href: "/matches", label: "Matches", emoji: "🤝" },
  { name: "messages", href: "/messages", label: "Messages", emoji: "💬" },
  { name: "board", href: "/board", label: "Board", emoji: "📣" },
  { name: "me", href: "/me", label: "Me", emoji: "🙂" },
] as const;

export default function AppTabs() {
  const c = useColors();
  const insets = useSafeAreaInsets();
  const { data } = useMe();
  const recs = data?.recommendations.length ?? 0;
  const unread = useInbox().data?.unread ?? 0;
  return (
    <Tabs>
      <TabSlot style={{ flex: 1 }} />
      <TabList
        style={{
          flexDirection: "row",
          backgroundColor: c.card,
          borderTopWidth: 1,
          borderTopColor: c.line,
          paddingBottom: Math.max(insets.bottom, 6),
          paddingTop: 6,
        }}
      >
        {TABS.map((t) => (
          <TabTrigger key={t.name} name={t.name} href={t.href} asChild>
            <TabButton label={t.label} emoji={t.emoji} badge={t.name === "(home)" ? recs : t.name === "messages" ? unread : 0} />
          </TabTrigger>
        ))}
      </TabList>
    </Tabs>
  );
}

function TabButton({ label, emoji, badge, isFocused, ref: _ref, ...props }: TabTriggerSlotProps & { label: string; emoji: string; badge: number }) {
  const c = useColors();
  return (
    <Pressable {...props} accessibilityRole="tab" accessibilityLabel={label} style={{ flex: 1, alignItems: "center", gap: 2, paddingVertical: 4 }}>
      <View
        style={{
          paddingHorizontal: 14,
          paddingVertical: 3,
          borderRadius: 999,
          backgroundColor: isFocused ? c.bg2 : "transparent",
        }}
      >
        <Text style={{ fontSize: 20, opacity: isFocused ? 1 : 0.6 }}>{emoji}</Text>
        {badge > 0 && (
          <View
            style={{
              position: "absolute",
              top: -2,
              right: 6,
              minWidth: 18,
              height: 18,
              borderRadius: 9,
              backgroundColor: c.coral,
              alignItems: "center",
              justifyContent: "center",
              paddingHorizontal: 4,
            }}
          >
            <Text style={{ color: "#fff", fontSize: 11, fontWeight: "800" }}>{badge}</Text>
          </View>
        )}
      </View>
      <Text style={{ fontSize: 12, fontWeight: isFocused ? "800" : "600", color: isFocused ? c.coral : c.muted }}>{label}</Text>
    </Pressable>
  );
}
