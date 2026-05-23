import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

const protectedPaths = ['/dashboard', '/snapsort', '/scamshield', '/moneycoach'];

export async function proxy(request: NextRequest) {
  const response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  const supabase = createServerClient(supabaseUrl, supabaseKey, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (cookiesToSet) => {
        cookiesToSet.forEach(({ name, value, options }) => {
          response.cookies.set(name, value, options);
        });
      },
    },
  });

  const isProtected = protectedPaths.some((path) => request.nextUrl.pathname.startsWith(path));

  // Let the client-side AuthGuard control protected route access.
  // This avoids production redirect loops when the browser session is already valid
  // but not yet visible to the proxy on the same navigation.
  if (isProtected) {
    return response;
  }

  return response;
}

export const config = {
  matcher: ['/dashboard/:path*', '/snapsort/:path*', '/scamshield/:path*', '/moneycoach/:path*'],
};