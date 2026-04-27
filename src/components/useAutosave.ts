"use client";

/**
 * useAutosave — debounced autosave for arbitrary values.
 *
 *   const { status, lastSavedAt } = useAutosave({
 *     value,              // any JSON-serializable value
 *     save: async (v) => { await fetch(...) },
 *     delayMs: 3000,
 *     enabled: !!visitId, // gate so we don't save before draft exists
 *   });
 *
 * On each `value` change the hook:
 *   1) cancels any pending save
 *   2) schedules `save(value)` after `delayMs`
 *   3) flips `status` through idle → saving → saved / error
 *
 * Equality is shallow-JSON (JSON.stringify); good enough for Rx docs which
 * are always plain objects. A "no change" between renders is ignored, so
 * parent re-renders don't trigger spurious saves.
 */

import { useCallback, useEffect, useRef, useState } from "react";

export type AutosaveStatus = "idle" | "saving" | "saved" | "error";

export type UseAutosaveConfig<T> = {
  value: T;
  save: (value: T) => Promise<void>;
  delayMs?: number;
  enabled?: boolean;
};

export type UseAutosaveResult = {
  status: AutosaveStatus;
  lastSavedAt: Date | null;
  error: string | null;
  /** Manually flush any pending save immediately. */
  flush: () => Promise<void>;
};

export function useAutosave<T>(config: UseAutosaveConfig<T>): UseAutosaveResult {
  const { value, save, delayMs = 3000, enabled = true } = config;

  const [status, setStatus] = useState<AutosaveStatus>("idle");
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);

  const saveRef = useRef(save);
  saveRef.current = save;

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSerializedRef = useRef<string | null>(null);
  const pendingValueRef = useRef<T | null>(null);
  const inFlightRef = useRef<Promise<void> | null>(null);

  const runSave = useCallback(async () => {
    if (inFlightRef.current) return inFlightRef.current;
    const v = pendingValueRef.current;
    if (v === null || v === undefined) return;
    setStatus("saving");
    const p = (async () => {
      try {
        await saveRef.current(v as T);
        setStatus("saved");
        setLastSavedAt(new Date());
        setError(null);
      } catch (e) {
        setStatus("error");
        setError(e instanceof Error ? e.message : String(e));
      } finally {
        inFlightRef.current = null;
      }
    })();
    inFlightRef.current = p;
    return p;
  }, []);

  useEffect(() => {
    if (!enabled) return;
    let serialized: string;
    try {
      serialized = JSON.stringify(value);
    } catch {
      serialized = String(value);
    }
    // First observation: don't trigger save, just record the baseline.
    if (lastSerializedRef.current === null) {
      lastSerializedRef.current = serialized;
      return;
    }
    if (serialized === lastSerializedRef.current) return;
    lastSerializedRef.current = serialized;
    pendingValueRef.current = value;

    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      void runSave();
    }, delayMs);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [value, enabled, delayMs, runSave]);

  const flush = useCallback(async () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    await runSave();
  }, [runSave]);

  // On unmount, cancel any pending timer (don't force a final save — parent
  // owns the final submit).
  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  return { status, lastSavedAt, error, flush };
}
