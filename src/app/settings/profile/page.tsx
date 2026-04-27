import Link from "next/link";
import { redirect } from "next/navigation";
import { auth, signOut } from "@/auth";
import { getDoctorProfile } from "@/lib/db/doctor";
import { ProfileForm } from "./ProfileForm";

export const dynamic = "force-dynamic";

type Search = { onboarding?: string };

export default async function ProfilePage({
  searchParams,
}: {
  searchParams: Promise<Search>;
}) {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  const sp = await searchParams;
  const onboarding = sp?.onboarding === "1";

  const profile = await getDoctorProfile(session.user.id);
  const doctorName = session.user.name ?? "";

  async function doSignOut() {
    "use server";
    await signOut({ redirectTo: "/login" });
  }

  return (
    <div className="min-h-screen">
      <header className="container-shell flex items-center justify-between py-6">
        {onboarding ? (
          <div className="eyebrow">Step one · First-time setup</div>
        ) : (
          <Link href="/" className="btn-link">
            <svg viewBox="0 0 24 24" fill="none" className="h-3.5 w-3.5">
              <path
                d="m15 18-6-6 6-6"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            Back to directory
          </Link>
        )}
        {onboarding ? (
          <form action={doSignOut}>
            <button
              type="submit"
              className="text-xs font-mono uppercase tracking-[0.18em] text-[--color-muted] transition-colors hover:text-[--color-rust]"
            >
              Sign out
            </button>
          </form>
        ) : (
          <span className="eyebrow">Settings</span>
        )}
      </header>

      <main className="container-shell pb-20">
        <div className="reveal mx-auto max-w-6xl">
          <div className="mb-10 max-w-2xl">
            {onboarding ? (
              <>
                <div className="eyebrow text-[--color-pine]">
                  Welcome, Doctor
                </div>
                <h1 className="font-display mt-3 text-[clamp(2.25rem,4.5vw,3.5rem)] font-medium leading-[1.04] tracking-tight">
                  Set up your <span className="italic">letterhead.</span>
                </h1>
                <p className="mt-4 font-display text-lg italic leading-relaxed text-[--color-muted]">
                  This prints at the top of every prescription you write.
                  Fill it in once — edit anytime from Settings.
                </p>
              </>
            ) : (
              <>
                <div className="eyebrow">Doctor profile</div>
                <h1 className="font-display mt-2 text-[clamp(2rem,4vw,3rem)] font-medium leading-tight tracking-tight">
                  Clinic &amp; credentials
                </h1>
                <p className="mt-3 max-w-lg font-display text-lg italic text-[--color-muted]">
                  Printed on every prescription. Update anytime.
                </p>
              </>
            )}
          </div>

          <ProfileForm
            initial={profile}
            onboarding={onboarding}
            doctorName={doctorName}
          />
        </div>
      </main>
    </div>
  );
}
