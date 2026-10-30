import { useState } from "react";
import { ActivityIndicator, Pressable, Text, View } from "react-native";
import { Image } from "expo-image";
import { useQueryClient } from "@tanstack/react-query";
import { deletePhoto, MAX_PHOTOS, pickPhotos, uploadPhoto, type LocalPhoto } from "@/lib/photos";
import { keys, useMe } from "@/lib/queries";
import type { ProfileInput } from "@/lib/options";
import { useColors } from "@/theme/colors";
import { PersonPhoto } from "./person-photo";
import { Field } from "./quiz-field";
import { Body, ErrorBanner } from "./ui";

const SLOT = 104;

function Slot({ children, onRemove, label }: { children: React.ReactNode; onRemove?: () => void; label: string }) {
  const c = useColors();
  return (
    <View style={{ width: SLOT, height: SLOT * 1.25, borderRadius: 18, overflow: "hidden", backgroundColor: c.bg2 }}>
      {children}
      {onRemove && (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Remove ${label}`}
          onPress={onRemove}
          hitSlop={8}
          style={{
            position: "absolute",
            top: 6,
            right: 6,
            width: 28,
            height: 28,
            borderRadius: 14,
            backgroundColor: "rgba(0,0,0,0.6)",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Text style={{ color: "#fff", fontSize: 16, fontWeight: "700", marginTop: -1 }}>×</Text>
        </Pressable>
      )}
    </View>
  );
}

function AddSlot({ onPress, busy, testID }: { onPress: () => void; busy?: boolean; testID?: string }) {
  const c = useColors();
  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel="Add a photo of yourself"
      disabled={busy}
      onPress={onPress}
      style={({ pressed }) => ({
        width: SLOT,
        height: SLOT * 1.25,
        borderRadius: 18,
        borderWidth: 1,
        borderStyle: "solid",
        borderColor: c.lineStrong,
        backgroundColor: pressed ? c.bg2 : c.card,
        alignItems: "center",
        justifyContent: "center",
        gap: 4,
      })}
    >
      {busy ? (
        <ActivityIndicator color={c.muted} />
      ) : (
        <>
          <Text style={{ color: c.ink, fontSize: 28, fontWeight: "300" }}>+</Text>
          <Text style={{ color: c.muted, fontSize: 12, fontWeight: "500" }}>Add photo</Text>
        </>
      )}
    </Pressable>
  );
}

/** Sign-up: photos picked before the account exists; uploaded right after sign-up. */
export function PendingPhotos({ value, onChange }: { value: LocalPhoto[]; onChange: (v: LocalPhoto[]) => void }) {
  const [error, setError] = useState("");
  const add = async () => {
    setError("");
    try {
      const picked = await pickPhotos(MAX_PHOTOS - value.length);
      if (picked.length) onChange([...value, ...picked].slice(0, MAX_PHOTOS));
    } catch {
      setError("That photo couldn't be opened. Try a different one.");
    }
  };
  return (
    <View style={{ gap: 10 }}>
      <View style={{ flexDirection: "row", gap: 10, flexWrap: "wrap" }}>
        {value.map((p, i) => (
          <Slot key={p.key} label={`photo ${i + 1}`} onRemove={() => onChange(value.filter((x) => x.key !== p.key))}>
            <Image source={{ uri: p.uri }} style={{ width: "100%", height: "100%" }} contentFit="cover" accessibilityLabel={`Your photo ${i + 1}`} />
          </Slot>
        ))}
        {value.length < MAX_PHOTOS && <AddSlot onPress={add} testID="add-photo" />}
      </View>
      {error ? <ErrorBanner message={error} /> : null}
    </View>
  );
}

/** Me + Edit profile: photos stored on the server, uploaded and deleted right away. */
export function LivePhotos() {
  const c = useColors();
  const me = useMe();
  const qc = useQueryClient();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const photos = me.data?.profile.photos ?? [];
  const name = me.data?.profile.name ?? "";

  const add = async () => {
    setError("");
    let picked: LocalPhoto[] = [];
    try {
      picked = await pickPhotos(MAX_PHOTOS - photos.length);
    } catch {
      setError("That photo couldn't be opened. Try a different one.");
      return;
    }
    if (!picked.length) return;
    setBusy(true);
    try {
      for (const p of picked) {
        try {
          await uploadPhoto(p);
        } catch (e) {
          // Moderation refusals (422) and size/limit errors explain themselves.
          setError(e instanceof Error ? e.message : "That photo couldn't be added.");
        }
      }
    } finally {
      setBusy(false);
      qc.invalidateQueries({ queryKey: keys.me });
    }
  };

  const remove = async (id: string) => {
    setError("");
    try {
      await deletePhoto(id);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't remove that photo.");
    } finally {
      qc.invalidateQueries({ queryKey: keys.me });
    }
  };

  return (
    <View style={{ gap: 10 }}>
      <View style={{ flexDirection: "row", gap: 10, flexWrap: "wrap" }}>
        {photos.map((p, i) => (
          <Slot key={p.id} label={`photo ${i + 1}`} onRemove={() => remove(p.id)}>
            <PersonPhoto url={p.url} name={name} style={{ width: "100%", height: "100%" }} accessibilityLabel={`Your photo ${i + 1}`} />
          </Slot>
        ))}
        {photos.length < MAX_PHOTOS && <AddSlot onPress={add} busy={busy} testID="add-photo" />}
      </View>
      {error ? <ErrorBanner message={error} /> : null}
      <Text style={{ color: c.muted, fontSize: 12, lineHeight: 17 }}>
        Up to 3 photos of you. Only you, people your agent recommends you to, and your matches can see them. Every photo is checked first.
      </Text>
    </View>
  );
}

/** Their own X profile picture instead of (or as well as) uploads. */
export function XPhotoFields({ p, set }: { p: Pick<ProfileInput, "xHandle" | "useXPhoto">; set: (x: Partial<ProfileInput>) => void }) {
  const c = useColors();
  return (
    <View style={{ gap: 10 }}>
      <Field
        value={p.xHandle}
        maxLength={30}
        placeholder="Your X username (optional)"
        autoCapitalize="none"
        autoCorrect={false}
        onChangeText={(v) => {
          const h = v.replace(/^@/, "").replace(/\s/g, "");
          set({ xHandle: h, useXPhoto: h ? p.useXPhoto : false });
        }}
        testID="x-handle"
      />
      {p.xHandle ? (
        <Pressable
          accessibilityRole="checkbox"
          accessibilityState={{ checked: p.useXPhoto }}
          testID="use-x-photo"
          onPress={() => set({ useXPhoto: !p.useXPhoto })}
          style={{ flexDirection: "row", gap: 12, padding: 14, borderRadius: 20, borderWidth: 1, borderColor: p.useXPhoto ? c.coral : c.line, backgroundColor: c.card }}
        >
          <View
            style={{
              width: 24,
              height: 24,
              borderRadius: 7,
              borderWidth: 2,
              borderColor: p.useXPhoto ? c.coral : c.muted,
              backgroundColor: p.useXPhoto ? c.coral : "transparent",
              alignItems: "center",
              justifyContent: "center",
              marginTop: 1,
            }}
          >
            {p.useXPhoto && <Text style={{ color: "#fff", fontWeight: "700", fontSize: 13 }}>✓</Text>}
          </View>
          <Text style={{ flex: 1, color: c.ink, fontSize: 14, lineHeight: 20 }}>
            <Text style={{ fontWeight: "600" }}>Use my X profile picture.</Text> @{p.xHandle} is my own account and the picture shows me.
          </Text>
        </Pressable>
      ) : (
        <Body muted style={{ fontSize: 13 }}>Or use the picture from your own X account.</Body>
      )}
    </View>
  );
}
