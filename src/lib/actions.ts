"use server";

import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { rateLimit } from "@/lib/rate-limit";

// ==========================================
// Schemas de validación
// ==========================================

const MAX_TITLE = 500;
const MAX_DESCRIPTION = 5000;
const MAX_COMMENT = 10000;
const MAX_NAME = 100;

const taskSchema = z.object({
  profile_id: z.string().uuid(),
  title: z.string().min(1).max(MAX_TITLE),
  description: z.string().max(MAX_DESCRIPTION).nullable().optional(),
  priority: z.enum(["high", "medium", "low"]),
  category_id: z.string().uuid().nullable().optional(),
  due_date: z.string().nullable().optional(),
  due_time: z.string().nullable().optional(),
  status: z.enum(["pending", "today", "scheduled", "overdue", "completed", "archived"]),
  order: z.number().int().min(0).max(10000),
  is_recurring: z.boolean(),
  recurrence_pattern: z.string().max(100).nullable().optional(),
  parent_task_id: z.string().uuid().nullable().optional(),
  completed_at: z.string().nullable().optional(),
});

const taskUpdateSchema = z.object({
  id: z.string().uuid(),
  title: z.string().min(1).max(MAX_TITLE).optional(),
  description: z.string().max(MAX_DESCRIPTION).nullable().optional(),
  priority: z.enum(["high", "medium", "low"]).optional(),
  category_id: z.string().uuid().nullable().optional(),
  due_date: z.string().nullable().optional(),
  due_time: z.string().nullable().optional(),
  status: z.enum(["pending", "today", "scheduled", "overdue", "completed", "archived"]).optional(),
  order: z.number().int().min(0).max(10000).optional(),
  completed_at: z.string().nullable().optional(),
});

const profileSchema = z.object({
  name: z.string().min(1).max(MAX_NAME),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  order: z.number().int().min(0).max(100),
});

const categorySchema = z.object({
  profile_id: z.string().uuid(),
  name: z.string().min(1).max(MAX_NAME),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  order: z.number().int().min(0).max(100).optional(),
});

const commentSchema = z.object({
  task_id: z.string().uuid(),
  content: z.string().min(1).max(MAX_COMMENT),
});

const settingsSchema = z.object({
  auto_archive_days: z.number().int().min(1).max(30),
});

const passwordSchema = z.object({
  password: z
    .string()
    .min(8, "La contraseña debe tener al menos 8 caracteres")
    .max(128)
    .regex(/[A-Z]/, "Debe incluir al menos una mayúscula")
    .regex(/[a-z]/, "Debe incluir al menos una minúscula")
    .regex(/[0-9]/, "Debe incluir al menos un número"),
});

// ==========================================
// Helpers
// ==========================================

async function getAuthUser() {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) {
    throw new Error("No autenticado");
  }
  return { supabase, user };
}

function checkRateLimit(userId: string, action: string, limit = 30) {
  const { success } = rateLimit(`${action}:${userId}`, limit);
  if (!success) {
    throw new Error("Demasiadas solicitudes. Inténtalo de nuevo en un momento.");
  }
}

type ActionResult<T = unknown> = { data: T; error: null } | { data: null; error: string };

// ==========================================
// Task Actions
// ==========================================

export async function createTask(input: z.infer<typeof taskSchema>): Promise<ActionResult> {
  try {
    const validated = taskSchema.parse(input);
    const { supabase, user } = await getAuthUser();
    checkRateLimit(user.id, "createTask", 60);

    // Verificar que el profile pertenece al usuario
    const { data: profile } = await supabase
      .from("profiles")
      .select("id")
      .eq("id", validated.profile_id)
      .eq("user_id", user.id)
      .single();

    if (!profile) {
      return { data: null, error: "Perfil no encontrado" };
    }

    const { data, error } = await supabase
      .from("tasks")
      .insert(validated as never)
      .select(`*, category:categories(*), subtasks:tasks(*)`)
      .single();

    if (error) return { data: null, error: error.message };
    return { data, error: null };
  } catch (e) {
    if (e instanceof z.ZodError) {
      return { data: null, error: e.issues[0]?.message || "Datos inválidos" };
    }
    return { data: null, error: (e as Error).message };
  }
}

export async function updateTask(input: z.infer<typeof taskUpdateSchema>): Promise<ActionResult> {
  try {
    const validated = taskUpdateSchema.parse(input);
    const { supabase, user } = await getAuthUser();
    checkRateLimit(user.id, "updateTask", 120);

    const { id, ...updates } = validated;
    const { data, error } = await supabase
      .from("tasks")
      .update({ ...updates, updated_at: new Date().toISOString() } as never)
      .eq("id", id)
      .select()
      .single();

    if (error) return { data: null, error: error.message };
    return { data, error: null };
  } catch (e) {
    if (e instanceof z.ZodError) {
      return { data: null, error: e.issues[0]?.message || "Datos inválidos" };
    }
    return { data: null, error: (e as Error).message };
  }
}

export async function deleteTask(taskId: string): Promise<ActionResult> {
  try {
    z.string().uuid().parse(taskId);
    const { supabase, user } = await getAuthUser();
    checkRateLimit(user.id, "deleteTask", 30);

    const { error } = await supabase.from("tasks").delete().eq("id", taskId);
    if (error) return { data: null, error: error.message };
    return { data: { id: taskId }, error: null };
  } catch (e) {
    return { data: null, error: (e as Error).message };
  }
}

// ==========================================
// Profile Actions
// ==========================================

export async function createProfile(input: z.infer<typeof profileSchema>): Promise<ActionResult> {
  try {
    const validated = profileSchema.parse(input);
    const { supabase, user } = await getAuthUser();
    checkRateLimit(user.id, "createProfile", 10);

    const { data, error } = await supabase
      .from("profiles")
      .insert({ ...validated, user_id: user.id } as never)
      .select()
      .single();

    if (error) return { data: null, error: error.message };
    return { data, error: null };
  } catch (e) {
    if (e instanceof z.ZodError) {
      return { data: null, error: e.issues[0]?.message || "Datos inválidos" };
    }
    return { data: null, error: (e as Error).message };
  }
}

export async function deleteProfile(profileId: string): Promise<ActionResult> {
  try {
    z.string().uuid().parse(profileId);
    const { supabase, user } = await getAuthUser();
    checkRateLimit(user.id, "deleteProfile", 10);

    // Verificar que tiene más de un perfil
    const { count } = await supabase
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id);

    if ((count || 0) <= 1) {
      return { data: null, error: "Debes tener al menos un perfil" };
    }

    const { error } = await supabase
      .from("profiles")
      .delete()
      .eq("id", profileId)
      .eq("user_id", user.id);

    if (error) return { data: null, error: error.message };
    return { data: { id: profileId }, error: null };
  } catch (e) {
    return { data: null, error: (e as Error).message };
  }
}

// ==========================================
// Category Actions
// ==========================================

export async function createCategory(input: z.infer<typeof categorySchema>): Promise<ActionResult> {
  try {
    const validated = categorySchema.parse(input);
    const { supabase, user } = await getAuthUser();
    checkRateLimit(user.id, "createCategory", 20);

    // Verificar que el profile pertenece al usuario
    const { data: profile } = await supabase
      .from("profiles")
      .select("id")
      .eq("id", validated.profile_id)
      .eq("user_id", user.id)
      .single();

    if (!profile) {
      return { data: null, error: "Perfil no encontrado" };
    }

    const { data, error } = await supabase
      .from("categories")
      .insert(validated as never)
      .select()
      .single();

    if (error) return { data: null, error: error.message };
    return { data, error: null };
  } catch (e) {
    if (e instanceof z.ZodError) {
      return { data: null, error: e.issues[0]?.message || "Datos inválidos" };
    }
    return { data: null, error: (e as Error).message };
  }
}

export async function deleteCategory(categoryId: string): Promise<ActionResult> {
  try {
    z.string().uuid().parse(categoryId);
    const { supabase, user } = await getAuthUser();
    checkRateLimit(user.id, "deleteCategory", 20);

    const { error } = await supabase
      .from("categories")
      .delete()
      .eq("id", categoryId);

    if (error) return { data: null, error: error.message };
    return { data: { id: categoryId }, error: null };
  } catch (e) {
    return { data: null, error: (e as Error).message };
  }
}

// ==========================================
// Comment Actions
// ==========================================

export async function createComment(input: z.infer<typeof commentSchema>): Promise<ActionResult> {
  try {
    const validated = commentSchema.parse(input);
    const { supabase, user } = await getAuthUser();
    checkRateLimit(user.id, "createComment", 30);

    const { data, error } = await supabase
      .from("task_comments")
      .insert(validated as never)
      .select()
      .single();

    if (error) return { data: null, error: error.message };
    return { data, error: null };
  } catch (e) {
    if (e instanceof z.ZodError) {
      return { data: null, error: e.issues[0]?.message || "Datos inválidos" };
    }
    return { data: null, error: (e as Error).message };
  }
}

export async function updateComment(commentId: string, content: string): Promise<ActionResult> {
  try {
    z.string().uuid().parse(commentId);
    z.string().min(1).max(MAX_COMMENT).parse(content);
    const { supabase, user } = await getAuthUser();
    checkRateLimit(user.id, "updateComment", 30);

    const { error } = await supabase
      .from("task_comments")
      .update({ content, updated_at: new Date().toISOString() } as never)
      .eq("id", commentId);

    if (error) return { data: null, error: error.message };
    return { data: { id: commentId }, error: null };
  } catch (e) {
    return { data: null, error: (e as Error).message };
  }
}

export async function deleteComment(commentId: string): Promise<ActionResult> {
  try {
    z.string().uuid().parse(commentId);
    const { supabase, user } = await getAuthUser();
    checkRateLimit(user.id, "deleteComment", 20);

    const { error } = await supabase
      .from("task_comments")
      .delete()
      .eq("id", commentId);

    if (error) return { data: null, error: error.message };
    return { data: { id: commentId }, error: null };
  } catch (e) {
    return { data: null, error: (e as Error).message };
  }
}

// ==========================================
// Settings Actions
// ==========================================

export async function updateSettings(input: z.infer<typeof settingsSchema>): Promise<ActionResult> {
  try {
    const validated = settingsSchema.parse(input);
    const { supabase, user } = await getAuthUser();
    checkRateLimit(user.id, "updateSettings", 10);

    const { error } = await supabase
      .from("user_settings")
      .update(validated as never)
      .eq("user_id", user.id);

    if (error) return { data: null, error: error.message };
    return { data: validated, error: null };
  } catch (e) {
    if (e instanceof z.ZodError) {
      return { data: null, error: e.issues[0]?.message || "Datos inválidos" };
    }
    return { data: null, error: (e as Error).message };
  }
}

export async function dismissDailySummary(): Promise<ActionResult> {
  try {
    const { supabase, user } = await getAuthUser();
    checkRateLimit(user.id, "dismissDailySummary", 10);

    const today = new Date().toISOString().split("T")[0];
    const { error } = await supabase
      .from("user_settings")
      .update({ last_daily_summary: today } as never)
      .eq("user_id", user.id);

    if (error) return { data: null, error: error.message };
    return { data: { success: true }, error: null };
  } catch (e) {
    return { data: null, error: (e as Error).message };
  }
}

export async function changePassword(input: z.infer<typeof passwordSchema>): Promise<ActionResult> {
  try {
    const validated = passwordSchema.parse(input);
    const { supabase, user } = await getAuthUser();
    checkRateLimit(user.id, "changePassword", 5);

    const { error } = await supabase.auth.updateUser({
      password: validated.password,
    });

    if (error) return { data: null, error: error.message };
    return { data: { success: true }, error: null };
  } catch (e) {
    if (e instanceof z.ZodError) {
      return { data: null, error: e.issues[0]?.message || "Datos inválidos" };
    }
    return { data: null, error: (e as Error).message };
  }
}
