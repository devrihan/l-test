import { NextRequest, NextResponse } from 'next/server'

function isTokenValid(token: string): boolean {
  try {
    const payload = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')))
    return typeof payload.exp === 'number' && Date.now() < payload.exp * 1000 - 30000
  } catch {
    return false
  }
}

// Real Keycloak login gating. A logged-in user's role (TEACHER/STUDENT) and
// identity (grade/section/roll/admission claims) then drive which view renders.
// Set NEXT_PUBLIC_REQUIRE_AUTH=false to bypass for local design-preview.
export function middleware(request: NextRequest) {
  // Fail SECURE: auth is enforced unless explicitly disabled — a deployed
  // build must never default to an open dashboard. Local design-preview sets
  // NEXT_PUBLIC_REQUIRE_AUTH=false in .env.local.
  if (process.env.NEXT_PUBLIC_REQUIRE_AUTH === 'false') {
    return NextResponse.next()
  }

  const token = request.cookies.get('token')?.value
  const { pathname } = request.nextUrl
  const isAuthPage = pathname === '/login'
  const hasValidToken = token ? isTokenValid(token) : false

  if (!hasValidToken && !isAuthPage) {
    return NextResponse.redirect(new URL('/login', request.url))
  }
  if (hasValidToken && isAuthPage) {
    return NextResponse.redirect(new URL('/', request.url))
  }
  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|api/|.*\\.(?:png|jpg|jpeg|gif|svg|ico|webp|woff|woff2)).*)'],
}