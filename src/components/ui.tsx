import type { ReactNode } from "react";
import { ActivityIndicator, Pressable, Text, View, type StyleProp, type TextStyle, type ViewStyle } from "react-native";
import { serif, useColors } from "@/theme/colors";

type ButtonProps = {
  title: string;
  onPress: () => void;
  variant?: "primary" | "ghost" | "danger" | "dark" | "link";
  disabled?: boolean;
  busy?: boolean;
  style?: StyleProp<ViewStyle>;
  testID?: string;
  accessibilityLabel?: string;
  size?: "md" | "lg";
};

export function Button({ title, onPress, variant = "primary", disabled, busy, style, testID, accessibilityLabel, size = "md" }: ButtonProps) {
  const c = useColors();
  const off = disabled || busy;
  const link = variant === "link";
  const textColor = variant === "primary" || variant === "danger" ? c.onAccent : variant === "dark" ? c.onInk : link ? c.ink : c.ink;
  const bg = variant === "primary" ? c.coral : variant === "danger" ? c.coralInk : variant === "dark" ? c.ink : link ? "transparent" : c.card;
  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? title}
      accessibilityState={{ disabled: Boolean(off), busy: Boolean(busy) }}
      disabled={off}
      onPress={onPress}
      style={({ pressed }) => [
        {
          minHeight: link ? 44 : size === "lg" ? 56 : 48,
          borderRadius: 999,
          paddingHorizontal: link ? 8 : 22,
          justifyContent: "center",
          backgroundColor: bg,
          borderWidth: variant === "ghost" ? 1 : 0,
          borderColor: c.lineStrong,
          opacity: off ? 0.45 : pressed ? 0.85 : 1,
        },
        style,
      ]}
    >
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 }}>
        {busy && <ActivityIndicator color={textColor} size="small" />}
        <Text
          numberOfLines={1}
          style={{
            color: textColor,
            fontWeight: "600",
            fontSize: size === "lg" ? 17 : 16,
            textAlign: "center",
            textDecorationLine: link ? "underline" : "none",
          }}
        >
          {title}
        </Text>
      </View>
    </Pressable>
  );
}

/** Selectable chip: hairline outline, plum fill when on. */
export function Chip({ label, on, onPress, small }: { label: string; on: boolean; onPress?: () => void; small?: boolean }) {
  const c = useColors();
  const body = (
    <View
      style={{
        minHeight: small ? 30 : 44,
        paddingHorizontal: small ? 12 : 18,
        borderRadius: 999,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: on ? c.ink : "transparent",
        borderWidth: 1,
        borderColor: on ? c.ink : c.lineStrong,
      }}
    >
      <Text style={{ color: on ? c.onInk : c.ink, fontWeight: "500", fontSize: small ? 13 : 15 }}>{label}</Text>
    </View>
  );
  if (!onPress) return body;
  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityState={{ checked: on }}
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
    >
      {body}
    </Pressable>
  );
}

/** Quiet outline chip for interests. */
export function Tag({ label }: { label: string }) {
  const c = useColors();
  return (
    <View style={{ borderWidth: 1, borderColor: c.lineStrong, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 5 }}>
      <Text style={{ color: c.ink, fontSize: 13 }}>{label}</Text>
    </View>
  );
}

export function Card({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  const c = useColors();
  return (
    <View
      style={[
        { backgroundColor: c.card, borderRadius: 20, borderCurve: "continuous", borderWidth: 1, borderColor: c.line, padding: 20, gap: 8 },
        style,
      ]}
    >
      {children}
    </View>
  );
}

/** A Hinge-style prompt card: a small grey label and the answer in large serif. */
export function PromptCard({ label, children, testID }: { label: string; children: ReactNode; testID?: string }) {
  const c = useColors();
  return (
    <Card style={{ paddingVertical: 22, gap: 10 }}>
      <Text style={{ color: c.muted, fontSize: 13, fontWeight: "500" }}>{label}</Text>
      {typeof children === "string" ? (
        <Text testID={testID} selectable style={{ color: c.ink, fontFamily: serif.text, fontSize: 22, lineHeight: 29 }}>
          {children}
        </Text>
      ) : (
        children
      )}
    </Card>
  );
}

export function Verified() {
  const c = useColors();
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }} accessibilityLabel="World ID verified">
      <Text style={{ color: c.success, fontSize: 13, fontWeight: "600" }}>✓ Verified</Text>
    </View>
  );
}

/** Small grey section label. */
export function Eyebrow({ children, color }: { children: ReactNode; color?: string }) {
  const c = useColors();
  return <Text style={{ color: color ?? c.muted, fontSize: 12, fontWeight: "600", letterSpacing: 1, textTransform: "uppercase" }}>{children}</Text>;
}

export function H1({ children, style }: { children: ReactNode; style?: StyleProp<TextStyle> }) {
  const c = useColors();
  return <Text style={[{ color: c.ink, fontFamily: serif.title, fontSize: 34, lineHeight: 40, letterSpacing: -0.3 }, style]}>{children}</Text>;
}

export function H2({ children, style }: { children: ReactNode; style?: StyleProp<TextStyle> }) {
  const c = useColors();
  return <Text style={[{ color: c.ink, fontFamily: serif.title, fontSize: 22, lineHeight: 28 }, style]}>{children}</Text>;
}

export function Body({ children, muted, style, selectable }: { children: ReactNode; muted?: boolean; style?: StyleProp<TextStyle>; selectable?: boolean }) {
  const c = useColors();
  return (
    <Text selectable={selectable} style={[{ color: muted ? c.muted : c.ink, fontSize: 15, lineHeight: 22 }, style]}>
      {children}
    </Text>
  );
}

export function ErrorBanner({ message, onRetry }: { message: string; onRetry?: () => void }) {
  const c = useColors();
  return (
    <View
      accessibilityRole="alert"
      style={{ borderWidth: 1, borderColor: c.lineStrong, borderRadius: 14, padding: 12, gap: 6, flexDirection: "row", alignItems: "center", backgroundColor: c.card }}
    >
      <Text selectable style={{ flex: 1, color: c.coralInk, fontWeight: "500", fontSize: 14 }}>
        {message}
      </Text>
      {onRetry && (
        <Pressable accessibilityRole="button" onPress={onRetry} hitSlop={10}>
          <Text style={{ color: c.ink, fontWeight: "600", textDecorationLine: "underline" }}>Retry</Text>
        </Pressable>
      )}
    </View>
  );
}

/** Full-screen loading / error state for a first load. */
export function StateView({ loading, error, onRetry }: { loading?: boolean; error?: string; onRetry?: () => void }) {
  const c = useColors();
  return (
    <View style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: 32, gap: 16, backgroundColor: c.bg }}>
      {loading ? (
        <ActivityIndicator color={c.muted} size="large" />
      ) : (
        <>
          <H2 style={{ textAlign: "center" }}>Something went wrong</H2>
          <Text selectable style={{ color: c.muted, fontSize: 15, textAlign: "center", lineHeight: 21 }}>
            {error}
          </Text>
          {onRetry && <Button title="Try again" onPress={onRetry} style={{ alignSelf: "stretch" }} />}
        </>
      )}
    </View>
  );
}

export function EmptyState({ title, body, children }: { title: string; body: string; children?: ReactNode }) {
  const c = useColors();
  return (
    <View style={{ paddingVertical: 40, paddingHorizontal: 8, alignItems: "center", gap: 10 }}>
      <H2 style={{ textAlign: "center", fontSize: 26, lineHeight: 32 }}>{title}</H2>
      <Text style={{ color: c.muted, fontSize: 15, lineHeight: 22, textAlign: "center", maxWidth: 340 }}>{body}</Text>
      {children}
    </View>
  );
}

/** A hairline-separated list group (settings style). */
export function Group({ title, children }: { title?: string; children: ReactNode }) {
  const c = useColors();
  return (
    <View style={{ gap: 8 }}>
      {title ? <Eyebrow>{title}</Eyebrow> : null}
      <View style={{ borderTopWidth: 1, borderColor: c.line }}>{children}</View>
    </View>
  );
}
