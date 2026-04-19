import { NextResponse, type NextRequest } from "next/server";

const SESSION_COOKIE_NAMES = [
  "authjs.session-token",
  "__Secure-authjs.session-token",
];

const DEV_BYPASS = process.env.DEV_BYPASS_AUTH === "1";

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Allow public paths
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

  const hasSession = SESSION_COOKIE_NAMES.some((name) =>
    Boolean(req.cookies.get(name)?.value)
  );

  if (!hasSession) {
    const loginUrl = new URL("/login", req.url);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  // Run on everything except static assets we explicitly allow above.
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
