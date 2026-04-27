import { redirect } from "next/navigation";
import type { Session } from "next-auth";
import { auth } from "@/auth";
import { getDoctorProfile, type DoctorProfile } from "@/lib/db/doctor";

export type AuthenticatedSession = Session & {
  user: NonNullable<Session["user"]> & { id: string };
};

export type CompleteDoctorProfile = DoctorProfile & {
  clinicName: string;
  registrationNumber: string;
  degrees: [string, ...string[]];
};

export function isProfileComplete(
  profile: DoctorProfile | null,
): profile is CompleteDoctorProfile {
  if (!profile) return false;
  if (!profile.clinicName || !profile.clinicName.trim()) return false;
  if (!profile.registrationNumber || !profile.registrationNumber.trim())
    return false;
  if (!profile.degrees || profile.degrees.length === 0) return false;
  return true;
}

export async function requireDoctor(): Promise<{
  session: AuthenticatedSession;
  profile: CompleteDoctorProfile;
}> {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }
  const profile = await getDoctorProfile(session.user.id);
  if (!isProfileComplete(profile)) {
    redirect("/settings/profile?onboarding=1");
  }
  return { session: session as AuthenticatedSession, profile };
}

export async function requireSession(): Promise<AuthenticatedSession> {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }
  return session as AuthenticatedSession;
}
