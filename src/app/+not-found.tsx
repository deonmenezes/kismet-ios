import { View } from "react-native";
import { Stack, router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Logo } from "@/components/logo";
import { Button, EmptyState } from "@/components/ui";
import { useColors } from "@/theme/colors";

/** A link Kismet doesn't know (an old or mistyped kismet:// link): say so and go home, never the router's developer screen. */
export default function NotFound() {
  const c = useColors();
  const insets = useSafeAreaInsets();
  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={{ flex: 1, backgroundColor: c.bg, padding: 24, paddingTop: insets.top + 24, justifyContent: "center", alignItems: "center" }}>
        <Logo size={56} />
        <EmptyState title="This page isn't here" body="The link may be old or mistyped. Everything else is where you left it.">
          <Button testID="not-found-home" size="lg" title="Back to Kismet" onPress={() => router.replace("/")} style={{ alignSelf: "stretch", marginTop: 8 }} />
        </EmptyState>
      </View>
    </>
  );
}
