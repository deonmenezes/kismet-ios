import { ScrollView, Text, View } from "react-native";
import { router } from "expo-router";
import Animated, { FadeIn } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Counters } from "@/components/counters";
import { Wordmark } from "@/components/logo";
import { Body, Button, Eyebrow } from "@/components/ui";
import { LINKS } from "@/lib/api";
import { openPage } from "@/lib/open";
import { useStats } from "@/lib/queries";
import { GUTTER, serif, useColors } from "@/theme/colors";

const STEPS = [
  { title: "Brief your agent", body: "Take the 30-second quiz. Your answers tell your agent who you are and who you'd love to meet." },
  { title: "Agents meet first", body: "Your agent has short chats with other residents' agents, picked by shared interests, and reports back to you." },
  {
    title: "You say who to meet",
    body: "Your agent privately tells you who it recommends and why. Say yes or no. You only hear back if both agents and both of you said yes.",
  },
];

export default function Welcome() {
  const c = useColors();
  const insets = useSafeAreaInsets();
  const stats = useStats();

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: c.bg }}
      contentContainerStyle={{ paddingTop: insets.top + 20, paddingBottom: insets.bottom + 32, paddingHorizontal: GUTTER, gap: 32 }}
    >
      <Animated.View entering={FadeIn.duration(500)} style={{ gap: 28 }}>
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
          <Wordmark height={26} />
          <Text style={{ color: c.muted, fontSize: 13 }}>For pop-up villages</Text>
        </View>
        <View style={{ gap: 14, paddingTop: 24 }}>
          <Text accessibilityRole="header" style={{ color: c.ink, fontFamily: serif.title, fontSize: 38, lineHeight: 44, letterSpacing: -0.5 }}>
            Your agent meets the village.{"\n"}You meet the right people.
          </Text>
          <Text style={{ color: c.muted, fontSize: 17, lineHeight: 25 }}>
            A private AI agent for the residents of your village. It chats with other residents&apos; agents and introduces you to friends,
            collaborators and co-founders. Romance only if you both turn it on.
          </Text>
        </View>
        <View style={{ gap: 6 }}>
          <Button size="lg" title="Get started" testID="get-started" onPress={() => router.push("/quiz")} />
          <Button variant="link" title="I already have a private link" onPress={() => router.push("/sign-in")} />
        </View>
      </Animated.View>

      {stats.data && <Counters stats={stats.data} />}

      <View style={{ gap: 4 }}>
        <Eyebrow>How it works</Eyebrow>
        {STEPS.map((s, i) => (
          <View key={s.title} style={{ flexDirection: "row", gap: 16, paddingVertical: 16, borderBottomWidth: i < STEPS.length - 1 ? 1 : 0, borderColor: c.line }}>
            <Text style={{ color: c.coral, fontFamily: serif.title, fontSize: 22, width: 22 }}>{i + 1}</Text>
            <View style={{ flex: 1, gap: 4 }}>
              <Text style={{ color: c.ink, fontFamily: serif.title, fontSize: 20 }}>{s.title}</Text>
              <Body muted>{s.body}</Body>
            </View>
          </View>
        ))}
      </View>

      <View style={{ gap: 8 }}>
        <Eyebrow>Private by default</Eyebrow>
        <Body muted>
          Matching is secret: you only hear about people your own agent recommends, and only hear back if you both said yes. Your Telegram
          handle is shown only to your matches. Relationship details are never public. 18+ only.
        </Body>
        <View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap" }}>
          <Button variant="link" title="Privacy" onPress={() => openPage(LINKS.privacy)} />
          <Button variant="link" title="Terms" onPress={() => openPage(LINKS.terms)} />
          <Button variant="link" title="Support" onPress={() => openPage(LINKS.support)} />
        </View>
      </View>
    </ScrollView>
  );
}
