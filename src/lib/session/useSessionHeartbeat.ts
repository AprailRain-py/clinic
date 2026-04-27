"use client";

/**
 * useSessionHeartbeat — polls `/api/auth/session` every `intervalMs` and
 * fires onExpired() / onRestored() on authenticated → unauth'd transitions.
 *
 * Transient fetch errors are ignored (don't flip state).
 *
 * DEV_BYPASS caveat: in bypass mode, NextAuth's /api/auth/session returns
 * `{}` because there's no real session cookie. We only flip to "expired"
 * after we've *previously* observed a valid `{ user }` payload, so bypass
 * mode never triggers the expired modal organically. Tests use
 * `window.__testHooks.forceExpired = true` as a dev-only backdoor.
 *
 * Test backdoor: `window.__testHooks.heartbeatMs` overrides intervalMs.
 */
import { useEffect, useRef } from "react";

export type SessionHeartbeatConfig = {
  intervalMs: number;
  onExpired: () => void;
  onRestored: () => void;
};

type SessionPayload = { user?: { id?: string; email?: string } } | null;

export function useSessionHeartbeat(config: SessionHeartbeatConfig): void {
  const { intervalMs: rawInterval, onExpired, onRestored } = config;

  const onExpiredRef = useRef(onExpired);
  const onRestoredRef = useRef(onRestored);
  onExpiredRef.current = onExpired;
  onRestoredRef.current = onRestored;

  useEffect(() => {
    if (typeof window === "undefined") return;
    const hooks = window.__testHooks;
    const intervalMs = hooks?.heartbeatMs ?? rawInterval;

    // Start in "unknown" so an initial `{}` doesn't fire onExpired().
    let wasAuthed: boolean | null = null;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | null = null;

    const tick = async () => {
      try {
        const res = await fetch("/api/auth/session", {
          credentials: "same-origin",
          cache: "no-store",
        });
        if (!res.ok) throw new Error(`status_${res.status}`);
        const body = (await res.json()) as SessionPayload;
        const isAuthed = !!body?.user;
        if (cancelled) return;
        if (wasAuthed === true && !isAuthed) {
          try {
            onExpiredRef.current();
          } catch {
            // ignore
          }
        } else if (wasAuthed === false && isAuthed) {
          try {
            onRestoredRef.current();
          } catch {
            // ignore
          }
        }
        wasAuthed = isAuthed;
      } catch {
        // transient — keep previous state.
      } finally {
        if (!cancelled) {
          timer = setTimeout(tick, intervalMs);
        }
      }
    };

    // First fire establishes the baseline ASAP.
    tick();

    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [rawInterval]);
}
