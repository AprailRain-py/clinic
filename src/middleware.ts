import { NextResponse, type NextRequest } from "next/server";

const IS_PRODUCTION = process.env.NODE_ENV === "production";
const DEV_BYPASS =
  !IS_PRODUCTION && process.env.DEV_BYPASS_AUTH === "1";

// This middleware is a REDIRECT GATE only. It runs in the Edge runtime,
// which cannot talk to Postgres — so we cannot actually validate the
// session here. Instead we check for the auth-cookie's presence and let
// the route handler / page do the real session validation on the Node
// runtime (via `auth()` which calls the DrizzleAdapter).
//
// Security posture: an attacker can forge the cookie NAME to bypass this
// redirect, but they cannot forge a valid session — `auth()` will return
// null inside the route, and every API route rejects unauthenticated
// requests with a 401 explicitly. The cookie check here is UX, not authZ.
const SESSION_COOKIES = [
  "authjs.session-token",
  "__Secure-authjs.session-token",
];

export default function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (
    pathname === "/login" ||
    pathname.startsWith("/api/auth") ||
    pathname.startsWith("/_next") ||
    pathname === "/favicon.ico"
  ) {
    return NextResponse.next();
  }

  if (DEV_BYPASS) {
    return NextResponse.next();
  }

  const hasSessionCookie = SESSION_COOKIES.some(
    (name) => (req.cookies.get(name)?.value ?? "").length > 0,
  );
  if (!hasSessionCookie) {
    return NextResponse.redirect(new URL("/login", req.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
