import { useCallback, useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useFocusEffect } from "expo-router";
import { api, ApiError, isGone } from "./api";
import { useAuth } from "./auth";
import type { ProfileInput, ReportReason } from "./options";
import type { Board, BlockedPerson, DatesResult, DecideResult, EdgeCityResult, Inbox, Me, SafetyResult, Stats } from "./types";

export const keys = {
  me: ["me"] as const,
  board: ["board"] as const,
  stats: ["stats"] as const,
  blocks: ["blocks"] as const,
  inbox: ["inbox"] as const,
};

/** Refetch when a screen regains focus (skips the first focus, which already fetched). */
export function useRefetchOnFocus(refetch: () => unknown) {
  const first = useRef(true);
  useFocusEffect(
    useCallback(() => {
      if (first.current) {
        first.current = false;
        return;
      }
      refetch();
    }, [refetch]),
  );
}

/** Pull-to-refresh that spins only for a refresh the user pulled for. Background refetches (focus, polling) must not set
 * `refreshing`: on iOS that scrolls the list under the large title and leaves the title hidden. */
export function usePullRefresh(refetch: () => Promise<unknown>) {
  const [refreshing, setRefreshing] = useState(false);
  const onRefresh = useCallback(() => {
    setRefreshing(true);
    refetch().finally(() => setRefreshing(false));
  }, [refetch]);
  return { refreshing, onRefresh };
}

// The full view (?full=1): profile, transcripts and World ID. Polls every 4 s while dates are running.
export function useMe() {
  const { token, signOut } = useAuth();
  const q = useQuery({
    queryKey: keys.me,
    queryFn: () => api<Me>("/api/me?full=1"),
    enabled: Boolean(token),
    refetchInterval: (query) => ((query.state.data?.running ?? 0) > 0 ? 4000 : false),
  });
  useEffect(() => {
    // The token was revoked (account deleted elsewhere): go back to the welcome screen.
    if (q.error instanceof ApiError && q.error.status === 401) signOut();
  }, [q.error, signOut]);
  return q;
}

export function useStats() {
  return useQuery({ queryKey: keys.stats, queryFn: () => api<Stats>("/api/public/stats", { token: null }) });
}

export function useBoard() {
  return useQuery({ queryKey: keys.board, queryFn: () => api<Board>("/api/public/board?limit=20", { token: null }) });
}

export function useBlocks() {
  return useQuery({
    queryKey: keys.blocks,
    queryFn: () => api<{ blocks: BlockedPerson[] }>("/api/me/blocks").then((r) => r.blocks ?? []),
    retry: (n, e) => !(e instanceof ApiError && e.status === 404) && n < 2,
  });
}

/** Conversations with open matches; also drives the unread badge on the Messages tab. */
export function useInbox() {
  const { token } = useAuth();
  return useQuery({
    queryKey: keys.inbox,
    queryFn: () => api<Inbox>("/api/me/inbox"),
    enabled: Boolean(token),
    refetchInterval: 15_000,
  });
}

export function useUnmatch() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (matchId: string) => api<{ ok: true; ended: boolean }>(`/api/me/matches/${matchId}/unmatch`, { method: "POST", body: {} }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: keys.me });
      qc.invalidateQueries({ queryKey: keys.inbox });
    },
  });
}

/** "Are you living in the village right now?" (POST /api/me/edge-city) for an account from before Kismet was for residents only (or one that said no). */
export function useEdgeCity() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (edgeCity: boolean) => api<EdgeCityResult>("/api/me/edge-city", { method: "POST", body: { edgeCity } }),
    onSettled: () => qc.invalidateQueries({ queryKey: keys.me }),
  });
}

export function useSendOnDates() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (targetId?: string) =>
      api<DatesResult>("/api/me/dates", { method: "POST", body: targetId ? { targetId } : {} }),
    onSettled: () => qc.invalidateQueries({ queryKey: keys.me }),
  });
}

export function useDecide() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (v: { dateId: string; decision: "meet" | "pass" }) =>
      api<DecideResult>("/api/me/decide", { method: "POST", body: v }),
    onMutate: async (v) => {
      // An answered recommendation leaves the list either way; only a mutual match comes back.
      await qc.cancelQueries({ queryKey: keys.me });
      const prev = qc.getQueryData<Me>(keys.me);
      if (prev) qc.setQueryData<Me>(keys.me, { ...prev, recommendations: prev.recommendations.filter((r) => r.dateId !== v.dateId) });
      return { prev };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.prev) qc.setQueryData(keys.me, ctx.prev);
    },
    onSettled: () => qc.invalidateQueries({ queryKey: keys.me }),
  });
}

export function useSaveProfile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (p: ProfileInput) => api<{ ok: true }>("/api/me", { method: "PATCH", body: p }),
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.me }),
  });
}

const refreshSafety = (qc: ReturnType<typeof useQueryClient>) => {
  qc.invalidateQueries({ queryKey: keys.me });
  qc.invalidateQueries({ queryKey: keys.inbox });
  qc.invalidateQueries({ queryKey: keys.blocks });
};

export function useReport() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (v: { dateId: string; isMatch: boolean; reason: ReportReason; note: string; photoId?: string | null }) =>
      api<SafetyResult>("/api/me/report", {
        method: "POST",
        body: {
          ...(v.isMatch ? { matchId: v.dateId } : { dateId: v.dateId }),
          reason: v.reason,
          ...(v.note.trim() ? { note: v.note.trim() } : {}),
          ...(v.photoId ? { photoId: v.photoId } : {}),
        },
      }),
    onSuccess: () => refreshSafety(qc),
    // Gone (they left Kismet): drop the stale card or match from the lists.
    onError: (e) => {
      if (isGone(e)) refreshSafety(qc);
    },
  });
}

export function useBlock() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (v: { dateId: string; block: boolean }) =>
      api<SafetyResult>("/api/me/block", { method: v.block ? "POST" : "DELETE", body: { dateId: v.dateId } }),
    onSuccess: () => refreshSafety(qc),
    // Gone (they left Kismet): drop the stale card or match from the lists.
    onError: (e) => {
      if (isGone(e)) refreshSafety(qc);
    },
  });
}

export function useDeleteAccount() {
  const { signOut } = useAuth();
  return useMutation({
    mutationFn: () => api<{ ok: true }>("/api/me", { method: "DELETE" }),
    onSuccess: () => signOut(),
  });
}
