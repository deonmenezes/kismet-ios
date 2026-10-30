import { useCallback, useEffect, useRef, useState } from "react";
import { FlatList, KeyboardAvoidingView, Pressable, Text, TextInput, View } from "react-native";
import { Stack, router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { useQueryClient } from "@tanstack/react-query";
import { useHeaderHeight } from "expo-router/react-navigation";
import { SafeAreaView } from "react-native-safe-area-context";
import { PersonPhoto } from "@/components/person-photo";
import { MoreButton, useSafetyMenu } from "@/components/safety-menu";
import { useToast } from "@/components/sheet";
import { Button, EmptyState, ErrorBanner, StateView } from "@/components/ui";
import { api, ApiError } from "@/lib/api";
import { keys, useMe } from "@/lib/queries";
import type { ChatMessage, MessagesPage } from "@/lib/types";
import { useColors } from "@/theme/colors";

const POLL_MS = 4000;
const ENDED = "This chat has ended.";

export default function Chat() {
  const c = useColors();
  const headerHeight = useHeaderHeight();
  const { id, name: nameParam } = useLocalSearchParams<{ id: string; name?: string }>();
  const me = useMe();
  const qc = useQueryClient();
  const toast = useToast();
  const safety = useSafetyMenu();
  const match = me.data?.matches.find((m) => m.dateId === id);
  const name = match?.name ?? nameParam ?? "your match";

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [ended, setEnded] = useState(false);
  const [error, setError] = useState("");
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const lastId = useRef<string | null>(null);
  const list = useRef<FlatList<ChatMessage>>(null);

  const load = useCallback(async () => {
    try {
      const after = lastId.current ? `?after=${encodeURIComponent(lastId.current)}` : "";
      const page = await api<MessagesPage>(`/api/me/matches/${id}/messages${after}`);
      setError("");
      if (page.ended) {
        setEnded(true);
      } else if (page.messages.length) {
        lastId.current = page.messages[page.messages.length - 1].id;
        setMessages((prev) => {
          const seen = new Set(prev.map((m) => m.id));
          return [...prev, ...page.messages.filter((m) => !seen.has(m.id))];
        });
        qc.invalidateQueries({ queryKey: keys.inbox }); // they're read now
      }
    } catch (e) {
      // Unmatched or blocked from the other side: the match is gone.
      if (e instanceof ApiError && e.status === 404) setEnded(true);
      else setError(e instanceof Error ? e.message : "Couldn't load messages.");
    } finally {
      setLoaded(true);
    }
  }, [id, qc]);

  // Poll every 4 s while this screen is open and focused.
  useFocusEffect(
    useCallback(() => {
      load();
      const t = setInterval(() => {
        if (!ended) load();
      }, POLL_MS);
      return () => clearInterval(t);
    }, [load, ended]),
  );

  useEffect(() => {
    // The match is gone (unmatched, blocked or reported): refresh the lists that showed it.
    if (ended) {
      qc.invalidateQueries({ queryKey: keys.me });
      qc.invalidateQueries({ queryKey: keys.inbox });
    }
  }, [ended, qc]);

  useEffect(() => {
    if (messages.length) setTimeout(() => list.current?.scrollToEnd({ animated: true }), 50);
  }, [messages.length]);

  async function send() {
    const text = draft.trim();
    if (!text || sending || ended) return;
    setSending(true);
    try {
      const r = await api<{ ok: true; message: ChatMessage }>(`/api/me/matches/${id}/messages`, { method: "POST", body: { text } });
      setDraft("");
      lastId.current = r.message.id;
      setMessages((prev) => (prev.some((m) => m.id === r.message.id) ? prev : [...prev, r.message]));
      qc.invalidateQueries({ queryKey: keys.inbox });
    } catch (e) {
      if (e instanceof ApiError && (e.status === 409 || e.status === 404)) setEnded(true);
      else toast(e instanceof Error ? e.message : "Couldn't send. Try again.");
    } finally {
      setSending(false);
    }
  }

  const header = (
    <Stack.Screen
      options={{
        title: name,
        headerRight: () =>
          match && !ended ? (
            <MoreButton label={`More for ${name}`} onPress={() => safety({ dateId: match.dateId, name: match.name, isMatch: true, photos: match.photos })} />
          ) : null,
      }}
    />
  );

  if (!loaded) {
    return (
      <>
        {header}
        <StateView loading />
      </>
    );
  }

  return (
    <KeyboardAvoidingView
      behavior={process.env.EXPO_OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={headerHeight}
      style={{ flex: 1, backgroundColor: c.bg }}
    >
      {header}
      <FlatList
        ref={list}
        style={{ flex: 1 }}
        data={messages}
        keyExtractor={(m) => m.id}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ padding: 16, gap: 8, flexGrow: 1 }}
        ListHeaderComponent={
          <View style={{ alignItems: "center", gap: 8, paddingVertical: 12 }}>
            <PersonPhoto url={match?.photos?.[0]} name={name} size={72} />
            <Text style={{ color: c.muted, fontSize: 13, textAlign: "center" }}>
              You and {name} matched. Be kind; you can report or block from the ••• menu.
            </Text>
            {error ? <ErrorBanner message={error} onRetry={load} /> : null}
          </View>
        }
        renderItem={({ item }) => (
          <View
            style={{
              alignSelf: item.mine ? "flex-end" : "flex-start",
              maxWidth: "82%",
              backgroundColor: item.mine ? c.ink : c.card,
              borderWidth: item.mine ? 0 : 1,
              borderColor: c.line,
              borderRadius: 20,
              borderBottomRightRadius: item.mine ? 6 : 20,
              borderBottomLeftRadius: item.mine ? 20 : 6,
              paddingHorizontal: 14,
              paddingVertical: 9,
            }}
          >
            <Text selectable style={{ color: item.mine ? c.onInk : c.ink, fontSize: 16, lineHeight: 22 }}>
              {item.text}
            </Text>
          </View>
        )}
        ListEmptyComponent={
          ended ? undefined : (
            <EmptyState title="Say hi" body={`Start with something from your agents' chat, or plan that first meetup with ${name}.`} />
          )
        }
      />
      {/* The native view's own bottom inset includes the tab bar, which the window insets do not. */}
      <SafeAreaView edges={["bottom"]} style={{ backgroundColor: c.bg }}>
      {ended ? (
        <View style={{ padding: 16, gap: 10, borderTopWidth: 1, borderTopColor: c.line, alignItems: "center" }}>
          <Text testID="chat-ended" style={{ color: c.muted, fontSize: 15, fontWeight: "700" }}>
            {ENDED}
          </Text>
          <Button variant="ghost" title="Back to messages" onPress={() => (router.canGoBack() ? router.back() : router.navigate("/messages"))} />
        </View>
      ) : (
        <View
          style={{
            flexDirection: "row",
            alignItems: "flex-end",
            gap: 8,
            paddingHorizontal: 12,
            paddingTop: 8,
            paddingBottom: 10,
            borderTopWidth: 1,
            borderTopColor: c.line,
            backgroundColor: c.bg,
          }}
        >
          <TextInput
            testID="chat-input"
            value={draft}
            onChangeText={setDraft}
            placeholder={`Message ${name}`}
            placeholderTextColor={c.muted}
            multiline
            maxLength={1000}
            {...(process.env.EXPO_OS === "web" ? ({ rows: 1 } as object) : {})}
            style={[
              {
                flex: 1,
                minHeight: 44,
                maxHeight: 120,
                color: c.ink,
                backgroundColor: c.card,
                borderWidth: 1,
                borderColor: c.lineStrong,
                borderRadius: 22,
                paddingHorizontal: 16,
                paddingTop: 11,
                paddingBottom: 11,
                fontSize: 16,
              },
              process.env.EXPO_OS === "web" ? ({ outlineStyle: "none" } as object) : null,
            ]}
          />
          <Pressable
            testID="chat-send"
            accessibilityRole="button"
            accessibilityLabel="Send"
            disabled={!draft.trim() || sending}
            onPress={send}
            style={({ pressed }) => ({
              height: 44,
              paddingHorizontal: 18,
              borderRadius: 22,
              backgroundColor: c.coral,
              opacity: !draft.trim() || sending ? 0.5 : pressed ? 0.85 : 1,
              alignItems: "center",
              justifyContent: "center",
            })}
          >
            <Text style={{ color: "#fff", fontWeight: "600", fontSize: 16 }}>{sending ? "..." : "Send"}</Text>
          </Pressable>
        </View>
      )}
      </SafeAreaView>
    </KeyboardAvoidingView>
  );
}
