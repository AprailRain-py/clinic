import { redirect } from "next/navigation";
import { auth, signIn } from "@/auth";

export default async function LoginPage() {
  const session = await auth();
  if (session?.user) {
    redirect("/");
  }

  const devBypass = process.env.DEV_BYPASS_AUTH === "1";

  async function googleSignIn() {
    "use server";
    await signIn("google", { redirectTo: "/" });
  }

  async function devSignIn() {
    "use server";
    redirect("/");
  }

  return (
    <main className="relative flex min-h-screen items-stretch">
      {/* Left — editorial panel */}
      <aside className="relative hidden flex-1 overflow-hidden border-r border-[--color-rule] bg-[--color-ink] text-[--color-paper] md:flex md:flex-col md:justify-between md:p-12">
        <div
          aria-hidden
          className="pointer-events-none absolute -right-20 top-1/3 h-[520px] w-[520px] rounded-full opacity-30 blur-3xl"
          style={{ background: "radial-gradient(circle, var(--color-pine), transparent 70%)" }}
        />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-[0.06]"
          style={{
            backgroundImage:
              "repeating-linear-gradient(0deg, #fff 0 1px, transparent 1px 48px), repeating-linear-gradient(90deg, #fff 0 1px, transparent 1px 48px)",
          }}
        />

        <div className="relative">
          <div className="flex items-center gap-3">
            <span className="relative inline-flex h-10 w-10 items-center justify-center rounded-full bg-[--color-paper] text-[--color-ink]">
              <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5">
                <path d="M12 3v18M3 12h18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
              <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-[--color-rust]" />
            </span>
            <span className="font-display text-[22px] font-medium italic">Arthik Clinic</span>
          </div>
        </div>

        <div className="relative">
          <div className="eyebrow text-[--color-paper]/70">Est. for clinics</div>
          <p className="font-display mt-4 text-[clamp(2.25rem,4vw,3.5rem)] font-medium italic leading-[1.05] tracking-tight">
            A quiet ledger for
            <br />
            the practice of care.
          </p>
          <p className="mt-6 max-w-md font-display text-lg italic text-[--color-paper]/70">
            Patient records, prescriptions and a 250,000-strong medicine index,
            set in a room with good light.
          </p>
        </div>

        <div className="relative flex items-baseline justify-between text-[--color-paper]/60">
          <span className="font-mono text-[11px] uppercase tracking-wider">
            vol. i &middot; issue 01
          </span>
          <span className="font-mono text-[11px] uppercase tracking-wider">
            informational · not authoritative
          </span>
        </div>
      </aside>

      {/* Right — auth panel */}
      <section className="flex flex-1 items-center justify-center px-6 py-16">
        <div className="w-full max-w-sm">
          <div className="eyebrow">Sign in</div>
          <h1 className="font-display mt-3 text-4xl font-medium leading-tight tracking-tight">
            Welcome back.
          </h1>
          <p className="mt-3 font-display text-lg italic text-[--color-muted]">
            Access your clinic records.
          </p>

          <form action={googleSignIn} className="mt-10">
            <button type="submit" className="group flex w-full items-center justify-center gap-3 rounded-lg border border-[--color-ink] bg-[--color-ink] px-4 py-3 text-sm font-medium text-[--color-paper] transition hover:bg-[--color-pine] hover:border-[--color-pine]">
              <svg viewBox="0 0 24 24" className="h-4 w-4">
                <path fill="#EA4335" d="M12 10.2v3.8h5.3c-.2 1.4-1.6 4-5.3 4-3.2 0-5.8-2.6-5.8-5.9s2.6-5.9 5.8-5.9c1.8 0 3 .8 3.7 1.4l2.5-2.4C16.6 3.7 14.5 3 12 3 6.9 3 2.8 7.1 2.8 12s4.1 9 9.2 9c5.3 0 8.8-3.7 8.8-9 0-.6-.1-1.2-.2-1.8H12z"/>
              </svg>
              Continue with Google
            </button>
          </form>

          {devBypass ? (
            <form action={devSignIn} className="mt-4">
              <button type="submit" className="flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-[--color-ochre] bg-[color-mix(in_srgb,var(--color-ochre)_10%,white)] px-4 py-3 text-sm font-medium text-[--color-ink] transition hover:bg-[color-mix(in_srgb,var(--color-ochre)_18%,white)]">
                <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4">
                  <path d="M12 2 2 7l10 5 10-5-10-5Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
                  <path d="m2 17 10 5 10-5M2 12l10 5 10-5" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
                </svg>
                Continue as Dev Doctor
              </button>
              <p className="mt-3 text-center font-mono text-[10px] uppercase tracking-wider text-[--color-muted]">
                Dev mode · auth bypassed
              </p>
            </form>
          ) : null}

          <p className="mt-10 border-t border-[--color-rule] pt-6 text-xs text-[--color-muted]">
            By continuing, you acknowledge that Arthik Clinic stores a local record of
            patient data for the purpose of continuity of care.
          </p>
        </div>
      </section>
    </main>
  );
}
