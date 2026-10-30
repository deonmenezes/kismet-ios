import { router } from "expo-router";
import { Quiz } from "@/components/quiz";
import { useToast } from "@/components/sheet";
import { StateView } from "@/components/ui";
import type { ProfileInput } from "@/lib/options";
import { editPatch } from "@/lib/profile";
import { useMe, useSaveProfile } from "@/lib/queries";

export default function EditProfile() {
  const me = useMe();
  const save = useSaveProfile();
  const toast = useToast();

  if (!me.data) {
    if (me.error) return <StateView error={me.error.message} onRetry={() => me.refetch()} />;
    return <StateView loading />;
  }
  // The editable answers only (the view also carries server-made tags).
  const { tags: _tags, photos: _photos, ...rest } = me.data.profile;
  const initial: ProfileInput = { ...rest, telegram: rest.telegram ?? "", xHandle: rest.xHandle ?? "", useXPhoto: Boolean(rest.useXPhoto) };

  return (
    <Quiz
      mode="edit"
      initial={initial}
      busy={save.isPending}
      error={save.error?.message ?? ""}
      onExit={() => router.back()}
      onSubmit={(p) =>
        save.mutate(editPatch(p), {
          onSuccess: () => {
            toast("Profile saved. New agent chats will use it.");
            router.back();
          },
        })
      }
    />
  );
}
