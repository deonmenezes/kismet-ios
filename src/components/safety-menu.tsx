import { Pressable, Text } from "react-native";
import { router } from "expo-router";
import { SymbolView } from "expo-symbols";
import { goneMessage, isGone } from "@/lib/api";
import { appWording } from "@/lib/copy";
import { photoIdFromUrl } from "@/lib/photos";
import { useBlock, useUnmatch } from "@/lib/queries";
import { useColors } from "@/theme/colors";
import { useSheet, useToast } from "./sheet";

export type Person = { dateId: string; name: string; isMatch: boolean; photos?: string[] };

const GONE = "They're no longer on Kismet, so there's no one to block. You won't see them again.";

/** Report / block for anyone the app shows (App Store guideline 1.2). */
export function useSafetyMenu() {
  const sheet = useSheet();
  const toast = useToast();
  const block = useBlock();
  const unmatch = useUnmatch();

  const report = (p: Person, photoReport: boolean) =>
    router.push({
      pathname: "/report",
      params: {
        dateId: p.dateId,
        name: p.name,
        match: p.isMatch ? "1" : "0",
        photos: photoReport ? (p.photos ?? []).map(photoIdFromUrl).join(",") : "",
      },
    });

  const confirmUnmatch = (p: Person) =>
    sheet({
      title: `Unmatch ${p.name}?`,
      message: "The match and your chat close for both of you. They only see \"This chat has ended.\"",
      actions: [
        {
          label: "Unmatch",
          destructive: true,
          onPress: () =>
            unmatch.mutate(p.dateId, {
              onSuccess: () => {
                toast(`Unmatched. The chat with ${p.name} is closed.`);
                if (router.canGoBack()) router.back();
              },
              onError: (e) => toast(e.message),
            }),
        },
      ],
    });

  const confirmBlock = (p: Person) =>
    sheet({
      title: `Block ${p.name}?`,
      message: "You won't see each other on Kismet again. They are not told.",
      actions: [
        {
          label: "Block",
          destructive: true,
          onPress: () =>
            block.mutate(
              { dateId: p.dateId, block: true },
              {
                onSuccess: (r) => toast(r.text ? appWording(r.text) : `Blocked ${p.name}.`),
                onError: (e) => toast(isGone(e) ? goneMessage(e, GONE) : e.message),
              },
            ),
        },
      ],
    });

  return (p: Person) =>
    sheet({
      title: p.name,
      message: "Something off? Reports are reviewed by a human, and the person is blocked for you right away.",
      actions: [
        ...(p.isMatch ? [{ label: `Unmatch ${p.name}`, destructive: true, onPress: () => confirmUnmatch(p) }] : []),
        { label: `Report ${p.name}`, destructive: true, onPress: () => report(p, false) },
        ...(p.photos?.length ? [{ label: "Report a photo", destructive: true, onPress: () => report(p, true) }] : []),
        { label: `Block ${p.name}`, destructive: true, onPress: () => confirmBlock(p) },
      ],
    });
}

export function MoreButton({ onPress, label, light }: { onPress: () => void; label: string; light?: boolean }) {
  const c = useColors();
  const color = light ? "#ffffff" : c.muted;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={8}
      onPress={onPress}
      style={({ pressed }) => ({
        width: 40,
        height: 40,
        borderRadius: 20,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: pressed ? (light ? "rgba(255,255,255,0.25)" : c.bg2) : "transparent",
      })}
    >
      <SymbolView
        name={{ ios: "ellipsis", android: "more_horiz", web: "more_horiz" }}
        tintColor={color}
        size={22}
        fallback={<Text style={{ color, fontSize: 20, fontWeight: "700" }}>•••</Text>}
      />
    </Pressable>
  );
}
