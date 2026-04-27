"use client";

import { useEffect, useRef, useState } from "react";

export function AutoPrint() {
  const firedRef = useRef(false);
  useEffect(() => {
    if (firedRef.current) return;
    firedRef.current = true;
    // Defer one frame so fonts/images can settle before the browser snapshots.
    const id = window.setTimeout(() => {
      window.print();
    }, 200);
    return () => window.clearTimeout(id);
  }, []);
  return null;
}

export function PrintButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="rx-toolbar-btn rx-toolbar-btn-primary"
    >
      Print
    </button>
  );
}

// Controls the rendered photos block client-side so toggling doesn't force
// a full navigation. We also keep a `?photos=0` URL param in sync so reloads
// (and thus auto-print flows) remember the choice.
export function PhotosToggle({ initial }: { initial: boolean }) {
  const [on, setOn] = useState(initial);

  useEffect(() => {
    const sections = document.querySelectorAll<HTMLElement>(
      "[data-photos-section]",
    );
    sections.forEach((el) => {
      el.style.display = on ? "" : "none";
    });
    try {
      const url = new URL(window.location.href);
      if (on) url.searchParams.delete("photos");
      else url.searchParams.set("photos", "0");
      window.history.replaceState({}, "", url.toString());
    } catch {
      // no-op if URL APIs unavailable
    }
  }, [on]);

  return (
    <label className="rx-toolbar-toggle">
      <input
        type="checkbox"
        checked={on}
        onChange={(e) => setOn(e.target.checked)}
      />
      <span>Include photos</span>
    </label>
  );
}
