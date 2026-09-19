import { NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import type { NextRequest } from "next/server";

// C1 AC3: "Logged-out users are redirected away from protected pages."
// C2 AC4 (page-level companion to the API's server-side check): admin-only
// routes redirect non-admins rather than rendering forbidden content.
const ADMIN_ONLY_PREFIXES = ["/settings"];

export async function middleware(request: NextRequest) {
  const isHttps =
    request.nextUrl.protocol === "https:" ||
    request.headers.get("x-forwarded-proto") === "https" ||
    process.env.NODE_ENV === "production";

  const hasSecureCookie = request.cookies.has("__Secure-next-auth.session-token");
  const cookieName = hasSecureCookie ? "__Secure-next-auth.session-token" : "next-auth.session-token";

  const token = await getToken({
    req: request,
    secret: process.env.NEXTAUTH_SECRET,
    cookieName,
    secureCookie: hasSecureCookie || isHttps,
  });

  if (!token) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("callbackUrl", request.nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }

  const isAdminRoute = ADMIN_ONLY_PREFIXES.some((prefix) =>
    request.nextUrl.pathname.startsWith(prefix)
  );

  if (isAdminRoute && token.role !== "ADMIN") {
    return NextResponse.redirect(new URL("/inbox", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/inbox/:path*",
    "/dashboard/:path*",
    "/trends/:path*",
    "/ask/:path*",
    "/reports/:path*",
    "/settings/:path*",
  ],
};
