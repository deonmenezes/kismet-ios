import { useState } from "react";
import { Text, View, type StyleProp, type ViewStyle } from "react-native";
import { Image } from "expo-image";
import { CLIENT_HEADER } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { serif, useColors } from "@/theme/colors";

const initials = (name: string) =>
  name
    .replace(/\(.*?\)/g, "")
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("") || "?";

/** A serif monogram on a quiet cream block: shown when someone has no photo (or it fails to load). */
export function FallbackAvatar({ name, size, radius, style }: { name: string; size?: number; radius?: number; style?: StyleProp<ViewStyle> }) {
  const c = useColors();
  return (
    <View
      accessible={false}
      style={[
        { alignItems: "center", justifyContent: "center", backgroundColor: c.bg2, borderRadius: radius ?? (size ? size / 2 : 0) },
        size ? { width: size, height: size } : null,
        style,
      ]}
    >
      <Text style={{ color: c.ink, fontFamily: serif.title, fontSize: size ? size * 0.4 : 96 }}>{initials(name)}</Text>
    </View>
  );
}

/**
 * A resident's photo. Photo URLs need the viewer's Bearer token, so the request carries it as a header.
 * Circle avatar when `size` is given; otherwise it fills `style` (cards).
 */
export function PersonPhoto({
  url, name, size, radius, style, accessibilityLabel,
}: { url?: string | null; name: string; size?: number; radius?: number; style?: StyleProp<ViewStyle>; accessibilityLabel?: string }) {
  const { token } = useAuth();
  const [failed, setFailed] = useState(false);
  const shape: StyleProp<ViewStyle> = [{ overflow: "hidden", borderRadius: radius ?? (size ? size / 2 : 0) }, size ? { width: size, height: size } : null, style];
  if (!url || failed || !token) return <FallbackAvatar name={name} size={size} radius={radius} style={style} />;
  return (
    <View style={shape}>
      <Image
        source={{ uri: url, headers: { Authorization: `Bearer ${token}`, ...CLIENT_HEADER } }}
        style={{ width: "100%", height: "100%" }}
        contentFit="cover"
        transition={200}
        cachePolicy="memory-disk"
        recyclingKey={url}
        accessibilityLabel={accessibilityLabel ?? `Photo of ${name}`}
        onError={() => setFailed(true)}
      />
    </View>
  );
}
