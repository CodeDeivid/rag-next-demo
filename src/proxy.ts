import createIntlMiddleware from "next-intl/middleware";
import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE } from "@/features/session/session-cookie";
import { routing } from "@/i18n/routing";

const intl = createIntlMiddleware(routing);
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Pages get locale routing; every request (pages and API) gets an anonymous session,
// which scopes all data on the server.
export function proxy(request: NextRequest) {
  const hasSession = UUID.test(request.cookies.get(SESSION_COOKIE)?.value ?? "");
  const sessionId = hasSession ? null : crypto.randomUUID();
  // Set it on the request too, so the route handling this very request already sees it.
  if (sessionId) request.cookies.set(SESSION_COOKIE, sessionId);

  const response = request.nextUrl.pathname.startsWith("/api")
    ? NextResponse.next({ request })
    : intl(request);

  if (sessionId) {
    response.cookies.set(SESSION_COOKIE, sessionId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 30,
    });
  }
  return response;
}

export const config = {
  matcher: ["/((?!_next|icon.svg|apple-icon|.*\\..*).*)"],
};
