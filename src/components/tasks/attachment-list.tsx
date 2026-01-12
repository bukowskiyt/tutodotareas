"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { useAppStore } from "@/store";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  Upload,
  X,
  FileText,
  Image as ImageIcon,
  File,
  Download,
  Trash2,
  Loader2,
  Eye,
} from "lucide-react";
import type { TaskWithRelations, TaskAttachment } from "@/types/database";
import { cn } from "@/lib/utils";

interface AttachmentListProps {
  task: TaskWithRelations;
  onUpdate: (updatedTask: TaskWithRelations) => void;
}

const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25MB

function getFileIcon(fileType: string) {
  if (fileType.startsWith("image/")) return ImageIcon;
  if (fileType.includes("pdf") || fileType.includes("document")) return FileText;
  return File;
}

function canPreview(fileType: string): boolean {
  return fileType.startsWith("image/") || fileType === "application/pdf";
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function AttachmentList({ task, onUpdate }: AttachmentListProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [previewAttachment, setPreviewAttachment] = useState<TaskAttachment | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [thumbnails, setThumbnails] = useState<Record<string, string>>({});
  const fileInputRef = useRef<HTMLInputElement>(null);

  const supabase = createClient();
  const attachments = task.attachments || [];

  // Cargar miniaturas para imágenes
  useEffect(() => {
    const loadThumbnails = async () => {
      const imageAttachments = attachments.filter(a => a.file_type.startsWith("image/"));

      for (const attachment of imageAttachments) {
        if (thumbnails[attachment.id]) continue; // Ya cargada

        try {
          const { data, error } = await supabase.storage
            .from("attachments")
            .createSignedUrl(attachment.file_path, 3600);

          if (!error && data) {
            setThumbnails(prev => ({ ...prev, [attachment.id]: data.signedUrl }));
          }
        } catch (error) {
          console.error("Error loading thumbnail:", error);
        }
      }
    };

    loadThumbnails();
  }, [attachments]);

  const handlePreview = async (attachment: TaskAttachment) => {
    setLoadingPreview(true);
    setPreviewAttachment(attachment);

    try {
      // Para PDFs, usar URL firmada que funciona mejor en iframes
      if (attachment.file_type === "application/pdf") {
        const { data, error } = await supabase.storage
          .from("attachments")
          .createSignedUrl(attachment.file_path, 3600); // 1 hora

        if (error) throw error;
        setPreviewUrl(data.signedUrl);
      } else {
        // Para imágenes, descargar y crear blob URL
        const { data, error } = await supabase.storage
          .from("attachments")
          .download(attachment.file_path);

        if (error) throw error;
        const url = URL.createObjectURL(data);
        setPreviewUrl(url);
      }
    } catch (error) {
      console.error("Preview error:", error);
      toast.error("Error al cargar la vista previa");
      setPreviewAttachment(null);
    }

    setLoadingPreview(false);
  };

  const closePreview = () => {
    // Solo revocar blob URLs, no URLs firmadas
    if (previewUrl && previewUrl.startsWith("blob:")) {
      URL.revokeObjectURL(previewUrl);
    }
    setPreviewAttachment(null);
    setPreviewUrl(null);
  };

  const uploadFile = async (file: File) => {
    if (file.size > MAX_FILE_SIZE) {
      toast.error(`El archivo "${file.name}" excede el límite de 25MB`);
      return;
    }

    setUploading(true);

    try {
      // Generate unique file path
      const fileExt = file.name.split(".").pop();
      const fileName = `${task.id}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;

      // Upload to Supabase Storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from("attachments")
        .upload(fileName, file);

      if (uploadError) {
        throw uploadError;
      }

      // Create attachment record in database
      const attachmentData = {
        task_id: task.id,
        file_name: file.name,
        file_path: uploadData.path,
        file_type: file.type,
        file_size: file.size,
      };

      const { data, error } = await supabase
        .from("task_attachments")
        .insert(attachmentData)
        .select()
        .single();

      if (error) {
        // Delete uploaded file if database insert fails
        await supabase.storage.from("attachments").remove([uploadData.path]);
        throw error;
      }

      // Update local state
      const updatedTask = {
        ...task,
        attachments: [...attachments, data as TaskAttachment],
      };
      onUpdate(updatedTask);
      toast.success(`"${file.name}" subido correctamente`);
    } catch (error) {
      console.error("Upload error:", error);
      toast.error(`Error al subir "${file.name}"`);
    }

    setUploading(false);
  };

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    for (const file of Array.from(files)) {
      await uploadFile(file);
    }
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    handleFiles(e.dataTransfer.files);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDownload = async (attachment: TaskAttachment) => {
    setDownloadingId(attachment.id);

    try {
      const { data, error } = await supabase.storage
        .from("attachments")
        .download(attachment.file_path);

      if (error) throw error;

      // Create download link
      const url = URL.createObjectURL(data);
      const a = document.createElement("a");
      a.href = url;
      a.download = attachment.file_name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Download error:", error);
      toast.error("Error al descargar el archivo");
    }

    setDownloadingId(null);
  };

  const handleDelete = async (attachment: TaskAttachment) => {
    // Optimistic update
    const updatedAttachments = attachments.filter((a) => a.id !== attachment.id);
    onUpdate({ ...task, attachments: updatedAttachments });

    try {
      // Delete from storage
      const { error: storageError } = await supabase.storage
        .from("attachments")
        .remove([attachment.file_path]);

      if (storageError) {
        console.warn("Storage delete error:", storageError);
      }

      // Delete from database
      const { error: dbError } = await supabase
        .from("task_attachments")
        .delete()
        .eq("id", attachment.id);

      if (dbError) throw dbError;

      toast.success("Archivo eliminado");
    } catch (error) {
      console.error("Delete error:", error);
      toast.error("Error al eliminar el archivo");
      // Revert
      onUpdate(task);
    }
  };

  return (
    <div className="space-y-3">
      {/* Drop zone */}
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={() => fileInputRef.current?.click()}
        className={cn(
          "border-2 border-dashed rounded-lg p-4 text-center cursor-pointer transition-colors",
          isDragging
            ? "border-primary bg-primary/5"
            : "border-muted-foreground/25 hover:border-primary/50 hover:bg-muted/50",
          uploading && "opacity-50 pointer-events-none"
        )}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          className="hidden"
          onChange={(e) => handleFiles(e.target.files)}
          disabled={uploading}
        />

        {uploading ? (
          <div className="flex flex-col items-center gap-2">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Subiendo archivo...</p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2">
            <Upload className="h-8 w-8 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              Arrastra archivos aquí o haz clic para seleccionar
            </p>
            <p className="text-xs text-muted-foreground">Máximo 25MB por archivo</p>
          </div>
        )}
      </div>

      {/* Attachment list */}
      {attachments.length > 0 && (
        <div className="space-y-2">
          {attachments.map((attachment) => {
            const IconComponent = getFileIcon(attachment.file_type);
            const isDownloading = downloadingId === attachment.id;
            const isImage = attachment.file_type.startsWith("image/");
            const thumbnailUrl = thumbnails[attachment.id];

            return (
              <div
                key={attachment.id}
                className="flex items-center gap-3 p-2 bg-muted rounded-md group"
              >
                {/* Miniatura para imágenes o icono para otros archivos */}
                {isImage && thumbnailUrl ? (
                  <div
                    className="w-12 h-12 rounded overflow-hidden shrink-0 cursor-pointer hover:opacity-80 transition-opacity"
                    onClick={() => handlePreview(attachment)}
                  >
                    <img
                      src={thumbnailUrl}
                      alt={attachment.file_name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                ) : isImage ? (
                  <div className="w-12 h-12 rounded bg-muted-foreground/10 flex items-center justify-center shrink-0">
                    <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                  </div>
                ) : (
                  <IconComponent className="h-5 w-5 text-muted-foreground shrink-0" />
                )}

                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{attachment.file_name}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatFileSize(attachment.file_size)}
                  </p>
                </div>

                <div className="flex items-center gap-1">
                  {canPreview(attachment.file_type) && (
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7"
                      onClick={() => handlePreview(attachment)}
                      title="Vista previa"
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                  )}
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7"
                    onClick={() => handleDownload(attachment)}
                    disabled={isDownloading}
                    title="Descargar"
                  >
                    {isDownloading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Download className="h-4 w-4" />
                    )}
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7 text-destructive hover:text-destructive"
                    onClick={() => handleDelete(attachment)}
                    title="Eliminar"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Preview Dialog */}
      <Dialog open={previewAttachment !== null} onOpenChange={(open) => !open && closePreview()}>
        <DialogContent className="w-[95vw] max-w-[1400px] h-[90vh] p-0 overflow-hidden flex flex-col">
          <DialogHeader className="px-6 py-4 border-b shrink-0">
            <DialogTitle className="flex items-center gap-2 pr-8">
              {previewAttachment && (
                <>
                  {previewAttachment.file_type.startsWith("image/") ? (
                    <ImageIcon className="h-5 w-5" />
                  ) : (
                    <FileText className="h-5 w-5" />
                  )}
                  <span className="truncate">{previewAttachment.file_name}</span>
                </>
              )}
            </DialogTitle>
          </DialogHeader>

          <div className="flex-1 overflow-auto bg-muted/30 flex items-center justify-center">
            {loadingPreview ? (
              <div className="flex flex-col items-center gap-2">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="text-sm text-muted-foreground">Cargando vista previa...</p>
              </div>
            ) : previewUrl && previewAttachment ? (
              previewAttachment.file_type === "application/pdf" ? (
                <iframe
                  src={`https://mozilla.github.io/pdf.js/web/viewer.html?file=${encodeURIComponent(previewUrl)}`}
                  className="w-full h-full border-0"
                  title={previewAttachment.file_name}
                />
              ) : (
                <img
                  src={previewUrl}
                  alt={previewAttachment.file_name}
                  className="max-w-full max-h-full object-contain rounded-lg shadow-lg p-4"
                />
              )
            ) : null}
          </div>

          <div className="px-6 py-3 border-t flex justify-end gap-2">
            <Button variant="outline" onClick={closePreview}>
              Cerrar
            </Button>
            {previewAttachment && (
              <Button onClick={() => handleDownload(previewAttachment)}>
                <Download className="h-4 w-4 mr-2" />
                Descargar
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
