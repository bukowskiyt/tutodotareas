"use client";

import { useState, useRef } from "react";
import { useAppStore } from "@/store";
import { createClient } from "@/lib/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import {
  MessageSquare,
  Send,
  MoreHorizontal,
  Pencil,
  Trash2,
  ChevronDown,
  ChevronUp,
  Paperclip,
  X,
  Download,
  FileText,
  Image as ImageIcon,
  Loader2,
} from "lucide-react";
import type { TaskWithRelations, TaskComment } from "@/types/database";
import { formatDateTime, cn } from "@/lib/utils";

interface CommentAttachment {
  id: string;
  comment_id: string;
  file_name: string;
  file_path: string;
  file_type: string;
  file_size: number;
  created_at: string;
}

interface CommentWithAttachments extends TaskComment {
  attachments?: CommentAttachment[];
}

interface CommentsModalProps {
  task: TaskWithRelations;
  open: boolean;
  onClose: () => void;
}

const MAX_COLLAPSED_LENGTH = 200;

export function CommentsModal({ task, open, onClose }: CommentsModalProps) {
  const { updateTask } = useAppStore();
  const [newComment, setNewComment] = useState("");
  const [sending, setSending] = useState(false);
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState("");
  const [expandedComments, setExpandedComments] = useState<Set<string>>(new Set());
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [attachments, setAttachments] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const supabase = createClient();

  const handleAddComment = async () => {
    if (!newComment.trim() && attachments.length === 0) return;

    setSending(true);

    try {
      // Crear el comentario
      const comment = {
        task_id: task.id,
        content: newComment.trim() || "(Archivo adjunto)",
      };

      const { data: commentData, error: commentError } = await supabase
        .from("task_comments")
        .insert(comment)
        .select()
        .single();

      if (commentError) {
        toast.error("Error al añadir comentario");
        setSending(false);
        return;
      }

      // Subir archivos adjuntos si hay
      const uploadedAttachments: CommentAttachment[] = [];
      if (attachments.length > 0) {
        setUploading(true);
        for (const file of attachments) {
          try {
            const fileExt = file.name.split(".").pop();
            const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
            const filePath = `comment-attachments/${commentData.id}/${fileName}`;

            const { error: uploadError } = await supabase.storage
              .from("attachments")
              .upload(filePath, file);

            if (!uploadError) {
              const { data: attachmentData, error: attachmentError } = await supabase
                .from("comment_attachments")
                .insert({
                  comment_id: commentData.id,
                  file_name: file.name,
                  file_path: filePath,
                  file_type: file.type,
                  file_size: file.size,
                })
                .select()
                .single();

              if (!attachmentError && attachmentData) {
                uploadedAttachments.push(attachmentData);
              } else if (attachmentError) {
                // Si la tabla no existe, eliminar el archivo subido
                await supabase.storage.from("attachments").remove([filePath]);
                console.error("Error saving attachment record:", attachmentError);
              }
            }
          } catch (err) {
            console.error("Error uploading file:", err);
          }
        }
        setUploading(false);
      }

      const newCommentWithAttachments: CommentWithAttachments = {
        ...commentData,
        attachments: uploadedAttachments,
      };

      const updatedTask = {
        ...task,
        comments: [...(task.comments || []), newCommentWithAttachments],
      };
      updateTask(updatedTask);
      setNewComment("");
      setAttachments([]);
      toast.success("Comentario añadido");
    } catch {
      toast.error("Error al añadir comentario");
    }

    setSending(false);
  };

  const handleEditComment = async (commentId: string) => {
    if (!editContent.trim()) return;

    const { error } = await supabase
      .from("task_comments")
      .update({ content: editContent.trim(), updated_at: new Date().toISOString() })
      .eq("id", commentId);

    if (error) {
      toast.error("Error al editar comentario");
      return;
    }

    const updatedComments = (task.comments || []).map((c) =>
      c.id === commentId
        ? { ...c, content: editContent.trim(), updated_at: new Date().toISOString() }
        : c
    );

    updateTask({
      ...task,
      comments: updatedComments,
    });

    setEditingCommentId(null);
    setEditContent("");
    toast.success("Comentario actualizado");
  };

  const handleDeleteComment = async (commentId: string) => {
    // Primero eliminar los archivos adjuntos del storage
    const comment = (task.comments || []).find((c) => c.id === commentId) as CommentWithAttachments;
    if (comment?.attachments) {
      for (const attachment of comment.attachments) {
        await supabase.storage.from("attachments").remove([attachment.file_path]);
      }
      // Eliminar registros de adjuntos
      await supabase.from("comment_attachments").delete().eq("comment_id", commentId);
    }

    const { error } = await supabase
      .from("task_comments")
      .delete()
      .eq("id", commentId);

    if (error) {
      toast.error("Error al eliminar comentario");
      return;
    }

    const updatedComments = (task.comments || []).filter((c) => c.id !== commentId);

    updateTask({
      ...task,
      comments: updatedComments,
    });

    setDeleteConfirmId(null);
    toast.success("Comentario eliminado");
  };

  const toggleExpand = (commentId: string) => {
    setExpandedComments((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(commentId)) {
        newSet.delete(commentId);
      } else {
        newSet.add(commentId);
      }
      return newSet;
    });
  };

  const startEdit = (comment: TaskComment) => {
    setEditingCommentId(comment.id);
    setEditContent(comment.content);
  };

  const cancelEdit = () => {
    setEditingCommentId(null);
    setEditContent("");
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const validFiles = files.filter((file) => {
      if (file.size > 25 * 1024 * 1024) {
        toast.error(`${file.name} es demasiado grande (máx. 25MB)`);
        return false;
      }
      return true;
    });
    setAttachments((prev) => [...prev, ...validFiles]);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const removeAttachment = (index: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index));
  };

  const downloadAttachment = async (attachment: CommentAttachment) => {
    const { data, error } = await supabase.storage
      .from("attachments")
      .download(attachment.file_path);

    if (error) {
      toast.error("Error al descargar archivo");
      return;
    }

    const url = URL.createObjectURL(data);
    const a = document.createElement("a");
    a.href = url;
    a.download = attachment.file_name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const getFileIcon = (fileType: string) => {
    if (fileType.startsWith("image/")) {
      return <ImageIcon className="h-4 w-4" />;
    }
    return <FileText className="h-4 w-4" />;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const isLongComment = (content: string) => content.length > MAX_COLLAPSED_LENGTH;

  const getDisplayContent = (comment: TaskComment) => {
    if (!isLongComment(comment.content) || expandedComments.has(comment.id)) {
      return comment.content;
    }
    return comment.content.substring(0, MAX_COLLAPSED_LENGTH) + "...";
  };

  return (
    <>
      <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
        <DialogContent className="max-w-lg max-h-[80vh] flex flex-col p-0 gap-0">
          <DialogHeader className="px-6 py-4 border-b">
            <DialogTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-primary" />
              Comentarios - {task.title}
            </DialogTitle>
          </DialogHeader>

          {/* Lista de comentarios */}
          <ScrollArea className="flex-1 min-h-0 max-h-[400px]">
            <div className="p-4 space-y-3">
              {task.comments && task.comments.length > 0 ? (
                [...task.comments].reverse().map((comment) => {
                  const commentWithAttachments = comment as CommentWithAttachments;
                  const isEditing = editingCommentId === comment.id;
                  const isExpanded = expandedComments.has(comment.id);
                  const isLong = isLongComment(comment.content);

                  return (
                    <div
                      key={comment.id}
                      className={cn(
                        "p-3 bg-muted rounded-lg group relative",
                        isEditing && "ring-2 ring-primary"
                      )}
                    >
                      {isEditing ? (
                        <div className="space-y-2">
                          <Textarea
                            value={editContent}
                            onChange={(e) => setEditContent(e.target.value)}
                            rows={3}
                            className="resize-none"
                            autoFocus
                          />
                          <div className="flex gap-2 justify-end">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={cancelEdit}
                            >
                              Cancelar
                            </Button>
                            <Button
                              size="sm"
                              onClick={() => handleEditComment(comment.id)}
                              disabled={!editContent.trim()}
                            >
                              Guardar
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <>
                          {/* Menú de opciones */}
                          <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7"
                                >
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => startEdit(comment)}>
                                  <Pencil className="mr-2 h-4 w-4" />
                                  Editar
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => setDeleteConfirmId(comment.id)}
                                  className="text-destructive focus:text-destructive"
                                >
                                  <Trash2 className="mr-2 h-4 w-4" />
                                  Eliminar
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>

                          {/* Contenido del comentario */}
                          <p className="text-sm whitespace-pre-wrap pr-8">
                            {getDisplayContent(comment)}
                          </p>

                          {/* Botón expandir/contraer */}
                          {isLong && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 px-2 text-xs text-muted-foreground hover:text-foreground mt-1"
                              onClick={() => toggleExpand(comment.id)}
                            >
                              {isExpanded ? (
                                <>
                                  <ChevronUp className="h-3 w-3 mr-1" />
                                  Ver menos
                                </>
                              ) : (
                                <>
                                  <ChevronDown className="h-3 w-3 mr-1" />
                                  Ver más
                                </>
                              )}
                            </Button>
                          )}

                          {/* Archivos adjuntos del comentario */}
                          {commentWithAttachments.attachments &&
                            commentWithAttachments.attachments.length > 0 && (
                              <div className="mt-2 space-y-1">
                                {commentWithAttachments.attachments.map((attachment) => (
                                  <div
                                    key={attachment.id}
                                    className="flex items-center gap-2 p-2 bg-background rounded text-xs"
                                  >
                                    {getFileIcon(attachment.file_type)}
                                    <span className="flex-1 truncate">
                                      {attachment.file_name}
                                    </span>
                                    <span className="text-muted-foreground">
                                      {formatFileSize(attachment.file_size)}
                                    </span>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-6 w-6"
                                      onClick={() => downloadAttachment(attachment)}
                                    >
                                      <Download className="h-3 w-3" />
                                    </Button>
                                  </div>
                                ))}
                              </div>
                            )}

                          {/* Fecha */}
                          <p className="text-xs text-muted-foreground mt-2">
                            {formatDateTime(comment.created_at)}
                            {comment.updated_at !== comment.created_at && (
                              <span className="ml-1">(editado)</span>
                            )}
                          </p>
                        </>
                      )}
                    </div>
                  );
                })
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <MessageSquare className="h-16 w-16 mx-auto mb-4 opacity-20" />
                  <p>No hay comentarios todavía</p>
                  <p className="text-sm mt-1">Sé el primero en comentar</p>
                </div>
              )}
            </div>
          </ScrollArea>

          {/* Archivos adjuntos pendientes */}
          {attachments.length > 0 && (
            <div className="px-4 py-2 border-t bg-muted/50">
              <p className="text-xs text-muted-foreground mb-2">
                Archivos adjuntos ({attachments.length})
              </p>
              <div className="flex flex-wrap gap-2">
                {attachments.map((file, index) => (
                  <div
                    key={index}
                    className="flex items-center gap-1 bg-background px-2 py-1 rounded text-xs"
                  >
                    {getFileIcon(file.type)}
                    <span className="max-w-[100px] truncate">{file.name}</span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-4 w-4 p-0"
                      onClick={() => removeAttachment(index)}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Input de nuevo comentario */}
          <div className="p-4 border-t">
            <div className="flex gap-2">
              <div className="flex-1 relative">
                <Textarea
                  placeholder="Escribe un comentario..."
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleAddComment();
                    }
                  }}
                  rows={2}
                  className="resize-none pr-10"
                  autoFocus
                />
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  className="hidden"
                  onChange={handleFileSelect}
                  accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt"
                />
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute right-2 bottom-2 h-6 w-6"
                  onClick={() => fileInputRef.current?.click()}
                  title="Adjuntar archivo"
                >
                  <Paperclip className="h-4 w-4" />
                </Button>
              </div>
              <Button
                size="icon"
                onClick={handleAddComment}
                disabled={(!newComment.trim() && attachments.length === 0) || sending || uploading}
                className="shrink-0 self-end"
              >
                {sending || uploading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Enter para enviar, Shift+Enter para nueva línea
            </p>
          </div>
        </DialogContent>
      </Dialog>

      {/* Confirmación de eliminación */}
      <AlertDialog open={!!deleteConfirmId} onOpenChange={() => setDeleteConfirmId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar comentario?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. El comentario y sus archivos adjuntos serán eliminados permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteConfirmId && handleDeleteComment(deleteConfirmId)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
