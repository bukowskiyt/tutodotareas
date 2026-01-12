import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

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
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // No ejecutar código entre createServerClient y
  // supabase.auth.getUser(). Un simple error podría hacer muy difícil
  // de depurar problemas con usuarios siendo deslogueados aleatoriamente.

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Rutas públicas que no requieren autenticación
  const publicRoutes = ["/auth/login", "/auth/register", "/auth/callback"];
  const isPublicRoute = publicRoutes.some((route) =>
    request.nextUrl.pathname.startsWith(route)
  );

  if (!user && !isPublicRoute) {
    // No hay usuario, redirigir a login
    const url = request.nextUrl.clone();
    url.pathname = "/auth/login";
    return NextResponse.redirect(url);
  }

  if (user && isPublicRoute) {
    // Usuario autenticado intentando acceder a rutas de auth
    const url = request.nextUrl.clone();
    url.pathname = "/";
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}
