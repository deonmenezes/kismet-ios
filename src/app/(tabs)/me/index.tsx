import type { ReactNode } from "react";
import { Pressable, RefreshControl, ScrollView, Text, View } from "react-native";
import { router } from "expo-router";
import * as Clipboard from "expo-clipboard";
import { PersonPhoto } from "@/components/person-photo";
import { LivePhotos } from "@/components/photo-editor";
import { useSheet, useToast } from "@/components/sheet";
import { Body, Eyebrow, ErrorBanner, StateView, Tag, Verified } from "@/components/ui";
import { LINKS, privateLinkFor } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { openPage } from "@/lib/open";
import { lookingForText } from "@/lib/options";
import { ownContactLine } from "@/lib/profile";
import { useDeleteAccount, useMe, usePullRefresh, useRefetchOnFocus } from "@/lib/queries";
import { chatsLeftText } from "@/lib/weekly";
import { GUTTER, serif, useColors } from "@/theme/colors";

export default function MeScreen() {
  const c = useColors();
  const me = useMe();
  const pull = usePullRefresh(me.refetch);
  const { token, signOut } = useAuth();
  const sheet = useSheet();
  const toast = useToast();
  const del = useDeleteAccount();
  useRefetchOnFocus(me.refetch);

  if (!me.data) {
    if (me.error) return <StateView error={me.error.message} onRetry={() => me.refetch()} />;
    return <StateView loading />;
  }
  const { profile, worldId } = me.data;
  // Outside the village pool there are no agent chats to count (QA7 Q7-L1): Home has the question.
  const chats = chatsLeftText(me.data);

  const confirmDelete = () =>
    sheet({
      title: "Delete your account?",
      // Matches the Privacy Policy (Deletion): reports other people made about you are kept for up to 12 months, for safety.
      message:
        "Your profile, agent chats, matches, messages and photos are permanently deleted. This can't be undone. Reports other people made about you are kept for up to 12 months, for safety (see the Privacy Policy).",
      actions: [
        {
          label: "Delete my account",
          destructive: true,
          onPress: () => del.mutate(undefined, { onError: (e) => toast(`Couldn't delete: ${e.message}`) }),
        },
        { label: "Read the Privacy Policy", onPress: () => openPage(LINKS.privacy) },
      ],
    });

  const confirmSignOut = () =>
    sheet({
      title: "Sign out?",
      message: "You'll need your private link to sign back in. Copy it first if you haven't saved it.",
      actions: [
        { label: "Copy private link", onPress: copyLink },
        { label: "Sign out", destructive: true, onPress: () => signOut() },
      ],
    });

  async function copyLink() {
    if (!token) return;
    await Clipboard.setStringAsync(privateLinkFor(token)).catch(() => undefined);
    toast("Private link copied. Keep it somewhere safe.");
  }

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: c.bg }}
      contentInsetAdjustmentBehavior="automatic"
      contentContainerStyle={{ paddingHorizontal: GUTTER, paddingTop: 8, paddingBottom: 48, gap: 28 }}
      refreshControl={<RefreshControl refreshing={pull.refreshing} onRefresh={pull.onRefresh} tintColor={c.muted} colors={[c.coral]} />}
    >
      {me.error ? <ErrorBanner message={`Couldn't refresh. ${me.error.message}`} onRetry={() => me.refetch()} /> : null}

      <View style={{ alignItems: "center", gap: 10, paddingTop: 8 }}>
        <PersonPhoto url={profile.photos?.[0]?.url} name={profile.name} size={104} />
        <Text style={{ color: c.ink, fontFamily: serif.title, fontSize: 34, lineHeight: 40, textAlign: "center" }}>{profile.name}</Text>
        {worldId.verified && <Verified />}
        <Text selectable testID="me-contact" style={{ color: c.muted, fontSize: 14, textAlign: "center" }}>
          {ownContactLine(profile.telegram)}
        </Text>
      </View>

      {profile.bio ? (
        <View style={{ gap: 8 }}>
          <Eyebrow>In your words</Eyebrow>
          <Text selectable style={{ color: c.ink, fontFamily: serif.text, fontSize: 22, lineHeight: 29 }}>
            {profile.bio}
          </Text>
        </View>
      ) : null}

      <View style={{ gap: 10 }}>
        <Eyebrow>Looking for</Eyebrow>
        <Body>{lookingForText(profile.lookingFor)}</Body>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 4 }}>
          {profile.interests.map((s) => (
            <Tag key={s} label={s} />
          ))}
        </View>
        <Text style={{ color: c.muted, fontSize: 13 }}>
          Agent: {profile.agentName || `${profile.name}'s agent`}
          {chats ? ` · ${chats}` : ""}
        </Text>
      </View>

      <View style={{ gap: 10 }}>
        <Eyebrow>Photos</Eyebrow>
        <LivePhotos />
        {profile.useXPhoto && profile.xHandle ? (
          <Text style={{ color: c.muted, fontSize: 12 }}>Also using the X profile picture of @{profile.xHandle} (change it in Edit profile).</Text>
        ) : null}
      </View>

      <Group title="Profile">
        <Row title="Edit profile" detail="Same questions as the quiz" onPress={() => router.push("/me/edit")} testID="edit-profile" />
        {worldId.available && (
          <Row
            title={worldId.verified ? "World ID verified ✓" : "Get verified with World ID"}
            detail={worldId.verified ? "Your matches see the badge" : "Optional ✓ badge, Orb or Selfie Check"}
            disabled={worldId.verified || !worldId.verifyLink}
            onPress={async () => {
              if (!worldId.verifyLink) return;
              if (!(await openPage(worldId.verifyLink))) toast("Couldn't open World ID. Try again.");
              me.refetch();
            }}
          />
        )}
        <Row title="Copy my private link" detail="Signs you in on another device" onPress={copyLink} />
      </Group>

      <Group title="Safety">
        <Row title="Blocked people" detail="People you blocked or reported" onPress={() => router.push("/me/blocked")} testID="blocked-people" />
        <Row title="Support" detail="Help, questions and safety concerns" onPress={() => openPage(LINKS.support)} />
      </Group>

      <Group title="Legal">
        <Row title="Privacy Policy" onPress={() => openPage(LINKS.privacy)} />
        <Row title="Terms of Use" onPress={() => openPage(LINKS.terms)} />
      </Group>

      <Group title="Account">
        <Row title="Sign out" onPress={confirmSignOut} testID="sign-out" />
        <Row title={del.isPending ? "Deleting..." : "Delete account"} destructive onPress={confirmDelete} disabled={del.isPending} testID="delete-account" />
      </Group>
    </ScrollView>
  );
}

function Group({ title, children }: { title: string; children: ReactNode }) {
  const c = useColors();
  return (
    <View style={{ gap: 6 }}>
      <Eyebrow>{title}</Eyebrow>
      <View style={{ borderTopWidth: 1, borderColor: c.line }}>{children}</View>
    </View>
  );
}

function Row({
  title, detail, onPress, destructive, disabled, testID,
}: { title: string; detail?: string; onPress: () => void; destructive?: boolean; disabled?: boolean; testID?: string }) {
  const c = useColors();
  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityState={{ disabled: Boolean(disabled) }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => ({
        minHeight: 56,
        paddingVertical: 12,
        flexDirection: "row",
        alignItems: "center",
        gap: 10,
        opacity: pressed ? 0.6 : 1,
        borderBottomWidth: 1,
        borderBottomColor: c.line,
      })}
    >
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={{ color: destructive ? c.coralInk : c.ink, fontSize: 16 }}>{title}</Text>
        {detail ? <Text style={{ color: c.muted, fontSize: 13 }}>{detail}</Text> : null}
      </View>
      {!disabled && <Text style={{ color: c.muted, fontSize: 20 }}>›</Text>}
    </Pressable>
  );
}
