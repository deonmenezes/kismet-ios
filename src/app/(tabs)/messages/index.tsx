import { FlatList, Pressable, RefreshControl, Text, View } from "react-native";
import { router } from "expo-router";
import Animated, { FadeInDown } from "react-native-reanimated";
import { PersonPhoto } from "@/components/person-photo";
import { Button, EmptyState, ErrorBanner, StateView } from "@/components/ui";
import { useInbox, usePullRefresh, useRefetchOnFocus } from "@/lib/queries";
import type { Conversation } from "@/lib/types";
import { GUTTER, serif, useColors } from "@/theme/colors";

const when = (iso: string) => {
  const d = new Date(iso);
  const today = new Date().toDateString() === d.toDateString();
  return today ? d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }) : d.toLocaleDateString([], { day: "numeric", month: "short" });
};

export default function MessagesInbox() {
  const c = useColors();
  const inbox = useInbox();
  const pull = usePullRefresh(inbox.refetch);
  useRefetchOnFocus(inbox.refetch);

  if (!inbox.data) {
    if (inbox.error) return <StateView error={inbox.error.message} onRetry={() => inbox.refetch()} />;
    return <StateView loading />;
  }

  return (
    <FlatList
      style={{ flex: 1, backgroundColor: c.bg }}
      contentInsetAdjustmentBehavior="automatic"
      contentContainerStyle={{ paddingHorizontal: GUTTER, paddingBottom: 40 }}
      data={inbox.data.conversations}
      keyExtractor={(x) => x.matchId}
      refreshControl={<RefreshControl refreshing={pull.refreshing} onRefresh={pull.onRefresh} tintColor={c.muted} colors={[c.coral]} />}
      ListHeaderComponent={inbox.error ? <ErrorBanner message={`Couldn't refresh. ${inbox.error.message}`} onRetry={() => inbox.refetch()} /> : undefined}
      renderItem={({ item, index }) => (
        <Animated.View entering={FadeInDown.delay(Math.min(index, 8) * 40)}>
          <Row x={item} />
        </Animated.View>
      )}
      ListEmptyComponent={
        <EmptyState
          title="No conversations yet"
          body="When you and someone both say yes, you can message each other here (or on Telegram). Only matches can message you."
        >
          <Button title="See my matches" onPress={() => router.navigate("/matches")} style={{ alignSelf: "stretch", marginTop: 8 }} />
        </EmptyState>
      }
    />
  );
}

function Row({ x }: { x: Conversation }) {
  const c = useColors();
  const preview = x.lastMessage ? `${x.lastMessage.mine ? "You: " : ""}${x.lastMessage.text}` : "You matched. Say hi";
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Chat with ${x.name}${x.unread ? `, ${x.unread} unread` : ""}`}
      onPress={() => router.push({ pathname: "/messages/[id]", params: { id: x.matchId, name: x.name } })}
      style={({ pressed }) => ({
        flexDirection: "row",
        alignItems: "center",
        gap: 14,
        paddingVertical: 16,
        borderBottomWidth: 1,
        borderColor: c.line,
        opacity: pressed ? 0.6 : 1,
      })}
    >
      <PersonPhoto url={x.photo} name={x.name} size={56} />
      <View style={{ flex: 1, gap: 3 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <Text numberOfLines={1} style={{ flex: 1, color: c.ink, fontFamily: serif.title, fontSize: 20 }}>
            {x.name}
          </Text>
          <Text style={{ color: c.muted, fontSize: 12 }}>{when(x.lastMessage?.createdAt ?? x.matchedAt)}</Text>
        </View>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <Text numberOfLines={1} style={{ flex: 1, color: x.unread ? c.ink : c.muted, fontSize: 15, fontWeight: x.unread ? "600" : "400" }}>
            {preview}
          </Text>
          {x.unread > 0 && (
            <View style={{ minWidth: 22, height: 22, borderRadius: 11, backgroundColor: c.coral, alignItems: "center", justifyContent: "center", paddingHorizontal: 6 }}>
              <Text style={{ color: "#fff", fontSize: 12, fontWeight: "700" }}>{x.unread}</Text>
            </View>
          )}
        </View>
      </View>
    </Pressable>
  );
}
