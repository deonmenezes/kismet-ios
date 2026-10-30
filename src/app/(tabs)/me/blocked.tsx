import { FlatList, RefreshControl, Text, View } from "react-native";
import { useSheet, useToast } from "@/components/sheet";
import { Button, EmptyState, ErrorBanner, StateView } from "@/components/ui";
import { goneMessage, isGone } from "@/lib/api";
import { appWording } from "@/lib/copy";
import { useBlock, useBlocks, usePullRefresh, useRefetchOnFocus } from "@/lib/queries";
import { useColors } from "@/theme/colors";

export default function Blocked() {
  const c = useColors();
  const blocks = useBlocks();
  const pull = usePullRefresh(blocks.refetch);
  const block = useBlock();
  const sheet = useSheet();
  const toast = useToast();
  useRefetchOnFocus(blocks.refetch);

  if (!blocks.data) {
    if (blocks.error) return <StateView error={blocks.error.message} onRetry={() => blocks.refetch()} />;
    return <StateView loading />;
  }

  return (
    <FlatList
      style={{ flex: 1, backgroundColor: c.bg }}
      contentInsetAdjustmentBehavior="automatic"
      contentContainerStyle={{ padding: 16, gap: 10, paddingBottom: 40 }}
      data={blocks.data}
      keyExtractor={(b, n) => b.dateId ?? `${b.name}-${n}`}
      refreshControl={<RefreshControl refreshing={pull.refreshing} onRefresh={pull.onRefresh} tintColor={c.coral} colors={[c.coral]} />}
      ListHeaderComponent={blocks.error ? <ErrorBanner message={blocks.error.message} onRetry={() => blocks.refetch()} /> : undefined}
      renderItem={({ item }) => (
        <View
          style={{
            backgroundColor: c.card,
            borderRadius: 20,
            borderWidth: 1,
            borderColor: c.line,
            padding: 14,
            flexDirection: "row",
            alignItems: "center",
            gap: 12,
          }}
        >
          <View style={{ flex: 1, gap: 2 }}>
            <Text style={{ color: c.ink, fontSize: 16, fontWeight: "600" }}>{item.name}</Text>
            <Text style={{ color: c.muted, fontSize: 13 }}>
              {item.reported ? "Reported" : "Blocked"} {new Date(item.blockedAt).toLocaleDateString()}
            </Text>
          </View>
          {item.reported || !item.dateId ? (
            <Text style={{ color: c.muted, fontSize: 12, maxWidth: 120, textAlign: "right" }}>Reported people stay blocked</Text>
          ) : (
            <Button
              variant="ghost"
              title="Unblock"
              onPress={() =>
                sheet({
                  title: `Unblock ${item.name}?`,
                  message: "Your agents may meet again in future chats.",
                  actions: [
                    {
                      label: "Unblock",
                      onPress: () =>
                        block.mutate(
                          { dateId: item.dateId!, block: false },
                          {
                            onSuccess: (r) => toast(r.text ? appWording(r.text) : "Unblocked."),
                            onError: (e) => toast(isGone(e) ? goneMessage(e, "There's no block on this one any more. Nothing to undo.") : e.message),
                          },
                        ),
                    },
                  ],
                })
              }
            />
          )}
        </View>
      )}
      ListEmptyComponent={
        <EmptyState
          title="Nobody blocked"
          body="Block or report anyone from the ••• menu on a recommendation or match. They're never told."
        />
      }
    />
  );
}
