-- =========================================
-- MIGRACIÓN: Añadir adjuntos a comentarios
-- =========================================
-- Ejecutar este archivo en el SQL Editor de Supabase
-- Dashboard > SQL Editor > New Query > Pegar y ejecutar

-- =========================================
-- TABLA: comment_attachments (Adjuntos de comentarios)
-- =========================================
CREATE TABLE IF NOT EXISTS public.comment_attachments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    comment_id UUID NOT NULL REFERENCES public.task_comments(id) ON DELETE CASCADE,
    file_name TEXT NOT NULL,
    file_path TEXT NOT NULL,
    file_type TEXT NOT NULL,
    file_size INTEGER NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_comment_attachments_comment_id ON public.comment_attachments(comment_id);

-- RLS
ALTER TABLE public.comment_attachments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view attachments of their comments"
    ON public.comment_attachments FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.task_comments tc
            JOIN public.tasks t ON t.id = tc.task_id
            JOIN public.profiles p ON p.id = t.profile_id
            WHERE tc.id = comment_attachments.comment_id
            AND p.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can create attachments in their comments"
    ON public.comment_attachments FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.task_comments tc
            JOIN public.tasks t ON t.id = tc.task_id
            JOIN public.profiles p ON p.id = t.profile_id
            WHERE tc.id = comment_attachments.comment_id
            AND p.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can delete attachments in their comments"
    ON public.comment_attachments FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM public.task_comments tc
            JOIN public.tasks t ON t.id = tc.task_id
            JOIN public.profiles p ON p.id = t.profile_id
            WHERE tc.id = comment_attachments.comment_id
            AND p.user_id = auth.uid()
        )
    );

-- =========================================
-- STORAGE: Actualizar políticas para adjuntos de comentarios
-- =========================================

-- Política SELECT para adjuntos de comentarios
CREATE POLICY "Users can view comment attachments"
ON storage.objects FOR SELECT
USING (
    bucket_id = 'attachments'
    AND (storage.foldername(name))[1] = 'comment-attachments'
    AND EXISTS (
        SELECT 1 FROM public.task_comments tc
        JOIN public.tasks t ON t.id = tc.task_id
        JOIN public.profiles p ON p.id = t.profile_id
        WHERE tc.id::text = (storage.foldername(name))[2]
        AND p.user_id = auth.uid()
    )
);

-- Política INSERT para adjuntos de comentarios
CREATE POLICY "Users can upload comment attachments"
ON storage.objects FOR INSERT
WITH CHECK (
    bucket_id = 'attachments'
    AND (storage.foldername(name))[1] = 'comment-attachments'
    AND EXISTS (
        SELECT 1 FROM public.task_comments tc
        JOIN public.tasks t ON t.id = tc.task_id
        JOIN public.profiles p ON p.id = t.profile_id
        WHERE tc.id::text = (storage.foldername(name))[2]
        AND p.user_id = auth.uid()
    )
);

-- Política DELETE para adjuntos de comentarios
CREATE POLICY "Users can delete comment attachments"
ON storage.objects FOR DELETE
USING (
    bucket_id = 'attachments'
    AND (storage.foldername(name))[1] = 'comment-attachments'
    AND EXISTS (
        SELECT 1 FROM public.task_comments tc
        JOIN public.tasks t ON t.id = tc.task_id
        JOIN public.profiles p ON p.id = t.profile_id
        WHERE tc.id::text = (storage.foldername(name))[2]
        AND p.user_id = auth.uid()
    )
);

-- =========================================
-- FIN DE LA MIGRACIÓN
-- =========================================
