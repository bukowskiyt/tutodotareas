import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { TaskColumns } from "@/components/columns/task-columns";
import { DailySummaryModal } from "@/components/daily-summary/daily-summary-modal";

export default async function HomePage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  // Obtener datos iniciales
  const [profilesResult, settingsResult] = await Promise.all([
    supabase
      .from("profiles")
      .select("*")
      .eq("user_id", user.id)
      .order("order"),
    supabase
      .from("user_settings")
      .select("*")
      .eq("user_id", user.id)
      .single(),
  ]);

  const profiles = profilesResult.data || [];
  const settings = settingsResult.data;

  // Si no hay perfiles, crear uno por defecto
  if (profiles.length === 0) {
    const { data: newProfile } = await supabase
      .from("profiles")
      .insert({
        user_id: user.id,
        name: "Principal",
        order: 0,
      })
      .select()
      .single();

    if (newProfile) {
      profiles.push(newProfile);
    }
  }

  // Obtener el perfil activo (por defecto o el primero)
  const currentProfileId = settings?.default_profile_id || profiles[0]?.id;
  const currentProfile = profiles.find((p) => p.id === currentProfileId) || profiles[0];

  // Obtener tareas y categorías del perfil activo
  let tasks: unknown[] = [];
  let categories: unknown[] = [];

  if (currentProfile) {
    const [tasksResult, categoriesResult] = await Promise.all([
      supabase
        .from("tasks")
        .select(`
          *,
          category:categories(*),
          subtasks:tasks(*)
        `)
        .eq("profile_id", currentProfile.id)
        .is("parent_task_id", null)
        .order("order"),
      supabase
        .from("categories")
        .select("*")
        .eq("profile_id", currentProfile.id)
        .order("order"),
    ]);

    tasks = tasksResult.data || [];
    categories = categoriesResult.data || [];
  }

  // Verificar si mostrar resumen diario
  const today = new Date().toISOString().split("T")[0];
  const showDailySummary = settings?.last_daily_summary !== today;

  return (
    <DashboardLayout
      user={{ id: user.id, email: user.email || "" }}
      profiles={profiles}
      currentProfile={currentProfile}
      settings={settings}
      categories={categories}
    >
      <TaskColumns
        tasks={tasks}
        categories={categories}
        currentProfileId={currentProfile?.id}
      />
      {showDailySummary && (
        <DailySummaryModal
          tasks={tasks}
          userId={user.id}
        />
      )}
    </DashboardLayout>
  );
}
