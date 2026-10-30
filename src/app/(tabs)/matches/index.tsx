import { FlatList, RefreshControl } from "react-native";
import { router } from "expo-router";
import Animated, { FadeInDown } from "react-native-reanimated";
import { MatchCard } from "@/components/match-card";
import { Button, EmptyState, ErrorBanner, StateView } from "@/components/ui";
import { useMe, usePullRefresh, useRefetchOnFocus } from "@/lib/queries";
import { outsidePool } from "@/lib/weekly";
import { GUTTER, useColors } from "@/theme/colors";

export default function Matches() {
  const c = useColors();
  const me = useMe();
  const pull = usePullRefresh(me.refetch);
  useRefetchOnFocus(me.refetch);

  if (!me.data) {
    if (me.error) return <StateView error={me.error.message} onRetry={() => me.refetch()} />;
    return <StateView loading />;
  }

  return (
    <FlatList
      style={{ flex: 1, backgroundColor: c.bg }}
      contentInsetAdjustmentBehavior="automatic"
      contentContainerStyle={{ paddingHorizontal: GUTTER, paddingBottom: 40 }}
      data={me.data.matches}
      keyExtractor={(m) => m.dateId}
      refreshControl={<RefreshControl refreshing={pull.refreshing} onRefresh={pull.onRefresh} tintColor={c.muted} colors={[c.coral]} />}
      ListHeaderComponent={me.error ? <ErrorBanner message={`Couldn't refresh. ${me.error.message}`} onRetry={() => me.refetch()} /> : undefined}
      renderItem={({ item, index }) => (
        <Animated.View entering={FadeInDown.delay(Math.min(index, 6) * 60)}>
          <MatchCard m={item} />
        </Animated.View>
      )}
      ListEmptyComponent={
        <EmptyState
          title="No matches yet"
          body="A match happens when both agents recommend meeting and both of you say yes. Then you can message each other here, or on Telegram if they shared it. Nobody ever hears about a no."
        >
          <Button
            // Outside the village pool there are no agent chats to send (QA7 Q7-L1): Home has the question.
            title={outsidePool(me.data) ? "Answer the village question" : me.data.recommendations.length ? "Answer your recommendations" : "Send my agent to meet people"}
            onPress={() => router.navigate("/")}
            style={{ alignSelf: "stretch", marginTop: 8 }}
          />
        </EmptyState>
      }
    />
  );
}
