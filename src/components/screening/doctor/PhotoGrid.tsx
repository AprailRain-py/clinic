"use client";

import { useState } from "react";
import {
  screeningImageUrl,
  type ScreeningImage,
} from "@/lib/screening/client";
import { ORAL_VIEWS, CONDITIONAL_VIEWS } from "@/lib/screening/oral-form";
import { AiSlot } from "@/components/screening/primitives";

// Map the API viewType ids to the human capture-view labels.
const VIEW_LABELS: Record<string, string> = Object.fromEntries(
  [...ORAL_VIEWS, ...CONDITIONAL_VIEWS].map((v) => [v.id, v.label]),
);

function viewLabel(viewType: string): string {
  return VIEW_LABELS[viewType] ?? viewType.replace(/_/g, " ");
}

/**
 * The captured-photo grid for the doctor case detail. Tapping a cell opens a
 * full-screen zoom overlay that ALSO reserves the (disabled) AI heatmap slot.
 */
export function PhotoGrid({
  screeningId,
  images,
}: {
  screeningId: string;
  images: ScreeningImage[];
}) {
  const [zoom, setZoom] = useState<number | null>(null);
  const active = zoom != null ? images[zoom] : null;

  return (
    <div>
      <div className="eyebrow" style={{ marginBottom: 10 }}>
        Photo set · {images.length} {images.length === 1 ? "view" : "views"}
      </div>

      {images.length === 0 ? (
        <div className="card" style={{ padding: 16 }}>
          <div className="scr-sub">No photos were captured for this screening.</div>
        </div>
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            gap: 8,
          }}
        >
          {images.map((img, i) => (
            <button
              key={img.id}
              type="button"
              onClick={() => setZoom(i)}
              style={{
                position: "relative",
                aspectRatio: "1",
                borderRadius: 12,
                overflow: "hidden",
                border: "1px solid var(--line)",
                padding: 0,
                cursor: "pointer",
                background: "var(--screen)",
                display: "flex",
                alignItems: "flex-end",
              }}
            >
              <img
                src={screeningImageUrl(screeningId, img.id)}
                alt={viewLabel(img.viewType)}
                style={{
                  position: "absolute",
                  inset: 0,
                  width: "100%",
                  height: "100%",
                  objectFit: "cover",
                }}
              />
              <span
                style={{
                  position: "relative",
                  zIndex: 1,
                  width: "100%",
                  padding: "8px",
                  fontSize: 9,
                  fontWeight: 500,
                  lineHeight: 1.15,
                  color: "#fff",
                  textAlign: "left",
                  background:
                    "linear-gradient(transparent, rgba(11,20,19,0.7))",
                }}
              >
                {viewLabel(img.viewType)}
              </span>
            </button>
          ))}
        </div>
      )}

      {active && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 60,
            background: "#0b1413",
            display: "flex",
            flexDirection: "column",
            padding: 14,
            gap: 14,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <button
              type="button"
              onClick={() => setZoom(null)}
              aria-label="Close"
              style={{
                width: 40,
                height: 40,
                flex: "none",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                background: "rgba(255,255,255,0.12)",
                border: "none",
                borderRadius: "50%",
                cursor: "pointer",
              }}
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
            <div style={{ flex: 1, fontWeight: 600, fontSize: 15, color: "#fff" }}>
              {viewLabel(active.viewType)}
            </div>
          </div>

          <div
            style={{
              flex: 1,
              borderRadius: 16,
              overflow: "hidden",
              background: "#16211f",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <img
              src={screeningImageUrl(screeningId, active.id)}
              alt={viewLabel(active.viewType)}
              style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain" }}
            />
          </div>

          <AiSlot
            title="AI heatmap"
            caption="Highlights suspicious regions — coming later."
          />
        </div>
      )}
    </div>
  );
}
