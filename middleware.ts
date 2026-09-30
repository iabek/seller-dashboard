import { createServerClient } from "@supabase/ssr";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export async function middleware(
  request: NextRequest
) {
  let response = NextResponse.next({
    request,
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },

        setAll(cookiesToSet) {
          cookiesToSet.forEach(
            ({
              name,
              value,
              options,
            }) => {
              request.cookies.set(
                name,
                value
              );

              response.cookies.set(
                name,
                value,
                options
              );
            }
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const isLoginPage =
    request.nextUrl.pathname === "/login";

  // Belum login → arahkan ke login
  if (!user && !isLoginPage) {
    return NextResponse.redirect(
      new URL("/login", request.url)
    );
  }

  // Sudah login → jangan kembali ke login
  if (user && isLoginPage) {
    return NextResponse.redirect(
      new URL("/", request.url)
    );
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|api/telegram).*)",
  ],
};