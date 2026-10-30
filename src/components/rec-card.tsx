import { useState } from "react";
import { Pressable, Text, View } from "react-native";
import { villageWording } from "@/lib/copy";
import type { Recommendation } from "@/lib/types";
import { planLine } from "@/lib/weekly";
import { serif, useColors } from "@/theme/colors";
import { FallbackAvatar, PersonPhoto } from "./person-photo";
import { MoreButton } from "./safety-menu";
import { Card, PromptCard, Tag, Verified } from "./ui";

/**
 * A recommendation as a Hinge-style profile: a big 4:5 photo (or a serif monogram), the name, then prompt cards
 * with what this resident's own agent thought. Never the other side's view.
 */
export function RecProfile({ r, onMore }: { r: Recommendation; onMore: () => void }) {
  const c = useColors();
  const photos = r.photos ?? [];
  const [shown, setShown] = useState(0);
  return (
    <View style={{ gap: 14 }}>
      <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 8 }}>
        <View style={{ flex: 1, gap: 4 }}>
          <Text testID="rec-name" style={{ color: c.ink, fontFamily: serif.title, fontSize: 34, lineHeight: 40 }}>
            {r.name}
          </Text>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            <Text style={{ color: c.muted, fontSize: 14 }}>In the village</Text>
            {r.worldVerified && <Verified />}
          </View>
        </View>
        <MoreButton label={`Report or block ${r.name}`} onPress={onMore} />
      </View>

      {photos.length > 0 ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={photos.length > 1 ? `Photo ${shown + 1} of ${photos.length}, tap for the next` : `Photo of ${r.name}`}
          onPress={() => setShown((n) => (n + 1) % photos.length)}
          style={{ aspectRatio: 4 / 5, borderRadius: 18, borderCurve: "continuous", overflow: "hidden" }}
        >
          <PersonPhoto url={photos[shown]} name={r.name} style={{ width: "100%", height: "100%" }} />
          {photos.length > 1 && (
            <View style={{ position: "absolute", top: 10, left: 12, right: 12, flexDirection: "row", gap: 4 }}>
              {photos.map((u, i) => (
                <View key={u} style={{ flex: 1, height: 3, borderRadius: 2, backgroundColor: i === shown ? "#fff" : "rgba(255,255,255,0.45)" }} />
              ))}
            </View>
          )}
        </Pressable>
      ) : (
        <FallbackAvatar name={r.name} radius={18} style={{ aspectRatio: 4 / 5, borderCurve: "continuous" }} />
      )}

      {r.myAgent.reason ? <PromptCard label="Why your agent liked them" testID="rec-why">{villageWording(r.myAgent.reason)}</PromptCard> : null}
      {r.summary ? <PromptCard label="In their words">{villageWording(r.summary)}</PromptCard> : null}
      {r.plan ? (
        // A weekly drop comes with a full meetup plan: it's on if you both say yes.
        <PromptCard label="Proposed plan, if you both say yes">
          <View style={{ gap: 6 }}>
            <Text testID="rec-plan" selectable style={{ color: c.ink, fontFamily: serif.text, fontSize: 22, lineHeight: 29 }}>
              {villageWording(planLine(r.plan))}
            </Text>
            {r.plan.why ? <Text style={{ color: c.muted, fontSize: 14, lineHeight: 20 }}>{villageWording(r.plan.why)}</Text> : null}
          </View>
        </PromptCard>
      ) : r.myAgent.suggestedMeetup ? (
        <PromptCard label="Where you'd meet">{villageWording(r.myAgent.suggestedMeetup)}</PromptCard>
      ) : null}
      {r.sharedInterests.length > 0 && (
        <Card style={{ gap: 12 }}>
          <Text style={{ color: c.muted, fontSize: 13, fontWeight: "500" }}>You both like</Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
            {r.sharedInterests.map((s) => (
              <Tag key={s} label={s} />
            ))}
          </View>
        </Card>
      )}
    </View>
  );
}

/** One row for "Also recommended": avatar, serif name, one line of why. */
export function RecRow({ r, onPress }: { r: Recommendation; onPress: () => void }) {
  const c = useColors();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`See ${r.name}`}
      onPress={onPress}
      style={({ pressed }) => ({
        flexDirection: "row",
        alignItems: "center",
        gap: 14,
        paddingVertical: 14,
        borderBottomWidth: 1,
        borderColor: c.line,
        opacity: pressed ? 0.6 : 1,
      })}
    >
      <PersonPhoto url={r.photos?.[0]} name={r.name} size={52} />
      <View style={{ flex: 1, gap: 2 }}>
        <Text numberOfLines={1} style={{ color: c.ink, fontFamily: serif.title, fontSize: 20 }}>
          {r.name}
        </Text>
        <Text numberOfLines={1} style={{ color: c.muted, fontSize: 14 }}>
          {villageWording(r.myAgent.reason)}
        </Text>
      </View>
      <Text style={{ color: c.muted, fontSize: 20 }}>›</Text>
    </Pressable>
  );
}
