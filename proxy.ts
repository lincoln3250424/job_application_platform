import { NextRequest, NextResponse } from "next/server";
import { verifySessionToken } from "@/lib/auth";

const PROTECTED_PREFIXES = ["/dashboard", "/applications"];
const AUTH_PAGES = ["/login", "/register"];

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const token = req.cookies.get("session")?.value;
  const session = token ? await verifySessionToken(token) : null;

  const isProtected = PROTECTED_PREFIXES.some((p) => pathname.startsWith(p));
  const isAuthPage = AUTH_PAGES.some((p) => pathname.startsWith(p));

  if (isProtected && !session) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  if (isAuthPage && session) {
    const url = req.nextUrl.clone();
    url.pathname = "/dashboard";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

// proxy.ts always runs on the Node.js runtime in Next.js 16 (no edge/node
// choice to make here), which is exactly what we need since verifySessionToken
// pulls in `jose` — fine either way, but no runtime flag required.
export const config = {
  matcher: ["/dashboard/:path*", "/applications/:path*", "/login", "/register"],
};
