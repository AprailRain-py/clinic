"use client";

import { useEffect, useRef, useState } from "react";

export type ReAuthModalProps = {
  mode: "expired" | "idle-locked";
  onClose?: () => void;
};

/**
 * ReAuthModal — non-dismissable full-viewport overlay shown when the session
 * has expired or the idle-lock fired. Opens /login in a popup and waits for
 * the session to come back via the parent's heartbeat.
 */
export function ReAuthModal({ mode, onClose }: ReAuthModalProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const signInBtnRef = useRef<HTMLButtonElement>(null);
  const [showWhy, setShowWhy] = useState(false);

  // Focus trap: on mount, focus the sign-in button. Also keep focus inside.
  useEffect(() => {
    signInBtnRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      // ESC must not close the modal — this is a security feature.
      if (e.key === "Escape") {
        e.preventDefault();
        e.stopPropagation();
        return;
      }
      if (e.key === "Tab") {
        const root = dialogRef.current;
        if (!root) return;
        const focusables = root.querySelectorAll<HTMLElement>(
          'button, [href], input, [tabindex]:not([tabindex="-1"])',
        );
        if (focusables.length === 0) return;
        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener("keydown", onKey, true);
    return () => document.removeEventListener("keydown", onKey, true);
  }, []);

  const headingId =
    mode === "expired" ? "reauth-modal-expired" : "reauth-modal-locked";
  const heading =
    mode === "expired" ? "Your session has ended" : "Locked for your privacy";
  const body =
    mode === "expired"
      ? "To keep patient records safe, we signed you out after a period of inactivity. Sign in again to continue — your prescription draft is preserved."
      : "We locked this window after 20 minutes of inactivity. Sign in to resume exactly where you left off.";

  const openSignIn = () => {
    try {
      const popup = window.open(
        "/login",
        "_blank",
        "width=520,height=640,noopener=no",
      );
      // If the popup was blocked, fall back to same-tab navigation.
      if (!popup) {
        window.location.href = "/login";
      }
    } catch {
      window.location.href = "/login";
    }
  };

  return (
    <div
      ref={dialogRef}
      role="dialog"
      aria-modal="true"
      aria-labelledby={headingId}
      data-testid={
        mode === "expired" ? "reauth-modal-expired" : "reauth-modal-locked"
      }
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        backgroundColor: "rgba(16, 16, 18, 0.72)",
        backdropFilter: "blur(6px)",
        WebkitBackdropFilter: "blur(6px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "1.5rem",
      }}
    >
      <div
        className="card"
        style={{
          maxWidth: 440,
          width: "100%",
          padding: "2rem",
          background: "var(--color-paper)",
          color: "var(--color-ink)",
          borderRadius: 16,
          boxShadow: "0 24px 72px rgba(0,0,0,0.35)",
        }}
      >
        <div
          aria-hidden
          style={{
            width: 44,
            height: 44,
            borderRadius: 999,
            background:
              mode === "expired"
                ? "color-mix(in srgb, var(--color-rust) 18%, white)"
                : "color-mix(in srgb, var(--color-ochre) 20%, white)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            marginBottom: 16,
          }}
        >
          <svg viewBox="0 0 24 24" fill="none" width="22" height="22">
            {mode === "expired" ? (
              <path
                d="M12 7v5l3 2M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            ) : (
              <path
                d="M6 10V7a6 6 0 1 1 12 0v3M5 10h14v10H5z"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            )}
          </svg>
        </div>
        <h2
          id={headingId}
          className="font-display"
          style={{
            fontSize: 24,
            fontWeight: 500,
            margin: 0,
            letterSpacing: "-0.01em",
          }}
        >
          {heading}
        </h2>
        <p
          style={{
            marginTop: 12,
            color: "var(--color-muted)",
            fontSize: 14,
            lineHeight: 1.55,
          }}
        >
          {body}
        </p>

        <div style={{ marginTop: 20, display: "flex", gap: 8 }}>
          <button
            ref={signInBtnRef}
            type="button"
            className="btn-primary"
            onClick={openSignIn}
            data-testid="reauth-sign-in"
          >
            Sign in again
          </button>
          {onClose ? (
            <button
              type="button"
              className="btn-ghost"
              onClick={onClose}
              data-testid="reauth-retry"
            >
              I've signed in
            </button>
          ) : null}
        </div>

        <button
          type="button"
          onClick={() => setShowWhy((v) => !v)}
          aria-expanded={showWhy}
          style={{
            marginTop: 18,
            fontSize: 11,
            color: "var(--color-muted)",
            background: "transparent",
            border: "none",
            padding: 0,
            cursor: "pointer",
            textDecoration: "underline",
            fontFamily: "var(--font-mono)",
            textTransform: "uppercase",
            letterSpacing: "0.06em",
          }}
        >
          Why am I seeing this?
        </button>
        {showWhy ? (
          <p
            style={{
              marginTop: 8,
              fontSize: 12,
              color: "var(--color-muted)",
              lineHeight: 1.5,
            }}
          >
            {mode === "expired"
              ? "HIPAA recommends ending inactive clinical sessions. Your draft is saved every few seconds, so nothing is lost."
              : "After 20 minutes without activity we lock the screen. Any open draft is autosaved; just sign in to resume."}
          </p>
        ) : null}
      </div>
    </div>
  );
}
