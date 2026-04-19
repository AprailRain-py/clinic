'use client';

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';

type Props = {
  onRecognize: (text: string) => void;
  onClose: () => void;
};

type Stroke = { x: number; y: number; t: number }[];

// Feature-detect + thin wrapper around navigator.createHandwritingRecognizer.
// Chrome (Android, and desktop behind a flag) implements this.
// We treat the API as dynamic because TS lib does not ship types yet.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyRecognizer = any;

function canRecognize(): boolean {
  if (typeof window === 'undefined') return false;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const nav = navigator as any;
  return typeof nav.createHandwritingRecognizer === 'function';
}

export function HandwritingInput({ onRecognize, onClose }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [strokes, setStrokes] = useState<Stroke[]>([]);
  const currentStrokeRef = useRef<Stroke | null>(null);
  const startTimeRef = useRef<number>(0);
  const recognizerRef = useRef<AnyRecognizer | null>(null);
  const [status, setStatus] = useState<'idle' | 'busy' | 'error' | 'unsupported'>('idle');
  const [supported, setSupported] = useState<boolean | null>(null);
  const [drawing, setDrawing] = useState(false);

  // Init recognizer + probe support
  useEffect(() => {
    let cancelled = false;
    const probe = async () => {
      if (!canRecognize()) {
        if (!cancelled) {
          setSupported(false);
          setStatus('unsupported');
        }
        return;
      }
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const nav = navigator as any;
        const rec: AnyRecognizer = await nav.createHandwritingRecognizer({
          languages: ['en'],
        });
        if (cancelled) return;
        recognizerRef.current = rec;
        setSupported(true);
        startTimeRef.current = performance.now();
      } catch {
        if (!cancelled) {
          setSupported(false);
          setStatus('unsupported');
        }
      }
    };
    void probe();
    return () => {
      cancelled = true;
    };
  }, []);

  // Size canvas to its layout box for crisp lines
  useLayoutEffect(() => {
    const c = canvasRef.current;
    if (!c) return;
    const dpr = window.devicePixelRatio || 1;
    const rect = c.getBoundingClientRect();
    c.width = rect.width * dpr;
    c.height = rect.height * dpr;
    const ctx = c.getContext('2d');
    if (ctx) {
      ctx.scale(dpr, dpr);
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.strokeStyle = '#191714';
      ctx.lineWidth = 2;
    }
  }, []);

  const redraw = useCallback(() => {
    const c = canvasRef.current;
    if (!c) return;
    const ctx = c.getContext('2d');
    if (!ctx) return;
    const dpr = window.devicePixelRatio || 1;
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, c.width, c.height);
    ctx.restore();
    ctx.strokeStyle = '#191714';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    for (const stroke of strokes) {
      if (stroke.length < 2) continue;
      ctx.beginPath();
      ctx.moveTo(stroke[0].x, stroke[0].y);
      for (let i = 1; i < stroke.length; i++) {
        ctx.lineTo(stroke[i].x, stroke[i].y);
      }
      ctx.stroke();
    }
    // Also draw the in-progress stroke
    const cur = currentStrokeRef.current;
    if (cur && cur.length >= 2) {
      ctx.beginPath();
      ctx.moveTo(cur[0].x, cur[0].y);
      for (let i = 1; i < cur.length; i++) {
        ctx.lineTo(cur[i].x, cur[i].y);
      }
      ctx.stroke();
    }
    // redraw once per relayout; dpr handled elsewhere
    void dpr;
  }, [strokes]);

  useEffect(() => {
    redraw();
  }, [redraw]);

  const localPoint = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const rect = (e.target as HTMLCanvasElement).getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
      t: Math.round(performance.now() - startTimeRef.current),
    };
  };

  const onPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    (e.target as HTMLCanvasElement).setPointerCapture(e.pointerId);
    currentStrokeRef.current = [localPoint(e)];
    setDrawing(true);
  };

  const onPointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawing || !currentStrokeRef.current) return;
    currentStrokeRef.current.push(localPoint(e));
    // lightweight throttle via raf
    const ctx = canvasRef.current?.getContext('2d');
    if (ctx && currentStrokeRef.current.length >= 2) {
      const a = currentStrokeRef.current[currentStrokeRef.current.length - 2];
      const b = currentStrokeRef.current[currentStrokeRef.current.length - 1];
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
      ctx.stroke();
    }
  };

  const onPointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawing) return;
    (e.target as HTMLCanvasElement).releasePointerCapture(e.pointerId);
    setDrawing(false);
    const finished = currentStrokeRef.current;
    currentStrokeRef.current = null;
    if (finished && finished.length >= 2) {
      setStrokes((prev) => [...prev, finished]);
    }
  };

  const clear = () => {
    setStrokes([]);
    currentStrokeRef.current = null;
    const c = canvasRef.current;
    const ctx = c?.getContext('2d');
    if (c && ctx) {
      ctx.save();
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, c.width, c.height);
      ctx.restore();
    }
  };

  const recognize = async () => {
    const rec = recognizerRef.current;
    if (!rec || strokes.length === 0) return;
    setStatus('busy');
    try {
      const drawing = rec.startDrawing();
      for (const s of strokes) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const stroke = new (window as any).HandwritingStroke();
        for (const p of s) {
          stroke.addPoint({ x: p.x, y: p.y, t: p.t });
        }
        drawing.addStroke(stroke);
      }
      const predictions = await drawing.getPrediction();
      drawing.clear?.();
      const best = predictions?.[0]?.text ?? '';
      if (best) {
        onRecognize(best.trim());
      } else {
        setStatus('error');
        return;
      }
      setStatus('idle');
    } catch {
      setStatus('error');
    }
  };

  return (
    <div className="pe-hw">
      <div className="pe-hw-header">
        <div>
          <div className="pe-eyebrow">Pen mode</div>
          <div className="pe-hw-title">
            Write a medicine name &mdash; we&rsquo;ll recognise it
          </div>
        </div>
        <button type="button" className="pe-btn pe-btn-ghost" onClick={onClose} aria-label="Close">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
        </button>
      </div>

      {supported === false ? (
        <div className="pe-hw-unsupported">
          Your browser doesn&rsquo;t support native handwriting recognition.
          Use Chrome or Edge, or stick with typing &mdash; it&rsquo;s faster anyway.
        </div>
      ) : (
        <>
          <canvas
            ref={canvasRef}
            className="pe-hw-canvas"
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
          />
          <div className="pe-hw-actions">
            <button type="button" className="pe-btn" onClick={clear} disabled={strokes.length === 0}>
              Clear
            </button>
            <span className="pe-hw-status">
              {status === 'busy' ? 'Recognising...' : status === 'error' ? 'Could not read that. Try again.' : `${strokes.length} stroke${strokes.length === 1 ? '' : 's'}`}
            </span>
            <button
              type="button"
              className="pe-btn pe-btn-primary"
              onClick={recognize}
              disabled={strokes.length === 0 || status === 'busy' || !supported}
            >
              {status === 'busy' ? 'Recognising...' : 'Recognise → search'}
            </button>
          </div>
        </>
      )}
    </div>
  );
}

export { canRecognize };
