-- =========================================
-- CONFIGURACIÓN DE STORAGE PARA ADJUNTOS
-- =========================================
-- Ejecutar este script en Supabase Dashboard > SQL Editor
-- IMPORTANTE: Ejecutar DESPUÉS de haber creado las tablas principales

-- 1. Crear el bucket para adjuntos
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'attachments',
    'attachments',
    false,
    26214400, -- 25MB en bytes
    ARRAY[
        'image/jpeg',
        'image/png',
        'image/gif',
        'image/webp',
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'text/plain',
        'application/zip'
    ]
)
ON CONFLICT (id) DO UPDATE SET
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

-- 2. Eliminar políticas existentes (si las hay)
DROP POLICY IF EXISTS "Users can view attachments of their tasks" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload attachments to their tasks" ON storage.objects;
DROP POLICY IF EXISTS "Users can update attachments of their tasks" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete attachments of their tasks" ON storage.objects;

-- 3. Crear nuevas políticas de seguridad

-- SELECT: Ver archivos de sus propias tareas
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

-- INSERT: Subir archivos a sus propias tareas
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

-- UPDATE: Actualizar archivos de sus propias tareas
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

-- DELETE: Eliminar archivos de sus propias tareas
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
-- VERIFICACIÓN
-- =========================================
-- Ejecuta esta consulta para verificar que el bucket existe:
-- SELECT * FROM storage.buckets WHERE id = 'attachments';

-- Ejecuta esta consulta para ver las políticas:
-- SELECT policyname, cmd FROM pg_policies WHERE tablename = 'objects';
