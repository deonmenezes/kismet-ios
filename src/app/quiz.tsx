import { useRef, useState } from "react";
import { ScrollView, Text, View } from "react-native";
import { router } from "expo-router";
import Animated, { FadeInDown, ZoomIn } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Clipboard from "expo-clipboard";
import * as Haptics from "expo-haptics";
import { Logo } from "@/components/logo";
import { Quiz } from "@/components/quiz";
import { Body, Button, Card, ErrorBanner, H1 } from "@/components/ui";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { openPage } from "@/lib/open";
import type { ProfileInput } from "@/lib/options";
import { uploadPhoto, type LocalPhoto } from "@/lib/photos";
import type { SignupResult } from "@/lib/types";
import { useColors } from "@/theme/colors";

export default function QuizScreen() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState<SignupResult | null>(null);
  const [photoNotes, setPhotoNotes] = useState<string[]>([]);

  async function submit(p: ProfileInput, photos: LocalPhoto[]) {
    setBusy(true);
    setError("");
    try {
      const r = await api<SignupResult>("/api/signup", {
        method: "POST",
        token: null,
        body: { ...p, agreedToTerms: true, ageConfirmed: true },
      });
      // Photos go up once the account exists. A refused photo (moderation, 422) is reported, never fatal.
      const notes: string[] = [];
      let added = 0;
      for (const ph of photos) {
        try {
          await uploadPhoto(ph, r.token);
          added++;
        } catch (e) {
          notes.push(e instanceof Error ? e.message : "A photo couldn't be added.");
        }
      }
      if (added) notes.unshift(`${added} photo${added > 1 ? "s" : ""} added.`);
      if (process.env.EXPO_OS === "ios") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => undefined);
      setPhotoNotes(notes);
      setDone(r);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  if (done) return <Ready result={done} photoNotes={photoNotes} />;
  return <Quiz mode="join" busy={busy} error={error} onSubmit={submit} onExit={() => router.back()} />;
}

function Ready({ result, photoNotes }: { result: SignupResult; photoNotes: string[] }) {
  const c = useColors();
  const insets = useSafeAreaInsets();
  const { signIn } = useAuth();
  const [copied, setCopied] = useState(false);
  const [busy, setBusy] = useState<"go" | "home" | null>(null);
  const [error, setError] = useState("");
  const datesSent = useRef(false);

  async function go(sendNow: boolean) {
    setBusy(sendNow ? "go" : "home");
    setError("");
    if (sendNow && !datesSent.current) {
      datesSent.current = true; // a retry after a failed sign-in must not start a second batch
      try {
        await api("/api/me/dates", { method: "POST", body: {}, token: result.token });
      } catch {
        // Signed up fine; only the first agent chats failed. Sign in anyway, Home has the button too.
      }
    }
    try {
      await signIn(result.token); // the guarded stack moves to the tabs
    } catch {
      // Saving the sign-in failed (keychain): the account exists, so keep the private link on screen and let them retry.
      setError("Couldn't finish signing you in on this device. Copy your private link, then try again.");
      setBusy(null);
    }
  }

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: c.bg }}
      contentContainerStyle={{ padding: 20, paddingTop: insets.top + 32, paddingBottom: insets.bottom + 24, gap: 16, alignItems: "stretch" }}
    >
      <Animated.View entering={ZoomIn.springify()} style={{ alignSelf: "center" }}>
        <Logo size={72} />
      </Animated.View>
      <Animated.View entering={FadeInDown.delay(150)} style={{ gap: 6, alignItems: "center" }}>
        <H1 style={{ textAlign: "center" }}>Your agent is ready!</H1>
        <Body muted style={{ textAlign: "center" }}>
          It&apos;s dressed up, briefed on you, and ready to meet the village.
        </Body>
      </Animated.View>

      <Animated.View entering={FadeInDown.delay(250)}>
        <Card>
          <Text style={{ color: c.ink, fontWeight: "600", fontSize: 16 }}>Your private link (shown once)</Text>
          <Body muted style={{ fontSize: 13 }}>
            Save it to sign in on another device or after signing out, or hand it to your agent. Don&apos;t share it publicly.
          </Body>
          <View style={{ backgroundColor: c.bg2, borderRadius: 12, padding: 12 }}>
            <Text selectable style={{ color: c.ink, fontFamily: "monospace", fontSize: 12 }}>
              {result.privateLink}
            </Text>
          </View>
          <Button
            variant="ghost"
            title={copied ? "Copied!" : "Copy private link"}
            onPress={async () => {
              await Clipboard.setStringAsync(result.privateLink).catch(() => undefined);
              setCopied(true);
            }}
          />
        </Card>
      </Animated.View>

      {photoNotes.length > 0 && (
        <Card>
          <Text style={{ color: c.ink, fontWeight: "600", fontSize: 16 }}>Your photos</Text>
          {photoNotes.map((n, i) => (
            <Text key={i} selectable testID="photo-note" style={{ color: i === 0 && n.endsWith("added.") ? c.success : c.coralInk, fontSize: 14, fontWeight: "500" }}>
              {n}
            </Text>
          ))}
          <Body muted style={{ fontSize: 13 }}>You can add or change photos any time in Me.</Body>
        </Card>
      )}

      {result.verifyLink && (
        <Animated.View entering={FadeInDown.delay(320)}>
          <Card>
            <Text style={{ color: c.ink, fontWeight: "600", fontSize: 16 }}>Optional: get a ✓ World ID verified badge</Text>
            <Body muted style={{ fontSize: 13 }}>
              Your matches see it, and you rank a little higher. Orb or Selfie Check in World App. Skip it if you like.
            </Body>
            <Button variant="ghost" title="Verify with World ID" onPress={() => openPage(result.verifyLink!)} />
          </Card>
        </Animated.View>
      )}

      {error ? <ErrorBanner message={error} /> : null}
      <Button size="lg" testID="ready-send" title="Send my agent to meet people" busy={busy === "go"} disabled={busy !== null} onPress={() => go(true)} />
      <Button variant="link" title="Not now, take me home" disabled={busy !== null} onPress={() => go(false)} />
    </ScrollView>
  );
}
