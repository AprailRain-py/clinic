import type { ReactNode } from "react";
import { requireDoctor } from "@/lib/auth/require-doctor";

export const dynamic = "force-dynamic";

export default async function PatientsLayout({
  children,
}: {
  children: ReactNode;
}) {
  await requireDoctor();
  return <>{children}</>;
}
