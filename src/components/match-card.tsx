import { Pressable, Text, View } from "react-native";
import { router } from "expo-router";
import { externalContact } from "@/lib/contact";
import { villageWording } from "@/lib/copy";
import { openLink } from "@/lib/open";
import type { Match } from "@/lib/types";
import { planLine } from "@/lib/weekly";
import { serif, useColors } from "@/theme/colors";
import { PersonPhoto } from "./person-photo";
import { MoreButton, useSafetyMenu } from "./safety-menu";
import { Verified } from "./ui";

/** A match as a clean row: tap to message; their Telegram or WhatsApp (if they gave one) and the agents' chat underneath. */
export function MatchCard({ m }: { m: Match }) {
  const c = useColors();
  const safety = useSafetyMenu();
  const ext = externalContact(m);
  const detail = [ext?.label, m.kind === "romance" ? "Romance" : "Friends", m.relationshipStatus, m.openTo].filter(Boolean).join(" · ");
  const openChat = () => router.push({ pathname: "/messages/[id]", params: { id: m.dateId, name: m.name } });
  return (
    <View style={{ paddingVertical: 18, borderBottomWidth: 1, borderColor: c.line, gap: 12 }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 14 }}>
        <Pressable
          testID="open-chat"
          accessibilityRole="button"
          accessibilityLabel={`Message ${m.name}${m.unread ? `, ${m.unread} new` : ""}`}
          onPress={openChat}
          style={({ pressed }) => ({ flex: 1, flexDirection: "row", alignItems: "center", gap: 14, opacity: pressed ? 0.6 : 1 })}
        >
          <PersonPhoto url={m.photos?.[0]} name={m.name} size={60} />
          <View style={{ flex: 1, gap: 3 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <Text numberOfLines={1} style={{ flexShrink: 1, color: c.ink, fontFamily: serif.title, fontSize: 22 }}>
                {m.name}
              </Text>
              {m.unread ? (
                <View style={{ backgroundColor: c.coral, borderRadius: 10, minWidth: 20, height: 20, paddingHorizontal: 6, alignItems: "center", justifyContent: "center" }}>
                  <Text style={{ color: "#fff", fontSize: 12, fontWeight: "700" }}>{m.unread}</Text>
                </View>
              ) : null}
            </View>
            <Text selectable numberOfLines={1} style={{ color: c.muted, fontSize: 14 }}>
              {detail}
            </Text>
            {m.plan ? (
              <Text selectable numberOfLines={2} testID="match-plan" style={{ color: c.ink, fontSize: 14 }}>
                Your plan: {villageWording(planLine(m.plan))}
              </Text>
            ) : null}
            {m.worldVerified && <Verified />}
          </View>
        </Pressable>
        <MoreButton label={`Report or block ${m.name}`} onPress={() => safety({ dateId: m.dateId, name: m.name, isMatch: true, photos: m.photos })} />
      </View>
      <View style={{ flexDirection: "row", gap: 8, paddingLeft: 74 }}>
        {ext && <SmallLink testID="open-contact" title={ext.button} onPress={() => openLink(ext.url)} />}
        {m.transcript && m.transcript.length > 0 && (
          <SmallLink title="Your agents' chat" onPress={() => router.push({ pathname: "/matches/[id]", params: { id: m.dateId } })} />
        )}
      </View>
    </View>
  );
}

function SmallLink({ title, onPress, testID }: { title: string; onPress: () => void; testID?: string }) {
  const c = useColors();
  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => ({
        minHeight: 34,
        paddingHorizontal: 14,
        borderRadius: 999,
        borderWidth: 1,
        borderColor: c.lineStrong,
        justifyContent: "center",
        opacity: pressed ? 0.6 : 1,
      })}
    >
      <Text style={{ color: c.ink, fontSize: 14, fontWeight: "500" }}>{title}</Text>
    </Pressable>
  );
}
