import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE } from "@/features/session/session-cookie";

// Every visitor gets an anonymous session id; all data is scoped to it on the server.
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function proxy(request: NextRequest) {
  // A missing or tampered cookie gets a fresh session instead of a dead end.
  if (UUID.test(request.cookies.get(SESSION_COOKIE)?.value ?? "")) return NextResponse.next();

  const id = crypto.randomUUID();
  // Set it on the request too, so the route handling this very request already sees it.
  request.cookies.set(SESSION_COOKIE, id);
  const response = NextResponse.next({ request });
  response.cookies.set(SESSION_COOKIE, id, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|icon.svg|apple-icon|opengraph-image).*)"],
};
