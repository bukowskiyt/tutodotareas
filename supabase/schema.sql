-- =========================================
-- ESQUEMA DE BASE DE DATOS: TuTodoTareas
-- =========================================
-- Ejecutar este archivo en el SQL Editor de Supabase
-- Dashboard > SQL Editor > New Query > Pegar y ejecutar

-- Habilitar la extensión UUID
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =========================================
-- TABLA: profiles (Perfiles/Espacios de trabajo)
-- =========================================
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    color TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_profiles_user_id ON public.profiles(user_id);

-- RLS (Row Level Security)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own profiles"
    ON public.profiles FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own profiles"
    ON public.profiles FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own profiles"
    ON public.profiles FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own profiles"
    ON public.profiles FOR DELETE
    USING (auth.uid() = user_id);

-- =========================================
-- TABLA: categories (Categorías)
-- =========================================
CREATE TABLE IF NOT EXISTS public.categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    color TEXT NOT NULL DEFAULT '#E5E7EB',
    "order" INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_categories_profile_id ON public.categories(profile_id);

-- RLS
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view categories of their profiles"
    ON public.categories FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = categories.profile_id
            AND profiles.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can create categories in their profiles"
    ON public.categories FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = categories.profile_id
            AND profiles.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update categories in their profiles"
    ON public.categories FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = categories.profile_id
            AND profiles.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can delete categories in their profiles"
    ON public.categories FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = categories.profile_id
            AND profiles.user_id = auth.uid()
        )
    );

-- =========================================
-- TABLA: tasks (Tareas)
-- =========================================
CREATE TYPE task_priority AS ENUM ('low', 'medium', 'high');
CREATE TYPE task_status AS ENUM ('pending', 'today', 'scheduled', 'overdue', 'completed', 'archived');

CREATE TABLE IF NOT EXISTS public.tasks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
    parent_task_id UUID REFERENCES public.tasks(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    priority task_priority NOT NULL DEFAULT 'medium',
    status task_status NOT NULL DEFAULT 'pending',
    due_date DATE,
    due_time TIME,
    completed_at TIMESTAMPTZ,
    "order" INTEGER NOT NULL DEFAULT 0,
    is_recurring BOOLEAN NOT NULL DEFAULT FALSE,
    recurrence_pattern JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_tasks_profile_id ON public.tasks(profile_id);
CREATE INDEX IF NOT EXISTS idx_tasks_category_id ON public.tasks(category_id);
CREATE INDEX IF NOT EXISTS idx_tasks_parent_task_id ON public.tasks(parent_task_id);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON public.tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON public.tasks(due_date);

-- RLS
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view tasks of their profiles"
    ON public.tasks FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = tasks.profile_id
            AND profiles.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can create tasks in their profiles"
    ON public.tasks FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = tasks.profile_id
            AND profiles.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update tasks in their profiles"
    ON public.tasks FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = tasks.profile_id
            AND profiles.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can delete tasks in their profiles"
    ON public.tasks FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = tasks.profile_id
            AND profiles.user_id = auth.uid()
        )
    );

-- =========================================
-- TABLA: task_comments (Comentarios)
-- =========================================
CREATE TABLE IF NOT EXISTS public.task_comments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_task_comments_task_id ON public.task_comments(task_id);

-- RLS
ALTER TABLE public.task_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view comments of their tasks"
    ON public.task_comments FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.tasks
            JOIN public.profiles ON profiles.id = tasks.profile_id
            WHERE tasks.id = task_comments.task_id
            AND profiles.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can create comments in their tasks"
    ON public.task_comments FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.tasks
            JOIN public.profiles ON profiles.id = tasks.profile_id
            WHERE tasks.id = task_comments.task_id
            AND profiles.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update comments in their tasks"
    ON public.task_comments FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.tasks
            JOIN public.profiles ON profiles.id = tasks.profile_id
            WHERE tasks.id = task_comments.task_id
            AND profiles.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can delete comments in their tasks"
    ON public.task_comments FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM public.tasks
            JOIN public.profiles ON profiles.id = tasks.profile_id
            WHERE tasks.id = task_comments.task_id
            AND profiles.user_id = auth.uid()
        )
    );

-- =========================================
-- TABLA: task_attachments (Adjuntos)
-- =========================================
CREATE TABLE IF NOT EXISTS public.task_attachments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
    file_name TEXT NOT NULL,
    file_path TEXT NOT NULL,
    file_type TEXT NOT NULL,
    file_size INTEGER NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_task_attachments_task_id ON public.task_attachments(task_id);

-- RLS
ALTER TABLE public.task_attachments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view attachments of their tasks"
    ON public.task_attachments FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.tasks
            JOIN public.profiles ON profiles.id = tasks.profile_id
            WHERE tasks.id = task_attachments.task_id
            AND profiles.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can create attachments in their tasks"
    ON public.task_attachments FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.tasks
            JOIN public.profiles ON profiles.id = tasks.profile_id
            WHERE tasks.id = task_attachments.task_id
            AND profiles.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can delete attachments in their tasks"
    ON public.task_attachments FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM public.tasks
            JOIN public.profiles ON profiles.id = tasks.profile_id
            WHERE tasks.id = task_attachments.task_id
            AND profiles.user_id = auth.uid()
        )
    );

-- =========================================
-- TABLA: task_history (Historial de cambios)
-- =========================================
CREATE TABLE IF NOT EXISTS public.task_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
    action TEXT NOT NULL,
    changes JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_task_history_task_id ON public.task_history(task_id);

-- RLS
ALTER TABLE public.task_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view history of their tasks"
    ON public.task_history FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.tasks
            JOIN public.profiles ON profiles.id = tasks.profile_id
            WHERE tasks.id = task_history.task_id
            AND profiles.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can create history in their tasks"
    ON public.task_history FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.tasks
            JOIN public.profiles ON profiles.id = tasks.profile_id
            WHERE tasks.id = task_history.task_id
            AND profiles.user_id = auth.uid()
        )
    );

-- =========================================
-- TABLA: user_settings (Configuración del usuario)
-- =========================================
CREATE TYPE theme_type AS ENUM ('light', 'dark', 'system');

CREATE TABLE IF NOT EXISTS public.user_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
    theme theme_type NOT NULL DEFAULT 'system',
    auto_archive_days INTEGER NOT NULL DEFAULT 2,
    default_profile_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    columns_order JSONB NOT NULL DEFAULT '["pending", "today", "scheduled", "overdue", "completed", "archived"]',
    last_daily_summary DATE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_user_settings_user_id ON public.user_settings(user_id);

-- RLS
ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own settings"
    ON public.user_settings FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own settings"
    ON public.user_settings FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own settings"
    ON public.user_settings FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- =========================================
-- FUNCIONES Y TRIGGERS
-- =========================================

-- Función para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers para actualizar updated_at
CREATE TRIGGER update_profiles_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_tasks_updated_at
    BEFORE UPDATE ON public.tasks
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_task_comments_updated_at
    BEFORE UPDATE ON public.task_comments
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_settings_updated_at
    BEFORE UPDATE ON public.user_settings
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Función para registrar historial de cambios en tareas
CREATE OR REPLACE FUNCTION log_task_changes()
RETURNS TRIGGER AS $$
DECLARE
    changes JSONB := '{}';
BEGIN
    IF TG_OP = 'INSERT' THEN
        INSERT INTO public.task_history (task_id, action, changes)
        VALUES (NEW.id, 'created', jsonb_build_object('title', NEW.title));
        RETURN NEW;
    ELSIF TG_OP = 'UPDATE' THEN
        -- Detectar qué campos cambiaron
        IF OLD.title != NEW.title THEN
            changes := changes || jsonb_build_object('title', jsonb_build_object('old', OLD.title, 'new', NEW.title));
        END IF;
        IF OLD.status != NEW.status THEN
            changes := changes || jsonb_build_object('status', jsonb_build_object('old', OLD.status, 'new', NEW.status));
        END IF;
        IF OLD.priority != NEW.priority THEN
            changes := changes || jsonb_build_object('priority', jsonb_build_object('old', OLD.priority, 'new', NEW.priority));
        END IF;
        IF COALESCE(OLD.due_date::text, '') != COALESCE(NEW.due_date::text, '') THEN
            changes := changes || jsonb_build_object('due_date', jsonb_build_object('old', OLD.due_date, 'new', NEW.due_date));
        END IF;

        -- Solo registrar si hubo cambios
        IF changes != '{}' THEN
            INSERT INTO public.task_history (task_id, action, changes)
            VALUES (NEW.id, 'updated', changes);
        END IF;

        -- Registrar completado
        IF OLD.status != 'completed' AND NEW.status = 'completed' THEN
            INSERT INTO public.task_history (task_id, action, changes)
            VALUES (NEW.id, 'completed', '{}');
        END IF;

        -- Registrar archivado
        IF OLD.status != 'archived' AND NEW.status = 'archived' THEN
            INSERT INTO public.task_history (task_id, action, changes)
            VALUES (NEW.id, 'archived', '{}');
        END IF;

        RETURN NEW;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER log_task_changes_trigger
    AFTER INSERT OR UPDATE ON public.tasks
    FOR EACH ROW
    EXECUTE FUNCTION log_task_changes();

-- =========================================
-- STORAGE: Bucket para adjuntos
-- =========================================
-- IMPORTANTE: Ejecutar estos comandos en el SQL Editor de Supabase
-- O crear el bucket manualmente en Dashboard > Storage

-- Crear el bucket (ejecutar primero)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'attachments',
    'attachments',
    false,
    26214400, -- 25MB en bytes
    ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'text/plain', 'application/zip']
)
ON CONFLICT (id) DO NOTHING;

-- Política SELECT: Los usuarios pueden ver archivos de sus tareas
CREATE POLICY "Users can view attachments of their tasks"
ON storage.objects FOR SELECT
USING (
    bucket_id = 'attachments'
    AND EXISTS (
        SELECT 1 FROM public.tasks t
        JOIN public.profiles p ON p.id = t.profile_id
        WHERE t.id::text = (storage.foldername(name))[1]
        AND p.user_id = auth.uid()
    )
);

-- Política INSERT: Los usuarios pueden subir archivos a sus tareas
CREATE POLICY "Users can upload attachments to their tasks"
ON storage.objects FOR INSERT
WITH CHECK (
    bucket_id = 'attachments'
    AND EXISTS (
        SELECT 1 FROM public.tasks t
        JOIN public.profiles p ON p.id = t.profile_id
        WHERE t.id::text = (storage.foldername(name))[1]
        AND p.user_id = auth.uid()
    )
);

-- Política UPDATE: Los usuarios pueden actualizar archivos de sus tareas
CREATE POLICY "Users can update attachments of their tasks"
ON storage.objects FOR UPDATE
USING (
    bucket_id = 'attachments'
    AND EXISTS (
        SELECT 1 FROM public.tasks t
        JOIN public.profiles p ON p.id = t.profile_id
        WHERE t.id::text = (storage.foldername(name))[1]
        AND p.user_id = auth.uid()
    )
);

-- Política DELETE: Los usuarios pueden eliminar archivos de sus tareas
CREATE POLICY "Users can delete attachments of their tasks"
ON storage.objects FOR DELETE
USING (
    bucket_id = 'attachments'
    AND EXISTS (
        SELECT 1 FROM public.tasks t
        JOIN public.profiles p ON p.id = t.profile_id
        WHERE t.id::text = (storage.foldername(name))[1]
        AND p.user_id = auth.uid()
    )
);

-- =========================================
-- FIN DEL ESQUEMA
-- =========================================
