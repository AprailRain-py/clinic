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

const IS_PRODUCTION = process.env.NODE_ENV === "production";
const DEV_BYPASS =
  !IS_PRODUCTION && process.env.DEV_BYPASS_AUTH === "1";
const DEV_USER_EMAIL = "dev@clinic.local";
const DEV_USER_ID = "dev-user";

// Build-time note: Next evaluates route modules during `next build` with
// NODE_ENV=production but without runtime secrets. Defer the hard check to
// first actual use so we fail fast on a cold request, not at build collection.
const IS_BUILD = process.env.NEXT_PHASE === "phase-production-build";
function assertProdSecret() {
  if (IS_PRODUCTION && !IS_BUILD && !process.env.AUTH_SECRET) {
    throw new Error(
      "AUTH_SECRET must be set in production. Refusing to start with an insecure fallback."
    );
  }
}

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

// Raw NextAuth auth helper, usable as a middleware wrapper:
//   export default authMiddleware((req) => { ... })
// Our wrapped `auth()` below adds dev-bypass ergonomics for route handlers
// and server components, but middleware needs the underlying wrapper form.
export const authMiddleware = nextAuthExports.auth;

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
  assertProdSecret();
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
