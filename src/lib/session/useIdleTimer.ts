"use client";

/**
 * useIdleTimer — fires a warning callback and an idle callback when the user
 * has been inactive for configurable durations.
 *
 * Test backdoor (dev-only):
 *   Tests inject `window.__testHooks = { idleMs, warningMs, heartbeatMs }` via
 *   `page.addInitScript` BEFORE navigation. The hook honors those values on
 *   mount so deterministic timing doesn't require rebuilding with
 *   NEXT_PUBLIC_* env vars (which Next inlines at build time).
 *
 * Activity signals: mousemove, mousedown, keydown, touchstart, scroll.
 * Activity is throttled to ≤1 per 500ms to avoid spamming React.
 */
import { useEffect, useRef } from "react";

export type IdleTimerConfig = {
  idleMs: number;
  warningMs: number;
  onWarn: () => void;
  onIdle: () => void;
  enabled: boolean;
};

declare global {
  interface Window {
    __testHooks?: {
      idleMs?: number;
      warningMs?: number;
      heartbeatMs?: number;
      forceExpired?: boolean;
    };
  }
}

const ACTIVITY_EVENTS = [
  "mousemove",
  "mousedown",
  "keydown",
  "touchstart",
  "scroll",
] as const;

export function useIdleTimer(config: IdleTimerConfig): void {
  const {
    idleMs: rawIdleMs,
    warningMs: rawWarningMs,
    onWarn,
    onIdle,
    enabled,
  } = config;

  // Stash callbacks in refs so we don't reset the effect when they change.
  const onWarnRef = useRef(onWarn);
  const onIdleRef = useRef(onIdle);
  onWarnRef.current = onWarn;
  onIdleRef.current = onIdle;

  useEffect(() => {
    if (!enabled || typeof window === "undefined") return;

    const hooks = window.__testHooks;
    const idleMs = hooks?.idleMs ?? rawIdleMs;
    const warningMs = hooks?.warningMs ?? rawWarningMs;

    let warnTimer: ReturnType<typeof setTimeout> | null = null;
    let idleTimer: ReturnType<typeof setTimeout> | null = null;
    let lastActivity = 0;

    const clear = () => {
      if (warnTimer) clearTimeout(warnTimer);
      if (idleTimer) clearTimeout(idleTimer);
      warnTimer = null;
      idleTimer = null;
    };

    const schedule = () => {
      clear();
      // Warn fires at (idleMs - warningMs) from now.
      const warnDelay = Math.max(0, idleMs - warningMs);
      warnTimer = setTimeout(() => {
        try {
          onWarnRef.current();
        } catch {
          // swallow — UX-only
        }
      }, warnDelay);
      idleTimer = setTimeout(() => {
        try {
          onIdleRef.current();
        } catch {
          // swallow — UX-only
        }
      }, idleMs);
    };

    const onActivity = () => {
      const now = Date.now();
      if (now - lastActivity < 500) return;
      lastActivity = now;
      schedule();
    };

    schedule();
    for (const ev of ACTIVITY_EVENTS) {
      window.addEventListener(ev, onActivity, { passive: true });
    }

    return () => {
      clear();
      for (const ev of ACTIVITY_EVENTS) {
        window.removeEventListener(ev, onActivity);
      }
    };
  }, [enabled, rawIdleMs, rawWarningMs]);
}
