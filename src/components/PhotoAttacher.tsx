"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
} from "react";

export type ImageMeta = {
  id: string;
  mimeType: string;
  sizeBytes: number;
  position: number;
  createdAt: number;
};

type PendingUpload = {
  key: string;
  name: string;
  status: "uploading" | "error";
  error?: string;
  file: File;
};

const MAX_IMAGES = 10;
const LONG_EDGE_PX = 1600;
const JPEG_QUALITY = 0.85;

const DATE_FMT = new Intl.DateTimeFormat("en-GB", {
  day: "2-digit",
  month: "short",
  year: "numeric",
});

function formatDate(ts: number): string {
  return DATE_FMT.format(new Date(ts));
}

async function compressToJpeg(file: File): Promise<Blob> {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error("decode_failed"));
      el.src = url;
    });

    const { naturalWidth: w, naturalHeight: h } = img;
    const longEdge = Math.max(w, h);
    const scale = longEdge > LONG_EDGE_PX ? LONG_EDGE_PX / longEdge : 1;
    const targetW = Math.max(1, Math.round(w * scale));
    const targetH = Math.max(1, Math.round(h * scale));

    const canvas = document.createElement("canvas");
    canvas.width = targetW;
    canvas.height = targetH;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("canvas_unavailable");
    ctx.drawImage(img, 0, 0, targetW, targetH);

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", JPEG_QUALITY),
    );
    if (!blob) throw new Error("encode_failed");
    return blob;
  } finally {
    URL.revokeObjectURL(url);
  }
}

export function PhotoAttacher({
  visitId,
  initial,
}: {
  visitId: string;
  initial: ImageMeta[];
}) {
  const [images, setImages] = useState<ImageMeta[]>(() =>
    [...initial].sort((a, b) => a.position - b.position || a.id.localeCompare(b.id)),
  );
  const [pending, setPending] = useState<PendingUpload[]>([]);
  const [lightboxIdx, setLightboxIdx] = useState<number | null>(null);
  const [confirmRemove, setConfirmRemove] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const total = images.length + pending.filter((p) => p.status === "uploading").length;
  const canAdd = total < MAX_IMAGES;

  const openPicker = useCallback(() => {
    if (!canAdd) return;
    fileInputRef.current?.click();
  }, [canAdd]);

  const uploadOne = useCallback(
    async (file: File, key: string) => {
      try {
        const blob = await compressToJpeg(file);
        const form = new FormData();
        form.append("file", blob, "photo.jpg");
        const res = await fetch(`/api/visits/${visitId}/images`, {
          method: "POST",
          body: form,
        });
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          const msg =
            typeof body?.error === "string" ? body.error : `http_${res.status}`;
          throw new Error(msg);
        }
        const row = (await res.json()) as ImageMeta;
        setImages((prev) =>
          [...prev, row].sort(
            (a, b) => a.position - b.position || a.id.localeCompare(b.id),
          ),
        );
        setPending((prev) => prev.filter((p) => p.key !== key));
      } catch (err) {
        const msg = err instanceof Error ? err.message : "upload_failed";
        setPending((prev) =>
          prev.map((p) =>
            p.key === key ? { ...p, status: "error", error: msg } : p,
          ),
        );
      }
    },
    [visitId],
  );

  const handleFiles = useCallback(
    async (files: FileList) => {
      const picked = Array.from(files);
      const remaining = Math.max(0, MAX_IMAGES - total);
      const accepted = picked.slice(0, remaining);
      if (accepted.length === 0) return;

      const queued: PendingUpload[] = accepted.map((file, i) => ({
        key: `${Date.now()}-${i}-${file.name}`,
        name: file.name,
        status: "uploading",
        file,
      }));
      setPending((prev) => [...prev, ...queued]);
      // Sequential uploads — keeps UI clear and backend predictable.
      for (const item of queued) {
        await uploadOne(item.file, item.key);
      }
    },
    [total, uploadOne],
  );

  const onFileChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (files && files.length > 0) {
        void handleFiles(files);
      }
      // Reset input so picking the same file twice in a row still fires change.
      e.target.value = "";
    },
    [handleFiles],
  );

  const retryOne = useCallback(
    (key: string) => {
      setPending((prev) =>
        prev.map((p) =>
          p.key === key ? { ...p, status: "uploading", error: undefined } : p,
        ),
      );
      const item = pending.find((p) => p.key === key);
      if (item) void uploadOne(item.file, key);
    },
    [pending, uploadOne],
  );

  const dismissError = useCallback((key: string) => {
    setPending((prev) => prev.filter((p) => p.key !== key));
  }, []);

  const removeImage = useCallback(
    async (imageId: string) => {
      const res = await fetch(`/api/visits/${visitId}/images/${imageId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setImages((prev) => prev.filter((img) => img.id !== imageId));
        setConfirmRemove(null);
        setLightboxIdx((cur) => (cur === null ? cur : null));
      }
    },
    [visitId],
  );

  // Lightbox keybindings
  useEffect(() => {
    if (lightboxIdx === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setLightboxIdx(null);
      if (e.key === "ArrowLeft")
        setLightboxIdx((cur) => (cur === null ? null : Math.max(0, cur - 1)));
      if (e.key === "ArrowRight")
        setLightboxIdx((cur) =>
          cur === null ? null : Math.min(images.length - 1, cur + 1),
        );
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [lightboxIdx, images.length]);

  const hasAny = images.length > 0 || pending.length > 0;
  const lightboxImage =
    lightboxIdx !== null && lightboxIdx < images.length
      ? images[lightboxIdx]
      : null;

  const helper = useMemo(
    () =>
      "Click to capture or browse from device. JPG / PNG / WebP, up to 5MB each, 10 max.",
    [],
  );

  return (
    <section className="mt-10">
      <div className="mb-3 flex items-baseline justify-between">
        <div className="eyebrow">Prescription photos</div>
        {hasAny ? (
          <span className="font-mono text-xs text-[--color-muted]">
            {images.length} of {MAX_IMAGES}
          </span>
        ) : null}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        multiple
        hidden
        onChange={onFileChange}
      />

      {!hasAny ? (
        <button
          type="button"
          onClick={openPicker}
          disabled={!canAdd}
          className="flex w-full flex-col items-center justify-center gap-3 rounded-[14px] border border-dashed border-[--color-rule] bg-[--color-card] px-6 py-10 text-center transition hover:border-[--color-muted-2] hover:bg-[--color-paper-2] disabled:opacity-50"
        >
          <span className="flex h-10 w-10 items-center justify-center rounded-full border border-[--color-rule] bg-[--color-paper]">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              className="h-5 w-5 text-[--color-ink-soft]"
              aria-hidden
            >
              <path
                d="M12 5v14M5 12h14"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
              />
            </svg>
          </span>
          <span className="font-display text-base font-medium">Add photo</span>
          <span className="max-w-xs font-mono text-xs leading-relaxed text-[--color-muted]">
            {helper}
          </span>
        </button>
      ) : (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
          {images.map((img, idx) => (
            <figure
              key={img.id}
              className="group relative overflow-hidden rounded-[10px] border border-[--color-rule] bg-[--color-card]"
            >
              <button
                type="button"
                onClick={() => setLightboxIdx(idx)}
                className="block aspect-[3/4] w-full overflow-hidden"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={`/api/visits/${visitId}/images/${img.id}`}
                  alt={`Prescription photo ${idx + 1}`}
                  className="h-full w-full object-cover transition group-hover:scale-[1.02]"
                />
              </button>

              <button
                type="button"
                onClick={() => setConfirmRemove(img.id)}
                className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full border border-[--color-rule] bg-[--color-card] text-[--color-ink] opacity-0 shadow-sm transition hover:border-[--color-ink] group-hover:opacity-100"
                aria-label="Remove photo"
              >
                <svg viewBox="0 0 24 24" fill="none" className="h-3.5 w-3.5">
                  <path
                    d="M6 6l12 12M18 6L6 18"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                  />
                </svg>
              </button>

              {confirmRemove === img.id ? (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-[--color-card]/95 p-4 text-center">
                  <p className="font-display text-sm">Remove this photo?</p>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => removeImage(img.id)}
                      className="rounded-md border border-[--color-rust] bg-[--color-rust] px-3 py-1 text-xs font-medium text-white"
                    >
                      Remove
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmRemove(null)}
                      className="rounded-md border border-[--color-rule] bg-[--color-card] px-3 py-1 text-xs font-medium"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : null}

              <figcaption className="border-t border-[--color-rule] px-2.5 py-1.5 font-mono text-[10px] uppercase tracking-wider text-[--color-muted]">
                {formatDate(img.createdAt)}
              </figcaption>
            </figure>
          ))}

          {pending.map((p) => (
            <div
              key={p.key}
              className="relative flex aspect-[3/4] flex-col items-center justify-center gap-2 rounded-[10px] border border-dashed border-[--color-rule] bg-[--color-card] p-4 text-center"
            >
              {p.status === "uploading" ? (
                <>
                  <span className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-[--color-rule] border-t-[--color-ink]" />
                  <span className="font-mono text-[10px] uppercase tracking-wider text-[--color-muted]">
                    Uploading…
                  </span>
                </>
              ) : (
                <>
                  <span className="font-display text-sm text-[--color-rust]">
                    Upload failed
                  </span>
                  <span className="font-mono text-[10px] text-[--color-muted]">
                    {p.error}
                  </span>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => retryOne(p.key)}
                      className="rounded-md border border-[--color-ink] bg-[--color-ink] px-2.5 py-1 text-[11px] font-medium text-white"
                    >
                      Retry
                    </button>
                    <button
                      type="button"
                      onClick={() => dismissError(p.key)}
                      className="rounded-md border border-[--color-rule] px-2.5 py-1 text-[11px]"
                    >
                      Dismiss
                    </button>
                  </div>
                </>
              )}
            </div>
          ))}

          {canAdd ? (
            <button
              type="button"
              onClick={openPicker}
              className="flex aspect-[3/4] flex-col items-center justify-center gap-2 rounded-[10px] border border-dashed border-[--color-rule] bg-[--color-card] text-center transition hover:border-[--color-muted-2] hover:bg-[--color-paper-2]"
            >
              <span className="flex h-9 w-9 items-center justify-center rounded-full border border-[--color-rule] bg-[--color-paper]">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  className="h-4 w-4"
                  aria-hidden
                >
                  <path
                    d="M12 5v14M5 12h14"
                    stroke="currentColor"
                    strokeWidth="1.6"
                    strokeLinecap="round"
                  />
                </svg>
              </span>
              <span className="font-display text-sm">Add photo</span>
            </button>
          ) : null}
        </div>
      )}

      {hasAny ? (
        <p className="mt-3 font-mono text-[11px] leading-relaxed text-[--color-muted]">
          {helper}
        </p>
      ) : null}

      {lightboxImage ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-6"
          role="dialog"
          aria-modal="true"
          onClick={(e) => {
            if (e.target === e.currentTarget) setLightboxIdx(null);
          }}
        >
          <button
            type="button"
            onClick={() => setLightboxIdx(null)}
            aria-label="Close"
            className="absolute right-5 top-5 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/20"
          >
            <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5">
              <path
                d="M6 6l12 12M18 6L6 18"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
              />
            </svg>
          </button>

          {lightboxIdx !== null && lightboxIdx > 0 ? (
            <button
              type="button"
              onClick={() =>
                setLightboxIdx((cur) => (cur === null ? null : cur - 1))
              }
              aria-label="Previous"
              className="absolute left-5 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/20"
            >
              <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5">
                <path
                  d="m15 18-6-6 6-6"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
          ) : null}
          {lightboxIdx !== null && lightboxIdx < images.length - 1 ? (
            <button
              type="button"
              onClick={() =>
                setLightboxIdx((cur) => (cur === null ? null : cur + 1))
              }
              aria-label="Next"
              className="absolute right-5 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/20"
            >
              <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5">
                <path
                  d="m9 18 6-6-6-6"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
          ) : null}

          <figure className="flex max-h-full max-w-full flex-col items-center gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={`/api/visits/${visitId}/images/${lightboxImage.id}`}
              alt="Prescription photo"
              className="max-h-[80vh] max-w-[90vw] rounded-md object-contain"
            />
            <figcaption className="font-mono text-xs uppercase tracking-wider text-white/80">
              Photo {lightboxIdx! + 1} of {images.length} · uploaded{" "}
              {formatDate(lightboxImage.createdAt)}
            </figcaption>
          </figure>
        </div>
      ) : null}
    </section>
  );
}
