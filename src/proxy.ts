import createIntlMiddleware from "next-intl/middleware";
import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE } from "@/features/session/session-cookie";
import { parseSessionId } from "@/features/session/session-id";
import { routing } from "@/i18n/routing";

const intl = createIntlMiddleware(routing);

// Pages get locale routing; every request (pages and API) gets an anonymous session,
// which scopes all data on the server.
export function proxy(request: NextRequest) {
  // Mutating API calls must come from our own pages: SameSite=Lax already keeps the cookie off
  // cross-site POSTs, this also stops a foreign page from spending a visitor's IP budget.
  const origin = request.headers.get("origin");
  if (
    origin &&
    request.nextUrl.pathname.startsWith("/api") &&
    !["GET", "HEAD", "OPTIONS"].includes(request.method) &&
    new URL(origin).host !== request.headers.get("host")
  ) {
    return NextResponse.json({ error: "Forbidden", code: "forbidden_origin" }, { status: 403 });
  }

  // Same validator as the routes: a cookie they would reject is replaced, never left to lock the visitor out.
  const hasSession = parseSessionId(request.cookies.get(SESSION_COOKIE)?.value) !== null;
  const sessionId = hasSession ? null : crypto.randomUUID();
  // Set it on the request too, so the route handling this very request already sees it.
  if (sessionId) request.cookies.set(SESSION_COOKIE, sessionId);

  // The link preview image must be reachable at the exact URL the meta tag points to: crawlers such as
  // WhatsApp's do not follow the redirect that strips the default locale prefix.
  const skipLocaleRouting =
    request.nextUrl.pathname.startsWith("/api") ||
    /^\/(pt|en)\/opengraph-image/.test(request.nextUrl.pathname);
  const response = skipLocaleRouting ? NextResponse.next({ request }) : intl(request);

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
