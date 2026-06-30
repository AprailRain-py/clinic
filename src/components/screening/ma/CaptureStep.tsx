"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { LiveQualityPill } from "@/components/screening/primitives";
import { uploadScreeningImage } from "@/lib/screening/client";
import type { CaptureView } from "@/lib/screening/oral-form";
import { analyzeFrame } from "./helpers";
import type { CapturedMap, QualityResult } from "./types";

type Pending = { view: CaptureView; blob: Blob; quality: QualityResult; thumbUrl: string };

function makeThumb(source: HTMLCanvasElement | HTMLVideoElement): string {
  const sw = source instanceof HTMLVideoElement ? source.videoWidth : source.width;
  const sh = source instanceof HTMLVideoElement ? source.videoHeight : source.height;
  const w = 120;
  const h = sw ? Math.max(1, Math.round((w * sh) / sw)) : 120;
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const ctx = c.getContext("2d");
  if (ctx) ctx.drawImage(source, 0, 0, w, h);
  return c.toDataURL("image/jpeg", 0.6);
}

export default function CaptureStep({
  screeningId,
  views,
  captured,
  setCaptured,
  onReview,
}: {
  screeningId: string;
  views: CaptureView[];
  captured: CapturedMap;
  setCaptured: React.Dispatch<React.SetStateAction<CapturedMap>>;
  onReview: () => void;
}) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const firstUncaptured = views.find((v) => !captured[v.id])?.id ?? views[0].id;
  const [currentId, setCurrentId] = useState(firstUncaptured);
  const [liveState, setLiveState] = useState<QualityResult["state"]>("ok");
  const [pending, setPending] = useState<Pending | null>(null);
  const [cameraError, setCameraError] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const view = views.find((v) => v.id === currentId) ?? views[0];
  const capturedCount = views.filter((v) => captured[v.id]).length;
  const allCaptured = capturedCount === views.length;

  // --- camera lifecycle -----------------------------------------------------
  useEffect(() => {
    let cancelled = false;
    let interval: ReturnType<typeof setInterval> | null = null;

    async function start() {
      if (!navigator.mediaDevices?.getUserMedia) {
        setCameraError(true);
        return;
      }
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "environment" },
          audio: false,
        });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play().catch(() => undefined);
        }
        interval = setInterval(() => {
          const v = videoRef.current;
          if (!v || !v.videoWidth) return;
          setLiveState(analyzeFrame(v).state);
        }, 650);
      } catch {
        if (!cancelled) setCameraError(true);
      }
    }
    start();

    return () => {
      cancelled = true;
      if (interval) clearInterval(interval);
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    };
  }, []);

  const advanceAfter = useCallback(
    (capturedId: string) => {
      const next = views.find((v) => v.id !== capturedId && !captured[v.id]);
      if (next) setCurrentId(next.id);
    },
    [views, captured],
  );

  const doUpload = useCallback(
    async (v: CaptureView, blob: Blob, quality: QualityResult, thumbUrl: string) => {
      setBusy(true);
      setError(null);
      try {
        await uploadScreeningImage(screeningId, v.id, blob, quality);
        setCaptured((c) => ({ ...c, [v.id]: { viewId: v.id, quality, thumbUrl } }));
        advanceAfter(v.id);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Upload failed — try again.");
      } finally {
        setBusy(false);
      }
    },
    [screeningId, setCaptured, advanceAfter],
  );

  function shutter() {
    const v = videoRef.current;
    const canvas = canvasRef.current;
    if (!v || !canvas || !v.videoWidth || busy) return;
    canvas.width = v.videoWidth;
    canvas.height = v.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(v, 0, 0, canvas.width, canvas.height);
    const quality = analyzeFrame(canvas);
    const thumbUrl = makeThumb(canvas);
    canvas.toBlob(
      (blob) => {
        if (!blob) return;
        if (quality.pass) {
          void doUpload(view, blob, quality, thumbUrl);
        } else {
          setPending({ view, blob, quality, thumbUrl });
        }
      },
      "image/jpeg",
      0.9,
    );
  }

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.drawImage(img, 0, 0);
      const quality = analyzeFrame(canvas);
      const thumbUrl = makeThumb(canvas);
      URL.revokeObjectURL(url);
      void doUpload(view, file, quality, thumbUrl);
    };
    img.src = url;
  }

  const lqColor =
    liveState === "ok" ? "#a6f4c5" : liveState === "blurry" ? "#fca5a5" : "#fedf89";

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", minHeight: 0, background: "#0d1716" }}>
      {/* guided hint card */}
      <div style={{ flex: "none", background: "#fff", padding: "14px 16px" }}>
        <div
          style={{
            background: "var(--tl-50)",
            border: "1px solid var(--tl-100)",
            borderRadius: 14,
            padding: 14,
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
            <div style={{ font: "600 16px var(--ip-sans), sans-serif", color: "var(--tl-deep)" }}>
              {view.label}
            </div>
            <div className="mono" style={{ font: "500 12px var(--ip-mono), monospace", color: "var(--tl)" }}>
              {capturedCount} / {views.length}
            </div>
          </div>
          <div style={{ font: "400 13px var(--ip-sans), sans-serif", color: "#3c6b64", marginTop: 3 }}>
            {view.hint}
          </div>
        </div>
      </div>

      {/* camera area */}
      <div
        style={{
          flex: 1,
          position: "relative",
          overflow: "hidden",
          minHeight: 0,
          background: "radial-gradient(120% 80% at 50% 32%, #2a3c3a 0%, #0d1716 78%)",
        }}
      >
        {!cameraError && (
          <video
            ref={videoRef}
            playsInline
            autoPlay
            muted
            style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }}
          />
        )}

        {/* live quality pill */}
        {!cameraError && (
          <div style={{ position: "absolute", top: 14, left: 0, right: 0, display: "flex", justifyContent: "center", zIndex: 2 }}>
            <LiveQualityPill state={liveState} />
          </div>
        )}

        {/* framing rect */}
        <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", pointerEvents: "none", zIndex: 1 }}>
          <div style={{ width: "75%", height: "54%", border: "2.5px dashed rgba(255,255,255,.78)", borderRadius: 26 }} />
        </div>

        {/* scan line */}
        {!cameraError && (
          <div
            style={{
              position: "absolute",
              left: "15%",
              right: "15%",
              height: 2,
              background: "linear-gradient(90deg,transparent,rgba(94,224,192,.9),transparent)",
              animation: "om-scan 2.6s ease-in-out infinite alternate",
              zIndex: 1,
            }}
          />
        )}

        {cameraError && (
          <div
            style={{
              position: "absolute",
              inset: 0,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: 14,
              padding: 24,
              textAlign: "center",
              zIndex: 2,
            }}
          >
            <div style={{ color: "rgba(255,255,255,.85)", font: "500 14px var(--ip-sans), sans-serif" }}>
              Camera unavailable — take or pick a photo for<br />
              <strong>{view.label}</strong>
            </div>
            <label
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                background: "var(--tl)",
                color: "#fff",
                borderRadius: 12,
                padding: "13px 18px",
                font: "600 15px var(--ip-sans), sans-serif",
                cursor: "pointer",
              }}
            >
              Take photo
              <input
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handleFile}
                style={{ display: "none" }}
              />
            </label>
          </div>
        )}

        <div style={{ position: "absolute", bottom: 12, left: 14, font: "500 11px var(--ip-mono), monospace", color: "rgba(255,255,255,.4)", zIndex: 1 }}>
          {cameraError ? "fallback capture" : `live · quality ${liveState}`}
        </div>
      </div>

      {/* hidden capture canvas */}
      <canvas ref={canvasRef} style={{ display: "none" }} />

      {/* footer */}
      <div style={{ flex: "none", background: "#fff", borderTop: "1px solid var(--line)", padding: "14px 16px 18px" }}>
        {/* thumbnail strip */}
        <div style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 14 }}>
          {views.map((v, i) => {
            const shot = captured[v.id];
            const isCur = v.id === currentId;
            const cls = shot ? "thumb cap" : isCur ? "thumb cur" : "thumb";
            return (
              <div
                key={v.id}
                className={cls}
                title={v.label}
                onClick={() => setCurrentId(v.id)}
                style={
                  shot
                    ? {
                        backgroundImage: `url(${shot.thumbUrl})`,
                        backgroundSize: "cover",
                        backgroundPosition: "center",
                        position: "relative",
                      }
                    : undefined
                }
              >
                {shot ? (
                  <span
                    style={{
                      position: "absolute",
                      inset: 0,
                      background: "rgba(15,118,110,.45)",
                      borderRadius: 12,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  </span>
                ) : (
                  i + 1
                )}
              </div>
            );
          })}
        </div>

        {error && (
          <div style={{ color: "var(--hi-fg)", fontSize: 13, marginBottom: 10 }}>{error}</div>
        )}

        {pending ? (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              background: "var(--hi-bg)",
              border: "1px solid var(--hi-bd)",
              borderRadius: 14,
              padding: "12px 14px",
            }}
          >
            <div style={{ flex: 1 }}>
              <div style={{ font: "600 14px var(--ip-sans), sans-serif", color: "#912018" }}>
                {pending.quality.state === "dark" ? "Too dark" : "Too blurry"}
              </div>
              <div style={{ font: "400 12px var(--ip-sans), sans-serif", color: "var(--hi-fg)", marginTop: 1 }}>
                {pending.quality.state === "dark"
                  ? "Add more light and retake."
                  : "Hold steady, move closer and retake."}
              </div>
            </div>
            <button
              type="button"
              disabled={busy}
              onClick={() => {
                const p = pending;
                setPending(null);
                void doUpload(p.view, p.blob, p.quality, p.thumbUrl);
              }}
              style={{ background: "none", border: "none", font: "600 12px var(--ip-sans), sans-serif", color: "var(--muted)", cursor: "pointer", textDecoration: "underline" }}
            >
              Use anyway
            </button>
            <button
              type="button"
              onClick={() => setPending(null)}
              style={{ background: "var(--hi-fg)", border: "none", borderRadius: 11, padding: "11px 16px", font: "600 14px var(--ip-sans), sans-serif", color: "#fff", cursor: "pointer" }}
            >
              Retake
            </button>
          </div>
        ) : allCaptured ? (
          <button
            type="button"
            className="btn-primary"
            onClick={onReview}
            style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}
          >
            All views captured · Review screening
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
              <polyline points="9 6 15 12 9 18" />
            </svg>
          </button>
        ) : (
          !cameraError && (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
              <button
                type="button"
                onClick={shutter}
                disabled={busy}
                aria-label="Capture photo"
                style={{
                  width: 72,
                  height: 72,
                  borderRadius: "50%",
                  background: "#fff",
                  border: "4px solid var(--tl)",
                  cursor: busy ? "default" : "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  boxShadow: "0 4px 14px rgba(0,0,0,.12)",
                  opacity: busy ? 0.6 : 1,
                }}
              >
                <div style={{ width: 54, height: 54, borderRadius: "50%", background: "var(--tl)" }} />
              </button>
            </div>
          )
        )}
      </div>
    </div>
  );
}
