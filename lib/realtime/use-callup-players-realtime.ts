"use client";

import { useEffect, useId, useRef } from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";

import { createSupabaseBrowserClient } from "@/lib/db/supabase-browser";
import {
  isCallupsChangeForCallups,
  isPlayersChangeForCallups,
  type CallupsChangePayload,
  type PlayersChangePayload,
} from "@/lib/realtime/callup-players-events";

type UseCallupPlayersRealtimeOptions = {
  /** Callup ids currently relevant (expanded detail and/or list page). */
  callupIds: readonly string[];
  /** Invoked when roster or callup status/counts change (debounce coalesced). */
  onChange: () => void;
  enabled?: boolean;
};

/**
 * Live callup UI (spec §11.7): `postgres_changes` on `players` + `callups`.
 * Refetch must refresh roster, summary counts (7/12), and status (Open/Full/…).
 * Used by public channel, PlayerRoster, AdminRoster, and caller dashboard list.
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
    let channel: RealtimeChannel | null = null;
    const ids = idsKey.split(",").filter(Boolean);
    const supabase = createSupabaseBrowserClient();
    const channelName = `callup-live:${instanceId}:${idsKey.slice(0, 64)}`;

    function scheduleNotify() {
      if (cancelled) return;
      if (debounceTimer !== undefined) {
        window.clearTimeout(debounceTimer);
      }
      debounceTimer = window.setTimeout(() => {
        onChangeRef.current();
      }, 150);
    }

    void (async () => {
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;
      if (token) {
        await supabase.realtime.setAuth(token);
      }
      if (cancelled) return;

      channel = supabase
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
            scheduleNotify();
          },
        )
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "callups",
          },
          (payload) => {
            if (cancelled) return;
            const mapped: CallupsChangePayload = {
              eventType: payload.eventType,
              new: payload.new as CallupsChangePayload["new"],
              old: payload.old as CallupsChangePayload["old"],
            };
            if (!isCallupsChangeForCallups(mapped, ids)) return;
            scheduleNotify();
          },
        )
        .subscribe();
    })();

    return () => {
      cancelled = true;
      if (debounceTimer !== undefined) {
        window.clearTimeout(debounceTimer);
      }
      if (channel) {
        void supabase.removeChannel(channel);
      }
    };
  }, [enabled, idsKey, instanceId]);
}

export { callupIdFromPlayersChange } from "@/lib/realtime/callup-players-events";
