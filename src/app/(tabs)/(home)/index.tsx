import { useState } from "react";
import { Pressable, RefreshControl, ScrollView, Text, View } from "react-native";
import { router } from "expo-router";
import Animated, { FadeIn } from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import { SymbolView } from "expo-symbols";
import { MatchCelebration, type MatchInfo } from "@/components/match-celebration";
import { RecProfile, RecRow } from "@/components/rec-card";
import { RunningCard } from "@/components/running-card";
import { useSafetyMenu } from "@/components/safety-menu";
import { useSheet, useToast } from "@/components/sheet";
import { Body, Button, Card, EmptyState, ErrorBanner, Eyebrow, H2, StateView, Tag, Verified } from "@/components/ui";
import { LINKS } from "@/lib/api";
import { appWording, villageWording } from "@/lib/copy";
import { openPage } from "@/lib/open";
import { useDecide, useEdgeCity, useMe, usePullRefresh, useRefetchOnFocus, useSendOnDates } from "@/lib/queries";
import type { Recommendation } from "@/lib/types";
import { chatsLeftText, datesStartedText, nextDropText, outsidePool, poolAsk } from "@/lib/weekly";
import { GUTTER, serif, useColors } from "@/theme/colors";

const haptic = (kind: "yes" | "no" | "match") => {
  if (process.env.EXPO_OS === "web") return;
  if (kind === "match") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => undefined);
  else Haptics.impactAsync(kind === "yes" ? Haptics.ImpactFeedbackStyle.Medium : Haptics.ImpactFeedbackStyle.Light).catch(() => undefined);
};

export default function Home() {
  const c = useColors();
  const me = useMe();
  const pull = usePullRefresh(me.refetch);
  const send = useSendOnDates();
  const decide = useDecide();
  const edge = useEdgeCity();
  const toast = useToast();
  const sheet = useSheet();
  const safety = useSafetyMenu();
  const [msg, setMsg] = useState("");
  const [focusId, setFocusId] = useState<string | null>(null);
  const [celebrate, setCelebrate] = useState<MatchInfo | null>(null);
  useRefetchOnFocus(me.refetch);

  if (!me.data) {
    if (me.error) return <StateView error={me.error.message} onRetry={() => me.refetch()} />;
    return <StateView loading />;
  }
  const data = me.data;
  const recs = data.recommendations;
  const hero = recs.find((r) => r.dateId === focusId) ?? recs[0];
  const rest = recs.filter((r) => r !== hero);
  const top = data.topPick;
  const outOfDates = data.datesLeftToday === 0;
  // The weekly drop: while it's on, new recommendations are held for it (one person a week, with a meetup plan). Only Edge
  // City members get drops; `weekly` itself is the same for everyone.
  const outside = outsidePool(data);
  const drop = outside ? null : nextDropText(data.weekly);
  // Outside the pool there are no agent chats or drop either: the ask under the question says how to get in (QA7 Q7-L1).
  const ask = appWording(poolAsk(data));

  const sendOnDates = (targetId?: string) => {
    setMsg("");
    send.mutate(targetId, {
      // The server's text is written for chat agents; started agent chats get the app's own wording.
      onSuccess: (r) =>
        setMsg(r.started > 0 ? datesStartedText(r.started, drop) : appWording(r.message || r.text)),
      onError: (e) => setMsg(appWording(e.message)),
    });
  };

  const onDecide = (r: Recommendation, d: "meet" | "pass") => {
    haptic(d === "meet" ? "yes" : "no");
    setFocusId(null);
    decide.mutate(
      { dateId: r.dateId, decision: d },
      {
        onSuccess: (res) => {
          if (res.match && res.matchWith) {
            haptic("match");
            setCelebrate({ ...res.matchWith, dateId: r.dateId, plan: res.plan });
          } else toast(appWording(res.text));
        },
        onError: (e) => toast(appWording(e.message)),
      },
    );
  };

  // Answers are final, so each one is confirmed.
  const confirm = (r: Recommendation, d: "meet" | "pass") =>
    sheet(
      d === "meet"
        ? {
            title: `Say yes to ${r.name}?`,
            message: `Answers are final. ${r.name} only hears about it if they say yes too.`,
            actions: [{ label: "Yes, I'd meet", primary: true, onPress: () => onDecide(r, "meet") }],
          }
        : {
            title: `Pass on ${r.name}?`,
            message: `Answers are final. ${r.name} is never told.`,
            actions: [{ label: "Pass", onPress: () => onDecide(r, "pass") }],
          },
    );

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <ScrollView
        style={{ flex: 1 }}
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={{ paddingHorizontal: GUTTER, paddingTop: 8, paddingBottom: hero ? 150 : 48, gap: 24 }}
        refreshControl={<RefreshControl refreshing={pull.refreshing} onRefresh={pull.onRefresh} tintColor={c.muted} colors={[c.coral]} />}
      >
        {me.error ? <ErrorBanner message={`Couldn't refresh. ${me.error.message}`} onRetry={() => me.refetch()} /> : null}
        {data.edgeCity && !data.edgeCity.member && (
          // Kismet is for village residents only (the API's edgeCity): an account from before (or one that said no) answers here.
          <Card style={{ gap: 10 }}>
            <Text style={{ color: c.ink, fontWeight: "600", fontSize: 17 }}>
              {data.edgeCity.answered ? "Kismet is just for village residents, for now" : "Are you living in the village right now?"}
            </Text>
            <Body muted>
              {data.edgeCity.answered
                ? "You said you aren't living in the village, so your agent is taking a break. Join the waitlist, or tap below if you are here after all."
                : "Kismet is now just for the people living in the village. Until you answer, your agent takes a break."}
            </Body>
            <Button title="Yes, I'm here" busy={edge.isPending} disabled={edge.isPending} onPress={() => edge.mutate(true, { onSuccess: (r) => setMsg(appWording(r.text)), onError: (e) => setMsg(appWording(e.message)) })} />
            {data.edgeCity.answered ? (
              <Button variant="link" title="Join the waitlist" onPress={() => openPage(LINKS.waitlist)} />
            ) : (
              <Button variant="ghost" title="No, I'm not" disabled={edge.isPending} onPress={() => edge.mutate(false, { onSuccess: (r) => setMsg(appWording(r.text)), onError: (e) => setMsg(appWording(e.message)) })} />
            )}
          </Card>
        )}
        {data.running > 0 && <RunningCard count={data.running} />}

        {hero ? (
          <View style={{ gap: 14 }}>
            <Text style={{ color: c.muted, fontSize: 13 }}>
              {[hero.weeklyDrop ? "This week's Kismet" : "", recs.length > 1 ? `${recs.indexOf(hero) + 1} of ${recs.length} from your agent` : "From your agent"]
                .filter(Boolean)
                .join(" · ")}
            </Text>
            <Animated.View key={hero.dateId} entering={FadeIn.duration(250)}>
              <RecProfile r={hero} onMore={() => safety({ dateId: hero.dateId, name: hero.name, isMatch: false, photos: hero.photos })} />
            </Animated.View>
            <Text style={{ color: c.muted, fontSize: 13, textAlign: "center", lineHeight: 19 }}>
              Private: they only hear about it if you both say yes.
            </Text>
          </View>
        ) : top && !top.recommended && top.targetId ? (
          <View style={{ gap: 14 }}>
            <Eyebrow>Your agent wants to meet</Eyebrow>
            <Card style={{ gap: 12 }}>
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
                <View style={{ flex: 1, gap: 4 }}>
                  <Text style={{ color: c.ink, fontFamily: serif.title, fontSize: 30, lineHeight: 36 }}>{top.name}</Text>
                  {top.worldVerified && <Verified />}
                </View>
                <Text style={{ color: c.ink, fontFamily: serif.title, fontSize: 26, fontVariant: ["tabular-nums"] }}>{top.percent}%</Text>
              </View>
              {top.summary ? <Text style={{ color: c.ink, fontFamily: serif.text, fontSize: 20, lineHeight: 27 }}>{villageWording(top.summary)}</Text> : null}
              {top.sharedInterests.length > 0 && (
                <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                  {top.sharedInterests.map((s) => (
                    <Tag key={s} label={s} />
                  ))}
                </View>
              )}
              <Button
                testID="date-top-pick"
                title="Have my agent chat with theirs"
                busy={send.isPending}
                disabled={outOfDates}
                onPress={() => sendOnDates(top.targetId!)}
                style={{ marginTop: 4 }}
              />
              <Text style={{ color: c.muted, fontSize: 13, textAlign: "center" }}>
                They only show up for you if your agent likes them after the chat.
              </Text>
            </Card>
          </View>
        ) : data.running || outside ? null : (
          <EmptyState
            title={drop ? "No Kismet waiting right now" : "No recommendations yet"}
            body={
              drop
                ? `Your agent keeps meeting people. If it likes someone, they arrive as your weekly Kismet: the next one is ${drop}, one person, usually with a meetup plan.`
                : outOfDates
                  ? "Your agent has had all of today's chats. New ones open tomorrow, and new residents join every day."
                  : "Send your agent out to meet the village. When it likes someone, they'll show up here for your yes or no."
            }
          />
        )}

        {rest.length > 0 && (
          <View>
            <Eyebrow>Also recommended</Eyebrow>
            <View style={{ marginTop: 6 }}>
              {rest.map((r) => (
                <RecRow key={r.dateId} r={r} onPress={() => setFocusId(r.dateId)} />
              ))}
            </View>
          </View>
        )}

        <Card style={{ gap: 10 }}>
          {outside ? (
            <Body muted style={{ fontSize: 14 }}>
              {ask}
            </Body>
          ) : (
            <>
              <H2>{recs.length ? "Want more?" : "Send your agent out"}</H2>
              <Body muted style={{ fontSize: 14 }}>
                Your agent chats with residents who share your interests and tells you who it liked
                {drop ? `, as your weekly Kismet (next: ${drop})` : ""}. {chatsLeftText(data)}, up to 3 per tap.
              </Body>
              <Button
                testID="send-dates"
                variant={recs.length ? "ghost" : "primary"}
                title={send.isPending ? "Finding the best people..." : outOfDates ? "Out of agent chats today. Back tomorrow" : "Send my agent to meet people"}
                busy={send.isPending}
                disabled={outOfDates}
                onPress={() => sendOnDates()}
              />
            </>
          )}
          {msg ? (
            <Text selectable style={{ color: c.ink, fontSize: 14, textAlign: "center", lineHeight: 20 }}>
              {msg}
            </Text>
          ) : null}
        </Card>

        {data.worldId.available && !data.worldId.verified && data.worldId.verifyLink && (
          <Card>
            <Text style={{ color: c.ink, fontWeight: "600", fontSize: 16 }}>
              Get verified <Text style={{ color: c.muted, fontWeight: "400", fontSize: 13 }}>(optional)</Text>
            </Text>
            <Body muted style={{ fontSize: 14 }}>
              Verify with World ID (Orb or Selfie Check) for a ✓ badge your matches see, and a small boost when agents pick who to chat with.
            </Body>
            <Button
              variant="ghost"
              title="Verify with World ID"
              onPress={async () => {
                await openPage(data.worldId.verifyLink!);
                me.refetch();
              }}
            />
          </Card>
        )}

        {data.matches.length > 0 && (
          <Pressable
            accessibilityRole="button"
            onPress={() => router.navigate("/matches")}
            style={({ pressed }) => ({ flexDirection: "row", alignItems: "center", paddingVertical: 4, opacity: pressed ? 0.6 : 1 })}
          >
            <View style={{ flex: 1, gap: 2 }}>
              <Text style={{ color: c.ink, fontFamily: serif.title, fontSize: 20 }}>
                {data.matches.length} match{data.matches.length > 1 ? "es" : ""}
              </Text>
              <Text style={{ color: c.muted, fontSize: 14 }}>Say hi before the village ends.</Text>
            </View>
            <Text style={{ color: c.muted, fontSize: 22 }}>›</Text>
          </Pressable>
        )}
      </ScrollView>

      {hero && (
        // The native view's bottom inset includes the tab bar, so the buttons float just above it.
        <SafeAreaView edges={["bottom"]} pointerEvents="box-none" style={{ position: "absolute", left: 0, right: 0, bottom: 0 }}>
          <View pointerEvents="box-none" style={{ flexDirection: "row", justifyContent: "space-between", paddingHorizontal: GUTTER + 4, paddingBottom: 12 }}>
            <RoundButton kind="pass" testID="decide-no" label={`Pass on ${hero.name}`} onPress={() => confirm(hero, "pass")} disabled={decide.isPending} />
            <RoundButton kind="yes" testID="decide-yes" label={`Yes to ${hero.name}`} onPress={() => confirm(hero, "meet")} disabled={decide.isPending} />
          </View>
        </SafeAreaView>
      )}
      <MatchCelebration m={celebrate} onClose={() => setCelebrate(null)} />
    </View>
  );
}

function RoundButton({ kind, label, onPress, disabled, testID }: { kind: "pass" | "yes"; label: string; onPress: () => void; disabled?: boolean; testID?: string }) {
  const c = useColors();
  const yes = kind === "yes";
  const tint = yes ? "#ffffff" : c.ink;
  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={label}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => ({
        width: 64,
        height: 64,
        borderRadius: 32,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: yes ? c.coral : c.card,
        borderWidth: yes ? 0 : 1,
        borderColor: c.lineStrong,
        boxShadow: "0 2px 10px rgba(26,15,34,0.10)",
        opacity: disabled ? 0.5 : 1,
        transform: [{ scale: pressed ? 0.94 : 1 }],
      })}
    >
      <SymbolView
        name={yes ? { ios: "checkmark", android: "check", web: "check" } : { ios: "xmark", android: "close", web: "close" }}
        tintColor={tint}
        size={yes ? 26 : 22}
        weight="semibold"
        fallback={<Text style={{ color: tint, fontSize: 24, fontWeight: "600" }}>{yes ? "♥" : "✕"}</Text>}
      />
    </Pressable>
  );
}
