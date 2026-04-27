"use client";

/**
 * SessionGuard — mounted once at the root layout. Combines an idle-timer
 * (20 min default) and a session-heartbeat (60s default) to show:
 *   - a warning toast ~60s before the idle lock
 *   - a full-screen lock overlay at the idle threshold
 *   - a re-auth modal when the session heartbeat reports expiry
 *
 * Does not render on /login or /api/* paths (pathname-based early exit).
 *
 * Dev-only test backdoor: window.__testHooks.forceExpired = true forces the
 * "expired" modal on first render, so Playwright can test that path even in
 * DEV_BYPASS where the heartbeat never organically reports expiry.
 */

import { usePathname } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { ReAuthModal } from "./ReAuthModal";
import { useIdleTimer } from "@/lib/session/useIdleTimer";
import { useSessionHeartbeat } from "@/lib/session/useSessionHeartbeat";

const DEFAULT_IDLE_MS = 20 * 60 * 1000; // 20 min
const DEFAULT_WARNING_MS = 60 * 1000; // warn 60s before lock
const DEFAULT_HEARTBEAT_MS = 60 * 1000; // heartbeat every 60s

export function SessionGuard() {
  const pathname = usePathname();
  const [expired, setExpired] = useState(false);
  const [idleLocked, setIdleLocked] = useState(false);
  const [warning, setWarning] = useState(false);
  const [mounted, setMounted] = useState(false);

  // Suppress the guard on /login and API routes.
  const suppressed =
    !pathname ||
    pathname === "/login" ||
    pathname.startsWith("/login/") ||
    pathname.startsWith("/api/");

  useEffect(() => {
    setMounted(true);
    // Test backdoor: if forceExpired was set before we mounted, honor it.
    if (typeof window !== "undefined" && window.__testHooks?.forceExpired) {
      setExpired(true);
    }
  }, []);

  // When activity resumes, drop the warning toast. (The idle-lock modal is
  // non-dismissable by design; warning is an ephemeral heads-up.)
  useEffect(() => {
    if (!warning) return;
    if (idleLocked) return;
    const clear = () => setWarning(false);
    const events = ["mousemove", "mousedown", "keydown", "touchstart"] as const;
    for (const ev of events) {
      window.addEventListener(ev, clear, { passive: true, once: true });
    }
    return () => {
      for (const ev of events) {
        window.removeEventListener(ev, clear);
      }
    };
  }, [warning, idleLocked]);

  const onWarn = useCallback(() => {
    if (!idleLocked) setWarning(true);
  }, [idleLocked]);

  const onIdle = useCallback(() => {
    setWarning(false);
    setIdleLocked(true);
  }, []);

  const onExpired = useCallback(() => {
    setExpired(true);
  }, []);

  const onRestored = useCallback(() => {
    setExpired(false);
    setIdleLocked(false);
  }, []);

  useIdleTimer({
    idleMs: DEFAULT_IDLE_MS,
    warningMs: DEFAULT_WARNING_MS,
    onWarn,
    onIdle,
    enabled: !suppressed && mounted,
  });

  useSessionHeartbeat({
    intervalMs: DEFAULT_HEARTBEAT_MS,
    onExpired,
    onRestored,
  });

  if (suppressed) return null;
  if (!mounted) return null;

  // Idle-lock takes precedence — it's the stricter overlay.
  if (idleLocked) {
    return <ReAuthModal mode="idle-locked" onClose={() => setIdleLocked(false)} />;
  }
  if (expired) {
    return <ReAuthModal mode="expired" onClose={() => setExpired(false)} />;
  }

  if (warning) {
    return (
      <div
        role="status"
        aria-live="polite"
        data-testid="idle-warning-toast"
        style={{
          position: "fixed",
          right: 20,
          bottom: 20,
          zIndex: 9998,
          maxWidth: 360,
          padding: "12px 16px",
          borderRadius: 12,
          background: "var(--color-ink)",
          color: "var(--color-paper)",
          boxShadow: "0 12px 32px rgba(0,0,0,0.25)",
          fontSize: 13,
          lineHeight: 1.4,
        }}
      >
        You'll be locked in 60 seconds — move the mouse to stay signed in.
      </div>
    );
  }

  return null;
}
