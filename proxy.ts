import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function proxy(request: NextRequest) {
    let supabaseResponse = NextResponse.next({ request });

    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                getAll() {
                    return request.cookies.getAll();
                },
                setAll(cookiesToSet) {
                    cookiesToSet.forEach(({ name, value }) =>
                        request.cookies.set(name, value)
                    );
                    supabaseResponse = NextResponse.next({ request });
                    cookiesToSet.forEach(({ name, value, options }) =>
                        supabaseResponse.cookies.set(name, value, options)
                    );
                },
            },
        }
    );

    const {
        data: { user },
    } = await supabase.auth.getUser();

    const { pathname } = request.nextUrl;

    // Public routes — accessible without authentication.
    // Authenticated users are redirected to home so they don't land on auth pages.
    const PUBLIC_PATHS = ["/login", "/register"];
    if (PUBLIC_PATHS.includes(pathname)) {
        if (user) {
            return NextResponse.redirect(new URL("/", request.url));
        }
        return supabaseResponse;
    }

    // /onboarding is a protected route that new users land on right after signup.
    // Allow authenticated users through — the page itself handles skip-if-done logic.
    if (pathname === "/onboarding") {
        if (!user) {
            return NextResponse.redirect(new URL("/login", request.url));
        }
        return supabaseResponse;
    }

    if (!user) {
        return NextResponse.redirect(new URL("/login", request.url));
    }

    return supabaseResponse;
}

export const config = {
    matcher: [
        "/((?!_next/static|_next/image|favicon.ico|icons|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
    ],
};
