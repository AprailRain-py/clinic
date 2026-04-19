import NextAuth, { type Session } from "next-auth";
import Google from "next-auth/providers/google";
import { DrizzleAdapter } from "@auth/drizzle-adapter";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import {
  accounts,
  sessions,
  users,
  verificationTokens,
} from "@/lib/db/schema";

const DEV_BYPASS = process.env.DEV_BYPASS_AUTH === "1";
const DEV_USER_EMAIL = "dev@clinic.local";
const DEV_USER_ID = "dev-user";

const nextAuthExports = NextAuth({
  adapter: DrizzleAdapter(db, {
    usersTable: users,
    accountsTable: accounts,
    sessionsTable: sessions,
    verificationTokensTable: verificationTokens,
  }),
  providers: [
    Google({
      clientId: process.env.AUTH_GOOGLE_ID,
      clientSecret: process.env.AUTH_GOOGLE_SECRET,
    }),
  ],
  session: { strategy: "database" },
  pages: { signIn: "/login" },
  secret:
    process.env.AUTH_SECRET ??
    (DEV_BYPASS ? "dev-insecure-secret-do-not-use-in-prod" : undefined),
});

export const { handlers, signIn, signOut } = nextAuthExports;

async function ensureDevUser() {
  const existing = await db
    .select()
    .from(users)
    .where(eq(users.email, DEV_USER_EMAIL))
    .limit(1);
  if (existing.length > 0) return existing[0];
  await db
    .insert(users)
    .values({
      id: DEV_USER_ID,
      email: DEV_USER_EMAIL,
      name: "Dev Doctor",
      image: null,
    });
  const created = await db
    .select()
    .from(users)
    .where(eq(users.email, DEV_USER_EMAIL))
    .limit(1);
  return created[0];
}

export async function auth(): Promise<Session | null> {
  if (DEV_BYPASS) {
    const user = await ensureDevUser();
    return {
      user: {
        id: user.id,
        name: user.name ?? "Dev Doctor",
        email: user.email ?? DEV_USER_EMAIL,
        image: user.image ?? null,
      },
      expires: new Date(Date.now() + 3600_000).toISOString(),
    } as Session;
  }
  return nextAuthExports.auth();
}
