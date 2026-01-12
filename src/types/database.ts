// Tipos generados para la base de datos de Supabase

export type Priority = "low" | "medium" | "high";
export type TaskStatus =
  | "pending"
  | "today"
  | "scheduled"
  | "overdue"
  | "completed"
  | "archived";
export type Theme = "light" | "dark" | "system";

export interface Profile {
  id: string;
  user_id: string;
  name: string;
  color: string | null;
  order: number;
  created_at: string;
  updated_at: string;
}

export interface Category {
  id: string;
  profile_id: string;
  name: string;
  color: string;
  order: number;
  created_at: string;
}

export interface Task {
  id: string;
  profile_id: string;
  category_id: string | null;
  parent_task_id: string | null;
  title: string;
  description: string | null;
  priority: Priority;
  status: TaskStatus;
  due_date: string | null;
  due_time: string | null;
  completed_at: string | null;
  order: number;
  is_recurring: boolean;
  recurrence_pattern: RecurrencePattern | null;
  created_at: string;
  updated_at: string;
}

export interface TaskComment {
  id: string;
  task_id: string;
  content: string;
  created_at: string;
  updated_at: string;
}

export interface TaskAttachment {
  id: string;
  task_id: string;
  file_name: string;
  file_path: string;
  file_type: string;
  file_size: number;
  created_at: string;
}

export interface TaskHistory {
  id: string;
  task_id: string;
  action: string;
  changes: Record<string, unknown>;
  created_at: string;
}

export interface UserSettings {
  id: string;
  user_id: string;
  theme: Theme;
  auto_archive_days: number;
  default_profile_id: string | null;
  columns_order: string[];
  last_daily_summary: string | null;
  created_at: string;
  updated_at: string;
}

// Tipos para patrones de recurrencia
export interface RecurrencePattern {
  type: "daily" | "weekdays" | "weekly" | "monthly" | "custom";
  interval?: number; // Cada X días/semanas/meses
  daysOfWeek?: number[]; // 0 = Domingo, 1 = Lunes, etc.
  dayOfMonth?: number; // Día del mes (1-31)
  endDate?: string; // Fecha de fin (opcional)
  occurrences?: number; // Número de ocurrencias (opcional)
}

// Tipos con relaciones
export interface TaskWithRelations extends Task {
  category?: Category | null;
  subtasks?: Task[];
  comments?: TaskComment[];
  attachments?: TaskAttachment[];
  history?: TaskHistory[];
}

export interface ProfileWithCategories extends Profile {
  categories?: Category[];
}

// Tipos para la API
export interface CreateTaskInput {
  profile_id: string;
  title: string;
  description?: string;
  category_id?: string;
  priority?: Priority;
  due_date?: string;
  due_time?: string;
  parent_task_id?: string;
  is_recurring?: boolean;
  recurrence_pattern?: RecurrencePattern;
}

export interface UpdateTaskInput {
  title?: string;
  description?: string;
  category_id?: string | null;
  priority?: Priority;
  status?: TaskStatus;
  due_date?: string | null;
  due_time?: string | null;
  order?: number;
  is_recurring?: boolean;
  recurrence_pattern?: RecurrencePattern | null;
}

export interface CreateProfileInput {
  name: string;
  color?: string;
}

export interface CreateCategoryInput {
  profile_id: string;
  name: string;
  color: string;
}

// Tipos para Supabase
export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: Profile;
        Insert: Omit<Profile, "id" | "created_at" | "updated_at">;
        Update: Partial<Omit<Profile, "id" | "created_at" | "updated_at">>;
      };
      categories: {
        Row: Category;
        Insert: Omit<Category, "id" | "created_at">;
        Update: Partial<Omit<Category, "id" | "created_at">>;
      };
      tasks: {
        Row: Task;
        Insert: Omit<Task, "id" | "created_at" | "updated_at">;
        Update: Partial<Omit<Task, "id" | "created_at" | "updated_at">>;
      };
      task_comments: {
        Row: TaskComment;
        Insert: Omit<TaskComment, "id" | "created_at" | "updated_at">;
        Update: Partial<Omit<TaskComment, "id" | "created_at" | "updated_at">>;
      };
      task_attachments: {
        Row: TaskAttachment;
        Insert: Omit<TaskAttachment, "id" | "created_at">;
        Update: Partial<Omit<TaskAttachment, "id" | "created_at">>;
      };
      task_history: {
        Row: TaskHistory;
        Insert: Omit<TaskHistory, "id" | "created_at">;
        Update: never;
      };
      user_settings: {
        Row: UserSettings;
        Insert: Omit<UserSettings, "id" | "created_at" | "updated_at">;
        Update: Partial<Omit<UserSettings, "id" | "created_at" | "updated_at">>;
      };
    };
  };
}
