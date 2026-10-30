import { useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Field } from "@/components/quiz-field";
import { useToast } from "@/components/sheet";
import { Body, Button, Chip, ErrorBanner, H1 } from "@/components/ui";
import { PersonPhoto } from "@/components/person-photo";
import { API_URL, goneMessage, isGone, LINKS } from "@/lib/api";
import { appWording } from "@/lib/copy";
import { openPage } from "@/lib/open";
import { REPORT_REASONS, type ReportReason } from "@/lib/options";
import { useReport } from "@/lib/queries";
import { useColors } from "@/theme/colors";

export default function Report() {
  const c = useColors();
  const insets = useSafeAreaInsets();
  const { dateId, name, match, photos } = useLocalSearchParams<{ dateId: string; name: string; match: string; photos?: string }>();
  const photoIds = (photos ?? "").split(",").filter(Boolean);
  const [photoId, setPhotoId] = useState<string | null>(photoIds[0] ?? null);
  const [reason, setReason] = useState<ReportReason | null>(null);
  const [note, setNote] = useState("");
  const report = useReport();
  const toast = useToast();
  const gone = isGone(report.error) ? report.error : null;

  const submit = () => {
    if (!reason || !dateId) return;
    report.mutate(
      { dateId, isMatch: match === "1", reason, note, photoId: photoIds.length ? photoId : null },
      {
        onSuccess: (r) => {
          toast(r.text ? appWording(r.text) : `Thanks. ${name} is blocked for you and we'll review the report.`);
          router.back();
        },
      },
    );
  };

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: c.bg }}
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={{ padding: 20, paddingTop: 28, paddingBottom: insets.bottom + 24, gap: 14 }}
    >
      <H1>{photoIds.length ? `Report a photo of ${name}` : `Report ${name}`}</H1>
      <Body muted>
        A person reviews every report. {name} is blocked for you straight away and is never told who reported them.
      </Body>
      {photoIds.length > 0 && (
        <>
          <Text style={{ color: c.ink, fontWeight: "600", fontSize: 16, marginTop: 4 }}>Which photo?</Text>
          <View style={{ flexDirection: "row", gap: 10 }}>
            {photoIds.map((id, i) => (
              <Pressable
                key={id}
                accessibilityRole="radio"
                accessibilityState={{ selected: photoId === id }}
                accessibilityLabel={`Photo ${i + 1}`}
                onPress={() => setPhotoId(id)}
                style={{ borderRadius: 18, borderWidth: 3, borderColor: photoId === id ? c.coral : "transparent", padding: 2 }}
              >
                <PersonPhoto url={`${API_URL}/api/photos/${id}`} name={name ?? ""} radius={14} style={{ width: 84, height: 105 }} />
              </Pressable>
            ))}
          </View>
        </>
      )}
      <Text style={{ color: c.ink, fontWeight: "600", fontSize: 16, marginTop: 4 }}>What happened?</Text>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
        {REPORT_REASONS.map((r) => (
          <Chip key={r.id} label={r.label} on={reason === r.id} onPress={() => setReason(r.id)} />
        ))}
      </View>
      <Field
        multiline
        maxLength={500}
        value={note}
        onChangeText={setNote}
        placeholder="Anything else we should know? (optional)"
        style={{ minHeight: 110, textAlignVertical: "top", fontSize: 15 }}
      />
      {gone ? (
        <>
          <ErrorBanner
            message={goneMessage(
              gone,
              `${name} is no longer on Kismet, so they can't be reported from here. If something happened, email us from the Support page.`,
            )}
          />
          <Button variant="ghost" title="Open Support" onPress={() => openPage(LINKS.support)} />
        </>
      ) : report.error ? (
        <ErrorBanner message={report.error.message} onRetry={submit} />
      ) : null}
      <Button testID="report-submit" size="lg" title="Send report" busy={report.isPending} disabled={!reason || Boolean(gone)} onPress={submit} />
      <Button variant="link" title="Cancel" onPress={() => router.back()} />
    </ScrollView>
  );
}
