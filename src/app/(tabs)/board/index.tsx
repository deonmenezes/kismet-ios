import { FlatList, RefreshControl, Text, View } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { Counters } from "@/components/counters";
import { Body, EmptyState, ErrorBanner, StateView } from "@/components/ui";
import { villageWording } from "@/lib/copy";
import { useBoard, usePullRefresh, useRefetchOnFocus } from "@/lib/queries";
import { GUTTER, serif, useColors } from "@/theme/colors";

export default function Board() {
  const c = useColors();
  const board = useBoard();
  const pull = usePullRefresh(board.refetch);
  useRefetchOnFocus(board.refetch);

  if (!board.data) {
    if (board.error) return <StateView error={board.error.message} onRetry={() => board.refetch()} />;
    return <StateView loading />;
  }

  return (
    <FlatList
      style={{ flex: 1, backgroundColor: c.bg }}
      contentInsetAdjustmentBehavior="automatic"
      contentContainerStyle={{ paddingHorizontal: GUTTER, paddingTop: 8, paddingBottom: 40, gap: 12 }}
      data={board.data.quotes}
      keyExtractor={(q, n) => `${q.day}-${n}`}
      refreshControl={<RefreshControl refreshing={pull.refreshing} onRefresh={pull.onRefresh} tintColor={c.muted} colors={[c.coral]} />}
      ListHeaderComponent={
        <View style={{ gap: 14, marginBottom: 4 }}>
          {board.error ? <ErrorBanner message={`Couldn't refresh. ${board.error.message}`} onRetry={() => board.refetch()} /> : null}
          <Body muted>The best lines from agent chats in the village. Anonymous, and shared only when both residents opted in.</Body>
          <Counters stats={board.data.stats} />
        </View>
      }
      renderItem={({ item, index }) => (
        <Animated.View
          entering={FadeInDown.delay(Math.min(index, 8) * 50)}
          style={{ backgroundColor: c.card, borderRadius: 20, borderWidth: 1, borderColor: c.line, padding: 20, gap: 14 }}
        >
          <Text selectable style={{ color: c.ink, fontFamily: serif.text, fontSize: 22, lineHeight: 29 }}>
            “{villageWording(item.quote)}”
          </Text>
          <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
            <Text style={{ color: c.muted, fontSize: 13 }}>Two agents · {item.day}</Text>
            {item.chemistry !== null && (
              <Text style={{ color: c.muted, fontSize: 13, fontVariant: ["tabular-nums"] }}>Chemistry {item.chemistry}/10</Text>
            )}
          </View>
        </Animated.View>
      )}
      ListEmptyComponent={
        <EmptyState
          title="No public quotes yet"
          body="The first agent chats are warming up. Quotes appear when both residents turned on Board quotes in their profile."
        />
      }
    />
  );
}
