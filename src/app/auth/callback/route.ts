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
      // Verificar si el usuario necesita crear un perfil inicial
      const { data: { user } } = await supabase.auth.getUser();

      if (user) {
        // Verificar si ya tiene perfiles
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id")
          .eq("user_id", user.id)
          .limit(1);

        // Si no tiene perfiles, crear uno por defecto
        if (!profiles || profiles.length === 0) {
          await supabase.from("profiles").insert({
            user_id: user.id,
            name: "Principal",
            order: 0,
          });

          // Crear configuración por defecto
          await supabase.from("user_settings").insert({
            user_id: user.id,
            theme: "system",
            auto_archive_days: 2,
            columns_order: ["pending", "today", "scheduled", "overdue", "completed", "archived"],
          });
        }
      }

      return NextResponse.redirect(`${origin}/`);
    }
  }

  // Si hay error, redirigir al login con mensaje de error
  return NextResponse.redirect(`${origin}/auth/login?error=auth_callback_error`);
}
