import Link from "next/link";

// MA home — entry point into the oral screening capture flow. Static greeting +
// a prominent "Start a screening" card, a couple of "Today" stat tiles
// (placeholder values) and a quiet link through to the doctor's queue.
export default function ScreeningHomePage() {
  return (
    <div style={{ minHeight: "100dvh", display: "flex", justifyContent: "center", background: "var(--screen)" }}>
      <div style={{ width: "100%", maxWidth: 440, display: "flex", flexDirection: "column" }}>
        <div style={{ padding: "28px 22px 6px" }}>
          <div className="eyebrow" style={{ color: "var(--tl)" }}>
            Screening
          </div>
          <div style={{ font: "600 27px var(--ip-sans), sans-serif", color: "var(--ink)", marginTop: 7 }}>
            Good morning
          </div>
          <div style={{ font: "400 15px var(--ip-sans), sans-serif", color: "var(--muted)", marginTop: 3 }}>
            Oral cancer screening
          </div>
        </div>

        <div style={{ padding: "16px 18px 24px" }}>
          {/* Start card */}
          <Link
            href="/screening/new"
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 18,
              textDecoration: "none",
              background: "var(--tl)",
              borderRadius: 22,
              padding: 24,
              color: "#fff",
              boxShadow: "0 14px 30px -10px rgba(15,118,110,.55)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: 15,
                  background: "rgba(255,255,255,.18)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#fff",
                }}
              >
                <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
                  <line x1="12" y1="5" x2="12" y2="19" />
                  <line x1="5" y1="12" x2="19" y2="12" />
                </svg>
              </div>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,.8)" strokeWidth="2" strokeLinecap="round">
                <polyline points="9 6 15 12 9 18" />
              </svg>
            </div>
            <div>
              <div style={{ font: "600 22px var(--ip-sans), sans-serif" }}>Start a screening</div>
              <div style={{ opacity: 0.86, font: "400 14px var(--ip-sans), sans-serif", marginTop: 3 }}>
                Oral pathway · guided photo capture
              </div>
            </div>
          </Link>

          {/* Today stats (placeholder) */}
          <div className="eyebrow" style={{ marginTop: 24, color: "var(--faint)" }}>
            Today
          </div>
          <div style={{ display: "flex", gap: 12, marginTop: 12 }}>
            <div className="card" style={{ flex: 1, padding: 16 }}>
              <div style={{ font: "600 28px var(--ip-sans), sans-serif", color: "var(--ink)" }}>0</div>
              <div style={{ font: "400 13px var(--ip-sans), sans-serif", color: "var(--muted)", marginTop: 2 }}>
                Captured
              </div>
            </div>
            <div className="card" style={{ flex: 1, padding: 16 }}>
              <div style={{ font: "600 28px var(--ip-sans), sans-serif", color: "var(--md-fg)" }}>0</div>
              <div style={{ font: "400 13px var(--ip-sans), sans-serif", color: "var(--muted)", marginTop: 2 }}>
                Awaiting review
              </div>
            </div>
          </div>

          {/* Doctor queue link */}
          <Link
            href="/screening/queue"
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginTop: 14,
              padding: "14px 16px",
              borderRadius: 14,
              textDecoration: "none",
              background: "#fff",
              border: "1px solid var(--line)",
            }}
          >
            <span style={{ font: "500 14px var(--ip-sans), sans-serif", color: "var(--ink-2)" }}>
              Open doctor&rsquo;s queue
            </span>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--faint)" strokeWidth="2" strokeLinecap="round">
              <polyline points="9 6 15 12 9 18" />
            </svg>
          </Link>
        </div>
      </div>
    </div>
  );
}
