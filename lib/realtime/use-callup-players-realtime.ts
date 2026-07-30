"use client";

import { useEffect, useId, useRef } from "react";

import { createSupabaseBrowserClient } from "@/lib/db/supabase-browser";
import {
  callupIdFromPlayersChange,
  isPlayersChangeForCallups,
  type PlayersChangePayload,
} from "@/lib/realtime/callup-players-events";

type UseCallupPlayersRealtimeOptions = {
  /** Callup ids currently relevant (expanded detail and/or list page). */
  callupIds: readonly string[];
  /** Invoked when a matching players row changes (debounce coalesced). */
  onChange: () => void;
  enabled?: boolean;
};

/**
 * Subscribes to `players` postgres_changes for live roster/list updates (spec §11).
 * Requires tables in `supabase_realtime` publication (migration 0004).
 *
 * Channel topic includes a stable per-hook instance id so list + roster can both
 * subscribe without "cannot add callbacks after subscribe()" on the singleton
 * browser client (same idsKey would otherwise reuse one channel).
 */
export function useCallupPlayersRealtime({
  callupIds,
  onChange,
  enabled = true,
}: UseCallupPlayersRealtimeOptions): void {
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  const idsKey = callupIds.slice().sort().join(",");
  const instanceId = useId().replace(/:/g, "");

  useEffect(() => {
    if (!enabled || !idsKey) return;

    let cancelled = false;
    let debounceTimer: number | undefined;
    const ids = idsKey.split(",").filter(Boolean);

    const supabase = createSupabaseBrowserClient();
    // Unique topic per hook instance — never re-open an already-subscribed channel.
    const channelName = `players-live:${instanceId}:${idsKey.slice(0, 64)}`;

    const channel = supabase
      .channel(channelName)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "players",
        },
        (payload) => {
          if (cancelled) return;
          const mapped: PlayersChangePayload = {
            eventType: payload.eventType,
            new: payload.new as PlayersChangePayload["new"],
            old: payload.old as PlayersChangePayload["old"],
          };
          if (!isPlayersChangeForCallups(mapped, ids)) return;
          if (debounceTimer !== undefined) {
            window.clearTimeout(debounceTimer);
          }
          debounceTimer = window.setTimeout(() => {
            onChangeRef.current();
          }, 150);
        },
      )
      .subscribe();

    return () => {
      cancelled = true;
      if (debounceTimer !== undefined) {
        window.clearTimeout(debounceTimer);
      }
      void supabase.removeChannel(channel);
    };
  }, [enabled, idsKey, instanceId]);
}

export { callupIdFromPlayersChange };
