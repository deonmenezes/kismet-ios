import { ScrollView, Text, View } from "react-native";
import { Stack, router, useLocalSearchParams } from "expo-router";
import Animated, { FadeInDown } from "react-native-reanimated";
import { MoreButton, useSafetyMenu } from "@/components/safety-menu";
import { Body, Button, EmptyState, StateView } from "@/components/ui";
import { externalContact } from "@/lib/contact";
import { villageWording } from "@/lib/copy";
import { openLink } from "@/lib/open";
import { useMe } from "@/lib/queries";
import { GUTTER, useColors } from "@/theme/colors";

export default function MatchTranscript() {
  const c = useColors();
  const { id } = useLocalSearchParams<{ id: string }>();
  const me = useMe();
  const safety = useSafetyMenu();

  if (!me.data) {
    if (me.error) return <StateView error={me.error.message} onRetry={() => me.refetch()} />;
    return <StateView loading />;
  }
  const m = me.data.matches.find((x) => x.dateId === id);
  if (!m) {
    return (
      <View style={{ flex: 1, backgroundColor: c.bg, padding: 16, justifyContent: "center" }}>
        <EmptyState title="This match isn't here any more" body="It may have been blocked or the account was deleted.">
          <Button title="Back to matches" onPress={() => router.back()} style={{ alignSelf: "stretch", marginTop: 8 }} />
        </EmptyState>
      </View>
    );
  }

  const ext = externalContact(m);

  return (
    <>
      <Stack.Screen
        options={{
          title: `You & ${m.name}`,
          headerRight: () => <MoreButton label={`Report or block ${m.name}`} onPress={() => safety({ dateId: m.dateId, name: m.name, isMatch: true, photos: m.photos })} />,
        }}
      />
      <ScrollView
        style={{ flex: 1, backgroundColor: c.bg }}
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={{ paddingHorizontal: GUTTER, paddingTop: 8, paddingBottom: 40, gap: 10 }}
      >
        <Body muted style={{ textAlign: "center", fontSize: 13, marginBottom: 6 }}>
          {m.myAgentName} and {m.theirAgentName} in their {m.kind === "romance" ? "romance" : "friendly"} chat. You can read this because you
          both said yes.
        </Body>
        {(m.transcript ?? []).map((t, n) => {
          const mine = t.who === "mine";
          return (
            <Animated.View
              key={n}
              entering={FadeInDown.delay(Math.min(n, 10) * 40)}
              style={{
                alignSelf: mine ? "flex-end" : "flex-start",
                maxWidth: "86%",
                backgroundColor: mine ? c.ink : c.card,
                borderWidth: mine ? 0 : 1,
                borderColor: c.line,
                borderRadius: 20,
                borderBottomRightRadius: mine ? 6 : 20,
                borderBottomLeftRadius: mine ? 20 : 6,
                paddingHorizontal: 14,
                paddingVertical: 10,
                gap: 2,
              }}
            >
              <Text style={{ color: mine ? c.onInk : c.muted, opacity: mine ? 0.7 : 1, fontSize: 12, fontWeight: "600" }}>
                {mine ? m.myAgentName : m.theirAgentName}
              </Text>
              <Text selectable style={{ color: mine ? c.onInk : c.ink, fontSize: 16, lineHeight: 22 }}>
                {villageWording(t.text)}
              </Text>
            </Animated.View>
          );
        })}
        {ext ? (
          <Button title={`Message ${m.name} on ${ext.button}`} onPress={() => openLink(ext.url)} style={{ marginTop: 12 }} />
        ) : (
          <Button
            title={`Message ${m.name}`}
            onPress={() => router.push({ pathname: "/messages/[id]", params: { id: m.dateId, name: m.name } })}
            style={{ marginTop: 12 }}
          />
        )}
      </ScrollView>
    </>
  );
}
