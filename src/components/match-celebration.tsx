import { Modal, Pressable, Text, View } from "react-native";
import { router } from "expo-router";
import Animated, { FadeInDown } from "react-native-reanimated";
import { externalContact } from "@/lib/contact";
import { villageWording } from "@/lib/copy";
import { openLink } from "@/lib/open";
import type { Contact } from "@/lib/types";
import { serif, useColors } from "@/theme/colors";
import { Logo } from "./logo";
import { Button } from "./ui";

/** plan: a weekly drop's date plan, confirmed now that both said yes (POST /api/me/decide "plan"). */
export type MatchInfo = { dateId: string; name: string; telegram: string | null; link: string | null; contact?: Contact; plan?: string };

export function MatchCelebration({ m, onClose }: { m: MatchInfo | null; onClose: () => void }) {
  const c = useColors();
  const ext = m ? externalContact(m) : null;
  // No Telegram or WhatsApp: they're reached by a message in the app.
  const openChat = (p: MatchInfo) => {
    onClose();
    router.push({ pathname: "/messages/[id]", params: { id: p.dateId, name: p.name } });
  };
  return (
    <Modal visible={Boolean(m)} transparent animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      <Pressable onPress={onClose} accessibilityLabel="Close" style={{ flex: 1, backgroundColor: c.scrim, alignItems: "center", justifyContent: "center", padding: 24 }}>
        {m && (
          <Animated.View entering={FadeInDown.duration(300)} style={{ width: "100%", maxWidth: 380 }}>
            <Pressable onPress={() => undefined}>
              <View style={{ backgroundColor: c.bg, borderRadius: 24, borderCurve: "continuous", padding: 28, alignItems: "center", gap: 12 }}>
                <Logo size={56} />
                <Text accessibilityRole="header" style={{ color: c.ink, fontFamily: serif.title, fontSize: 34, lineHeight: 40, textAlign: "center" }}>
                  You&apos;re connected
                </Text>
                <Text style={{ color: c.muted, fontSize: 16, textAlign: "center", lineHeight: 23 }}>
                  You and {m.name} both said yes, and so did your agents.
                </Text>
                {m.plan ? (
                  <Text selectable style={{ color: c.ink, fontSize: 15, textAlign: "center", lineHeight: 22 }}>
                    Your plan: {villageWording(m.plan)}
                  </Text>
                ) : null}
                <View style={{ alignSelf: "stretch", marginTop: 12, gap: 4 }}>
                  {ext ? (
                    <Button size="lg" title={`Message ${m.name} on ${ext.button}`} onPress={() => openLink(ext.url)} />
                  ) : (
                    <Button size="lg" title={`Message ${m.name}`} onPress={() => openChat(m)} />
                  )}
                  <Button variant="link" title="Keep going" onPress={onClose} />
                </View>
              </View>
            </Pressable>
          </Animated.View>
        )}
      </Pressable>
    </Modal>
  );
}
