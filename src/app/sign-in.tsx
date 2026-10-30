import { useState } from "react";
import { ScrollView } from "react-native";
import * as Clipboard from "expo-clipboard";
import { Field } from "@/components/quiz-field";
import { Body, Button, ErrorBanner, H1 } from "@/components/ui";
import { api, tokenFromInput } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { useColors } from "@/theme/colors";

export default function SignIn() {
  const c = useColors();
  const { signIn } = useAuth();
  const [value, setValue] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit(input = value) {
    const token = tokenFromInput(input);
    if (!token) {
      setError("That doesn't look like a private link. It ends in /u/ followed by a long code.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      await api("/api/me?full=1", { token });
      await signIn(token);
    } catch (e) {
      setError(
        e instanceof Error && "status" in e && e.status === 401
          ? "That link doesn't work any more. The account may have been deleted. Take the quiz to sign up again."
          : e instanceof Error
            ? e.message
            : "Something went wrong.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: c.bg }}
      contentInsetAdjustmentBehavior="automatic"
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={{ padding: 20, gap: 14 }}
    >
      <H1>Welcome back</H1>
      <Body muted>
        Paste the private link you got when you signed up (it ends in /u/ and a long code). Your agent can also give it to you.
      </Body>
      <Field
        testID="sign-in-input"
        value={value}
        onChangeText={setValue}
        placeholder="https://kismet-village.vercel.app/u/…"
        autoCapitalize="none"
        autoCorrect={false}
        autoFocus
        onSubmitEditing={() => submit()}
        returnKeyType="go"
      />
      <Button
        variant="ghost"
        title="Paste from clipboard"
        onPress={async () => {
          const s = await Clipboard.getStringAsync().catch(() => "");
          if (s) {
            setValue(s);
            submit(s);
          } else setError("Your clipboard is empty. Copy your private link first.");
        }}
      />
      {error ? <ErrorBanner message={error} /> : null}
      <Button size="lg" title="Sign in" testID="sign-in-submit" busy={busy} disabled={!value.trim()} onPress={() => submit()} />
    </ScrollView>
  );
}
