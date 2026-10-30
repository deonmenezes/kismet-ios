import { useEffect, useState } from "react";
import { router, useLocalSearchParams } from "expo-router";
import { StateView } from "@/components/ui";
import { api, tokenFromInput } from "@/lib/api";
import { useAuth } from "@/lib/auth";

// agentdates://u/<token> or kismet://u/<token>: the private link opened on the phone signs this device in.
export default function PrivateLink() {
  const { token: raw } = useLocalSearchParams<{ token: string }>();
  const { signIn } = useAuth();
  const token = tokenFromInput(String(raw ?? ""));
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!token) return;
    api("/api/me?full=1", { token })
      .then(() => signIn(token))
      .then(() => router.replace("/"))
      .catch(() => setFailed(true));
  }, [token, signIn]);

  const error = !token ? "That private link is incomplete." : failed ? "That private link doesn't work any more." : "";
  return error ? <StateView error={error} onRetry={() => router.replace("/")} /> : <StateView loading />;
}
