import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { KeyboardAvoidingView, Pressable, ScrollView, Text, View, type ScrollViewInstance } from "react-native";
import Animated, { FadeIn, FadeInRight, LinearTransition } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Clipboard from "expo-clipboard";
import * as Haptics from "expo-haptics";
import { LINKS } from "@/lib/api";
import { openPage } from "@/lib/open";
import {
  AGENT_PROMPT, EMPTY_PROFILE, GENDER, INTEREST_CHIPS, INTERESTED_IN, LOOKING_FOR, OPENNESS, REL_STATUS, label, lookingForText, type ProfileInput,
} from "@/lib/options";
import type { LocalPhoto } from "@/lib/photos";
import { normalizeTelegram, validTelegram } from "@/lib/profile";
import { buildSteps, hasNonRomanceGoal, ROMANCE_STEPS, type QuizMode, type StepId } from "@/lib/quiz-steps";
import { GUTTER, useColors } from "@/theme/colors";
import { LivePhotos, PendingPhotos, XPhotoFields } from "./photo-editor";
import { Field } from "./quiz-field";
import { Body, Button, Card, Chip, ErrorBanner, H1 } from "./ui";

type Props = {
  mode: QuizMode;
  initial?: ProfileInput;
  busy: boolean;
  error: string;
  onSubmit: (p: ProfileInput, photos: LocalPhoto[]) => void;
  onExit: () => void;
};

/** The web quiz, one question per screen. Shared by sign-up and Edit profile. */
export function Quiz({ mode, initial, busy, error, onSubmit, onExit }: Props) {
  const c = useColors();
  const insets = useSafeAreaInsets();
  const [p, setP] = useState<ProfileInput>(initial ?? EMPTY_PROFILE);
  // The Telegram the profile had when Edit opened ("" for a Kismet-by-text account that never gave one).
  const savedTelegram = normalizeTelegram(initial?.telegram ?? "");
  const [statusPicked, setStatusPicked] = useState(Boolean(initial));
  const [agreed, setAgreed] = useState(mode === "edit");
  // Edit profile opens on the summary; answers changed from the summary return to it.
  const [i, setI] = useState(() => (initial && mode === "edit" ? buildSteps(initial.relStatus, initial.lookingFor, mode).length - 1 : 0));
  const [fromSummary, setFromSummary] = useState(false);
  // Whether romance was already on when an answer was opened from the summary.
  const [romanceAtEntry, setRomanceAtEntry] = useState(false);
  const [pending, setPending] = useState<LocalPhoto[]>([]);
  // "No" to the village question: the waitlist instead of the rest of the quiz (nothing is sent).
  const [notHere, setNotHere] = useState(false);
  const scroll = useRef<ScrollViewInstance>(null);

  const steps = useMemo(() => buildSteps(p.relStatus, p.lookingFor, mode), [p.relStatus, p.lookingFor, mode]);

  const step = steps[Math.min(i, steps.length - 1)];
  const set = (patch: Partial<ProfileInput>) => setP((x) => ({ ...x, ...patch }));
  // Status and openness move on by themselves shortly after a tap: the timer runs the latest `next`, so it sees the
  // steps that answer just added or removed.
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);
  const go = (n: number) => {
    clearTimeout(timer.current);
    setI(Math.max(0, Math.min(n, steps.length - 1)));
    scroll.current?.scrollTo({ y: 0, animated: false });
  };
  // Romance turned on from the summary: walk through its questions before going back.
  const needRomance = p.lookingFor.includes("romance") && !romanceAtEntry && !(p.gender && p.interestedIn);
  // Single or "It's complicated" picked from the summary: the optional openness question now applies, ask it.
  const needOpenness = step === "status" && steps[i + 1] === "openness" && p.openness === null;
  const toSummary = fromSummary && !needOpenness && !(needRomance && ROMANCE_STEPS.includes(steps[i + 1]));
  const next = () => {
    if (toSummary) {
      setFromSummary(false);
      go(steps.indexOf("summary"));
    } else go(i + 1);
  };
  const nextRef = useRef(next);
  useEffect(() => {
    nextRef.current = next;
  });
  const nextSoon = () => {
    clearTimeout(timer.current);
    timer.current = setTimeout(() => nextRef.current(), 180);
  };
  const back = () => (i === 0 || (mode === "edit" && step === "summary") ? onExit() : go(i - 1));
  const editFromSummary = (n: number) => {
    setRomanceAtEntry(p.lookingFor.includes("romance"));
    setFromSummary(true);
    go(n);
  };
  const toggle = <T extends string>(list: T[], v: T) => (list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);
  const tap = () => {
    if (process.env.EXPO_OS === "ios") Haptics.selectionAsync().catch(() => undefined);
  };

  const canNext: Record<StepId, boolean> = {
    edge: p.edgeCity === true,
    name: p.name.trim().length > 0,
    status: statusPicked,
    openness: true,
    looking: hasNonRomanceGoal(p.lookingFor),
    romance: Boolean(p.gender && p.interestedIn),
    interests: p.interests.length >= 3,
    bio: true,
    telegram: validTelegram(p.telegram),
    photos: !p.useXPhoto || /^[A-Za-z0-9_]{1,15}$/.test(p.xHandle),
    agent: true,
    terms: agreed,
    summary: true,
  };

  const clean = (): ProfileInput => ({
    ...p,
    // Romance off: relationship details aren't needed, so none are kept.
    ...(p.lookingFor.includes("romance") ? {} : { relStatus: "undisclosed" as const, openness: null, gender: null, interestedIn: null }),
    name: p.name.trim(),
    telegram: normalizeTelegram(p.telegram),
    bio: p.bio.trim(),
    xHandle: p.xHandle.trim(),
    useXPhoto: p.useXPhoto && Boolean(p.xHandle.trim()),
  });

  return (
    <KeyboardAvoidingView behavior={process.env.EXPO_OS === "ios" ? "padding" : undefined} style={{ flex: 1, backgroundColor: c.bg }}>
      <View style={{ paddingTop: insets.top + 4, gap: 8 }}>
        <View style={{ paddingHorizontal: 8, flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={mode === "edit" && (i === 0 || step === "summary") ? "Cancel" : "Back"}
            onPress={back}
            hitSlop={8}
            style={({ pressed }) => ({ minHeight: 44, minWidth: 44, paddingHorizontal: 12, justifyContent: "center", opacity: pressed ? 0.5 : 1 })}
          >
            <Text style={{ color: c.ink, fontSize: 17 }}>{mode === "edit" && (i === 0 || step === "summary") ? "Cancel" : "‹ Back"}</Text>
          </Pressable>
          <Text style={{ paddingHorizontal: 12, color: c.muted, fontSize: 13, fontVariant: ["tabular-nums"] }}>
            {i + 1} of {steps.length}
          </Text>
        </View>
        <View
          accessibilityRole="progressbar"
          accessibilityLabel={`Step ${i + 1} of ${steps.length}`}
          style={{ height: 2, marginHorizontal: GUTTER, backgroundColor: c.line, borderRadius: 1, overflow: "hidden" }}
        >
          <Animated.View layout={LinearTransition.duration(250)} style={{ height: 2, width: `${((i + 1) / steps.length) * 100}%`, backgroundColor: c.ink }} />
        </View>
      </View>

      <ScrollView
        ref={scroll}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ paddingHorizontal: GUTTER, paddingTop: 32, paddingBottom: 20, gap: 12, flexGrow: 1 }}
      >
        <Animated.View key={step} entering={FadeInRight.duration(280)} style={{ gap: 12 }}>
          {step === "edge" && !notHere && (
            <Q title="Are you living in the village right now?" hint="Kismet connects the residents of one village, and only them right now, so everyone it suggests is someone you can meet in person.">
              <View style={{ borderTopWidth: 1, borderColor: c.line }}>
                <Big on={p.edgeCity === true} label="Yes, I'm here" onPress={() => { tap(); set({ edgeCity: true }); }} />
                <Big on={false} label="No, I'm not" onPress={() => { tap(); setNotHere(true); }} />
              </View>
            </Q>
          )}

          {step === "edge" && notHere && (
            <Q title="Kismet is just for village residents, for now" hint="It connects the people living in the village. Join the waitlist and we'll tell you when it opens up.">
              <Button title="Join the waitlist" onPress={() => openPage(LINKS.waitlist)} />
              <Button variant="link" title="Actually, I am here" onPress={() => setNotHere(false)} />
            </Q>
          )}

          {step === "name" && (
            <Q title="What's your name?" hint="Your first name or what people call you in the village.">
              <Field
                autoFocus
                value={p.name}
                maxLength={40}
                placeholder="Your name"
                big
                onChangeText={(v) => set({ name: v })}
                onSubmitEditing={() => canNext.name && next()}
                testID="quiz-name"
              />
            </Q>
          )}

          {step === "status" && (
            <Q title="Relationship status" hint="Private. Never shown publicly, only used to keep romance opt-in safe.">
              <View style={{ borderTopWidth: 1, borderColor: c.line }}>{REL_STATUS.map((o) => (
                <Big
                  key={o.id}
                  on={statusPicked && p.relStatus === o.id}
                  label={o.label}
                  onPress={() => {
                    tap();
                    set({ relStatus: o.id, openness: o.id === "single" || o.id === "complicated" ? p.openness : null });
                    setStatusPicked(true);
                    nextSoon();
                  }}
                />
              ))}</View>
            </Q>
          )}

          {step === "openness" && (
            <Q title="Open to..." hint="Optional and private.">
              <View style={{ borderTopWidth: 1, borderColor: c.line }}>{OPENNESS.map((o) => (
                <Big
                  key={o.id}
                  on={p.openness === o.id}
                  label={o.label}
                  onPress={() => {
                    tap();
                    set({ openness: o.id });
                    nextSoon();
                  }}
                />
              ))}</View>
              <Button
                variant="link"
                title="Skip"
                onPress={() => {
                  set({ openness: null });
                  next();
                }}
              />
            </Q>
          )}

          {step === "looking" && (
            <Q title="What are you looking for here?" hint="Pick as many as you like.">
              <Chips>
                {LOOKING_FOR.filter((o) => o.id !== "romance").map((o) => (
                  <Chip
                    key={o.id}
                    label={o.label}
                    on={p.lookingFor.includes(o.id)}
                    onPress={() => {
                      tap();
                      set({ lookingFor: toggle(p.lookingFor, o.id) });
                    }}
                  />
                ))}
              </Chips>
              <RomanceSwitch
                on={p.lookingFor.includes("romance")}
                onPress={() => {
                  tap();
                  set({ lookingFor: toggle(p.lookingFor, "romance") });
                }}
              />
              {p.lookingFor.length > 0 && !canNext.looking && (
                <Body muted style={{ fontSize: 13 }}>Pick at least one of the above too: romance is an extra.</Body>
              )}
            </Q>
          )}

          {step === "romance" && (
            <Q title="Romance, just between us" hint="Private. Only used for romance intros.">
              <Text style={{ color: c.muted, fontSize: 14 }}>I am</Text>
              <Chips>
                {GENDER.map((o) => (
                  <Chip key={o.id} label={o.label} on={p.gender === o.id} onPress={() => { tap(); set({ gender: o.id }); }} />
                ))}
              </Chips>
              <Text style={{ color: c.muted, fontSize: 14, marginTop: 12 }}>Interested in</Text>
              <Chips>
                {INTERESTED_IN.map((o) => (
                  <Chip key={o.id} label={o.label} on={p.interestedIn === o.id} onPress={() => { tap(); set({ interestedIn: o.id }); }} />
                ))}
              </Chips>
            </Q>
          )}

          {step === "interests" && (
            <Q title="Your interests" hint={`Pick 3 or more. ${p.interests.length} picked.`}>
              <Chips>
                {[...INTEREST_CHIPS, ...p.interests.filter((x) => !INTEREST_CHIPS.includes(x))].map((v) => (
                  <Chip key={v} label={v} on={p.interests.includes(v)} onPress={() => { tap(); set({ interests: toggle(p.interests, v) }); }} />
                ))}
              </Chips>
              <AddOwn onAdd={(v) => !p.interests.includes(v) && p.interests.length < 15 && set({ interests: [...p.interests, v] })} />
            </Q>
          )}

          {step === "bio" && (
            <Q title="One line about you" hint="Optional.">
              <Field
                autoFocus
                value={p.bio}
                maxLength={160}
                placeholder="Building an AI app, here for sunsets and good convos"
                onChangeText={(v) => set({ bio: v })}
                onSubmitEditing={next}
                testID="quiz-bio"
              />
            </Q>
          )}

          {step === "telegram" && (
            <Q
              title="Your Telegram handle"
              hint={
                mode === "edit"
                  ? "Never public. Kismet needs one to save changes in the app, so it can't be removed here."
                  : "Shown only to your matches. Never public."
              }
            >
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                <Text style={{ color: c.muted, fontSize: 22, fontWeight: "600" }}>@</Text>
                <View style={{ flex: 1 }}>
                  <Field
                    autoFocus
                    value={p.telegram}
                    maxLength={40}
                    placeholder="yourhandle"
                    big
                    autoCapitalize="none"
                    autoCorrect={false}
                    onChangeText={(v) => set({ telegram: v.replace(/^@/, "").replace(/\s/g, "") })}
                    onSubmitEditing={() => canNext.telegram && next()}
                    testID="quiz-telegram"
                  />
                </View>
              </View>
              {p.telegram.length > 0 && !canNext.telegram && (
                <Body muted style={{ fontSize: 13 }}>Telegram usernames are 4-32 letters, numbers or underscores.</Body>
              )}
              {mode === "edit" && (
                <Body muted style={{ fontSize: 13 }}>
                  Matches see it unless you chose WhatsApp on Kismet by text: then they reach you there, and a Telegram here doesn&apos;t change that.
                </Body>
              )}
              {mode === "edit" && validTelegram(savedTelegram) && !canNext.telegram && (
                <Button variant="link" title={`Keep @${savedTelegram}`} onPress={() => set({ telegram: savedTelegram })} testID="quiz-telegram-keep" />
              )}
            </Q>
          )}

          {step === "photos" && (
            <Q title="Add a photo of you" hint="Optional. Up to 3 photos of yourself, never of anyone else. Only people your agent recommends you to and your matches see them.">
              {mode === "join" ? <PendingPhotos value={pending} onChange={setPending} /> : <LivePhotos />}
              <XPhotoFields p={p} set={set} />
            </Q>
          )}

          {step === "agent" && (
            <Q title="Almost there" hint="All optional. Your quiz answers are enough for your agent to start meeting people.">
              <AgentExtras p={p} set={set} />
            </Q>
          )}

          {step === "terms" && (
            <Q title="One last thing" hint="Kismet is for adults living in the village.">
              <Pressable
                accessibilityRole="checkbox"
                accessibilityState={{ checked: agreed }}
                accessibilityLabel="I'm 18 or older and I agree to the Terms and Privacy Policy"
                testID="quiz-terms"
                onPress={() => { tap(); setAgreed(!agreed); }}
                style={{
                  flexDirection: "row",
                  gap: 14,
                  alignItems: "flex-start",
                  padding: 16,
                  borderRadius: 24,
                  borderWidth: 2,
                  borderColor: agreed ? c.coral : c.line,
                  backgroundColor: c.card,
                }}
              >
                <View
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: 8,
                    borderWidth: 2,
                    borderColor: agreed ? c.coral : c.muted,
                    backgroundColor: agreed ? c.coral : "transparent",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  {agreed && <Text style={{ color: "#fff", fontWeight: "700", fontSize: 16 }}>✓</Text>}
                </View>
                <Text style={{ flex: 1, color: c.ink, fontSize: 16, lineHeight: 23, fontWeight: "600" }}>
                  I&apos;m 18 or older and I agree to the{" "}
                  <Text style={{ color: c.coral, textDecorationLine: "underline" }} onPress={() => openPage(LINKS.terms)}>
                    Terms
                  </Text>{" "}
                  and{" "}
                  <Text style={{ color: c.coral, textDecorationLine: "underline" }} onPress={() => openPage(LINKS.privacy)}>
                    Privacy Policy
                  </Text>
                  .
                </Text>
              </Pressable>
              <Body muted style={{ fontSize: 13 }}>
                Be kind. Anyone you&apos;re shown can be reported or blocked, and every report is reviewed.
              </Body>
            </Q>
          )}

          {step === "summary" && (
            <Q title={mode === "join" ? "Looks good?" : "Review your changes"} hint="Tap any answer to change it.">
              {mode === "edit" && !canNext.telegram && (
                // PATCH /api/me refuses a profile without a Telegram (Kismet-by-text accounts may have none).
                <Card style={{ gap: 6 }}>
                  <Text style={{ color: c.ink, fontWeight: "600", fontSize: 15 }}>Add a Telegram username to save here</Text>
                  <Body muted style={{ fontSize: 14 }}>
                    Kismet saves profile changes from the app only with a Telegram username. If matches reach you on WhatsApp, they still
                    will. On Kismet by text you can also change your profile with EDIT, without Telegram.
                  </Body>
                </Card>
              )}
              <Summary p={p} steps={steps} onEdit={editFromSummary} photoCount={mode === "join" ? pending.length : null} />
            </Q>
          )}
        </Animated.View>
      </ScrollView>

      <View style={{ paddingHorizontal: GUTTER, paddingTop: 10, paddingBottom: Math.max(insets.bottom, 16), gap: 10, backgroundColor: c.bg }}>
        {error ? <ErrorBanner message={error} /> : null}
        {step === "summary" ? (
          <Button
            size="lg"
            testID="quiz-submit"
            title={busy ? "Saving..." : !canNext.telegram ? (p.telegram.trim() ? "Fix your Telegram" : "Add your Telegram") : mode === "join" ? "Create my agent" : "Save changes"}
            busy={busy}
            // The server refuses a missing or malformed Telegram: go to that question instead of sending a profile it refuses.
            onPress={() => (canNext.telegram ? onSubmit(clean(), pending) : editFromSummary(steps.indexOf("telegram")))}
          />
        ) : step !== "status" && step !== "openness" ? (
          <Button
            size="lg"
            testID="quiz-next"
            title={toSummary ? "Done" : step === "photos" && !pending.length && !p.useXPhoto && !(mode === "edit") ? "Skip" : step === "bio" && !p.bio ? "Skip" : step === "agent" && !p.agentProfile && !p.agentName && !p.agentPersonality ? "Skip" : "Continue"}
            disabled={!canNext[step]}
            onPress={next}
          />
        ) : null}
      </View>
    </KeyboardAvoidingView>
  );
}

function Q({ title, hint, children }: { title: string; hint?: string; children: ReactNode }) {
  return (
    <View style={{ gap: 12 }}>
      <View style={{ gap: 6, marginBottom: 8 }}>
        <H1>{title}</H1>
        {hint ? <Body muted>{hint}</Body> : null}
      </View>
      {children}
    </View>
  );
}

const Chips = ({ children }: { children: ReactNode }) => <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>{children}</View>;

function Big({ on, label: text, onPress }: { on: boolean; label: string; onPress: () => void }) {
  const c = useColors();
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ selected: on }}
      accessibilityLabel={text}
      onPress={onPress}
      style={({ pressed }) => ({
        minHeight: 60,
        borderBottomWidth: 1,
        borderColor: c.line,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        opacity: pressed ? 0.6 : 1,
      })}
    >
      <Text style={{ color: c.ink, fontSize: 18 }}>{text}</Text>
      <View
        style={{
          width: 24,
          height: 24,
          borderRadius: 12,
          borderWidth: on ? 7 : 1.5,
          borderColor: on ? c.ink : c.lineStrong,
        }}
      />
    </Pressable>
  );
}

/** Romance is opt-in: a separate switch under the goals, off by default. The whole row is the control. */
function RomanceSwitch({ on, onPress }: { on: boolean; onPress: () => void }) {
  const c = useColors();
  const hint = "Off unless you turn it on. Private. Your agent only suggests romance with someone who turned it on too and fits what you're both open to.";
  return (
    <Pressable
      role="switch"
      aria-checked={on}
      accessibilityLabel="Also open to romance (optional)"
      accessibilityHint={hint}
      testID="quiz-romance"
      onPress={onPress}
      style={({ pressed }) => ({
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        marginTop: 12,
        padding: 16,
        borderRadius: 24,
        borderWidth: 1,
        borderColor: c.line,
        backgroundColor: pressed ? c.bg2 : c.card,
      })}
    >
      <View style={{ flex: 1, gap: 4 }}>
        <Text style={{ color: c.ink, fontWeight: "600", fontSize: 15 }}>Also open to romance (optional)</Text>
        <Text style={{ color: c.muted, fontSize: 13, lineHeight: 18 }}>{hint}</Text>
      </View>
      {/* Drawn rather than a <Switch>, so there is one control (on web a Switch is its own focusable input). */}
      <View aria-hidden style={{ width: 50, height: 30, borderRadius: 15, padding: 3, backgroundColor: on ? c.coral : c.lineStrong, alignItems: on ? "flex-end" : "flex-start" }}>
        <View style={{ width: 24, height: 24, borderRadius: 12, backgroundColor: "#FFFFFF", boxShadow: "0 1px 3px rgba(26,15,34,0.25)" }} />
      </View>
    </Pressable>
  );
}

function AddOwn({ onAdd }: { onAdd: (v: string) => void }) {
  const [open, setOpen] = useState(false);
  const [v, setV] = useState("");
  const add = () => {
    const t = v.trim().slice(0, 30);
    if (t) onAdd(t);
    setV("");
    setOpen(false);
  };
  if (!open) return <Button variant="ghost" title="+ Add your own" onPress={() => setOpen(true)} style={{ alignSelf: "flex-start" }} />;
  return (
    <View style={{ flexDirection: "row", gap: 8, alignItems: "center" }}>
      <View style={{ flex: 1 }}>
        <Field autoFocus maxLength={30} value={v} placeholder="e.g. Freediving" onChangeText={setV} onSubmitEditing={add} returnKeyType="done" />
      </View>
      <Button title="Add" onPress={add} disabled={!v.trim()} />
    </View>
  );
}

function AgentExtras({ p, set }: { p: ProfileInput; set: (x: Partial<ProfileInput>) => void }) {
  const c = useColors();
  const [open, setOpen] = useState(Boolean(p.agentProfile));
  const [copied, setCopied] = useState(false);
  return (
    <View style={{ gap: 12 }}>
      <View style={{ borderRadius: 24, borderWidth: 1, borderColor: c.line, backgroundColor: c.card, overflow: "hidden" }}>
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ expanded: open }}
          onPress={() => setOpen(!open)}
          style={{ minHeight: 58, paddingHorizontal: 16, flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 }}
        >
          <Text style={{ flex: 1, color: c.ink, fontWeight: "600", fontSize: 15 }}>Paste what your own AI agent says about you</Text>
          <Text style={{ color: c.muted, fontSize: 18, transform: [{ rotate: open ? "180deg" : "0deg" }] }}>⌄</Text>
        </Pressable>
        {open && (
          <Animated.View entering={FadeIn} style={{ paddingHorizontal: 16, paddingBottom: 16, gap: 10 }}>
            <Body muted style={{ fontSize: 14 }}>Ask your own AI agent:</Body>
            <View style={{ backgroundColor: c.bg2, borderRadius: 16, padding: 12 }}>
              <Text selectable style={{ color: c.ink, fontSize: 14, lineHeight: 20 }}>
                {AGENT_PROMPT}
              </Text>
            </View>
            <Button
              variant="ghost"
              title={copied ? "Copied!" : "Copy prompt"}
              onPress={async () => {
                await Clipboard.setStringAsync(AGENT_PROMPT).catch(() => undefined);
                setCopied(true);
                setTimeout(() => setCopied(false), 1800);
              }}
            />
            <Field
              multiline
              maxLength={1500}
              value={p.agentProfile}
              placeholder="Paste your agent's answer here"
              onChangeText={(v) => set({ agentProfile: v })}
              style={{ minHeight: 150, textAlignVertical: "top", fontSize: 15 }}
            />
            <Body muted style={{ fontSize: 12 }}>Emails, phone numbers and links are removed automatically.</Body>
          </Animated.View>
        )}
      </View>
      <Field maxLength={40} value={p.agentName} placeholder="Agent name (optional)" onChangeText={(v) => set({ agentName: v })} />
      <Field
        maxLength={140}
        value={p.agentPersonality}
        placeholder="Agent personality in one line (optional)"
        onChangeText={(v) => set({ agentPersonality: v })}
      />
      <Pressable
        accessibilityRole="checkbox"
        accessibilityState={{ checked: p.publicQuotes }}
        onPress={() => set({ publicQuotes: !p.publicQuotes })}
        style={{ flexDirection: "row", gap: 12, padding: 16, borderRadius: 24, borderWidth: 1, borderColor: c.line, backgroundColor: c.card }}
      >
        <View
          style={{
            width: 24,
            height: 24,
            borderRadius: 7,
            borderWidth: 2,
            borderColor: p.publicQuotes ? c.coral : c.muted,
            backgroundColor: p.publicQuotes ? c.coral : "transparent",
            alignItems: "center",
            justifyContent: "center",
            marginTop: 1,
          }}
        >
          {p.publicQuotes && <Text style={{ color: "#fff", fontWeight: "700", fontSize: 13 }}>✓</Text>}
        </View>
        <Text style={{ flex: 1, color: c.ink, fontSize: 14, lineHeight: 20 }}>
          <Text style={{ fontWeight: "600" }}>Show short quotes from my agent&apos;s chats on the public Village Board.</Text> Only when the other person
          opted in too.
        </Text>
      </Pressable>
    </View>
  );
}

/** "Woman, into men". A Kismet-by-text sign-up may have left either out. */
function romanceText(p: ProfileInput) {
  const g = label(GENDER, p.gender);
  const into = label(INTERESTED_IN, p.interestedIn).toLowerCase();
  return g && into ? `${g}, into ${into}` : g || (into ? `Into ${into}` : "Not given");
}

function Summary({ p, steps, onEdit, photoCount }: { p: ProfileInput; steps: StepId[]; onEdit: (n: number) => void; photoCount: number | null }) {
  const romance = p.lookingFor.includes("romance");
  const rows: { step: StepId; title: string; value: string }[] = [
    ...(steps.includes("edge") ? [{ step: "edge" as const, title: "In the village", value: "Yes" }] : []),
    { step: "name", title: "Name", value: p.name },
    { step: "looking", title: "Looking for", value: lookingForText(p.lookingFor) },
    ...(romance
      ? [
          { step: "status" as const, title: "Relationship status (private)", value: label(REL_STATUS, p.relStatus) },
          ...(steps.includes("openness") ? [{ step: "openness" as const, title: "Open to (private)", value: label(OPENNESS, p.openness) || "Skipped" }] : []),
          { step: "romance" as const, title: "Romance (private)", value: romanceText(p) },
        ]
      : []),
    { step: "interests", title: "Interests", value: p.interests.join(", ") },
    { step: "bio", title: "One line", value: p.bio || "Skipped" },
    { step: "telegram", title: "Telegram (matches only)", value: normalizeTelegram(p.telegram) ? `@${normalizeTelegram(p.telegram)}` : "None yet" },
    {
      step: "photos",
      title: "Photos",
      value:
        [photoCount === null ? "Managed in Me" : photoCount ? `${photoCount} photo${photoCount > 1 ? "s" : ""}` : "", p.useXPhoto && p.xHandle ? `X picture of @${p.xHandle}` : ""]
          .filter(Boolean)
          .join(" · ") || "No photo",
    },
    {
      step: "agent",
      title: "Your agent",
      value: [p.agentName || "Default name", p.agentProfile ? "profile pasted" : "no pasted profile", p.publicQuotes ? "Board quotes on" : "Board quotes off"].join(" · "),
    },
  ];
  return (
    <View style={{ gap: 8 }}>
      {rows.map((r) => (
        <SummaryRow key={r.step} title={r.title} value={r.value} onPress={() => onEdit(steps.indexOf(r.step))} />
      ))}
    </View>
  );
}

function SummaryRow({ title, value, onPress }: { title: string; value: string; onPress: () => void }) {
  const c = useColors();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Change ${title}`}
      onPress={onPress}
      style={({ pressed }) => ({
        backgroundColor: pressed ? c.bg2 : c.card,
        borderRadius: 18,
        borderWidth: 1,
        borderColor: c.line,
        padding: 14,
        flexDirection: "row",
        alignItems: "center",
        gap: 10,
      })}
    >
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={{ color: c.muted, fontSize: 12, fontWeight: "700" }}>{title}</Text>
        <Text style={{ color: c.ink, fontSize: 15, fontWeight: "600" }}>{value}</Text>
      </View>
      <Text style={{ color: c.ink, fontWeight: "500", fontSize: 14, textDecorationLine: "underline" }}>Edit</Text>
    </Pressable>
  );
}
