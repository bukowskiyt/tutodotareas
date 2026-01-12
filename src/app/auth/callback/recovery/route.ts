import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const origin = requestUrl.origin;

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      // Esta ruta es específica para recuperación de contraseña
      // Siempre redirigir a reset-password
      return NextResponse.redirect(`${origin}/auth/reset-password`);
    }
  }

  // Si hay error, redirigir a forgot-password
  return NextResponse.redirect(`${origin}/auth/forgot-password?error=invalid_recovery_link`);
}
