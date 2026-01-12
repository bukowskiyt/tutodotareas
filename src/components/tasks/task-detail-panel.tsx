"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useAppStore } from "@/store";
import { createClient } from "@/lib/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import {
  Calendar,
  Clock,
  Tag,
  Flag,
  Trash2,
  MessageSquare,
  History,
  Paperclip,
  Send,
  CheckCircle2,
  Plus,
  Loader2,
  Check,
  MoreHorizontal,
  Pencil,
  ChevronDown,
  ChevronUp,
  X,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import type { TaskWithRelations, Category, Priority } from "@/types/database";
import { formatDateTime } from "@/lib/utils";
import { SubtaskList } from "./subtask-list";
import { AttachmentList } from "./attachment-list";

interface TaskDetailPanelProps {
  task: TaskWithRelations;
  categories: Category[];
}

const CATEGORY_COLORS = [
  "#ef4444", "#f97316", "#f59e0b", "#eab308", "#84cc16",
  "#22c55e", "#14b8a6", "#06b6d4", "#0ea5e9", "#3b82f6",
  "#6366f1", "#8b5cf6", "#a855f7", "#d946ef", "#ec4899",
];

export function TaskDetailPanel({ task, categories }: TaskDetailPanelProps) {
  const { setSelectedTaskId, updateTask, removeTask, addCategory } = useAppStore();
  const [title, setTitle] = useState(task.title);
  const [description, setDescription] = useState(task.description || "");
  const [priority, setPriority] = useState<Priority>(task.priority);
  const [categoryId, setCategoryId] = useState(task.category_id || "none");
  const [dueDate, setDueDate] = useState(task.due_date || "");
  const [dueTime, setDueTime] = useState(task.due_time || "");
  const [newComment, setNewComment] = useState("");
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved">("idle");
  const [sendingComment, setSendingComment] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Estados para editar/eliminar comentarios
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editingCommentContent, setEditingCommentContent] = useState("");
  const [deletingCommentId, setDeletingCommentId] = useState<string | null>(null);
  const [expandedComments, setExpandedComments] = useState<Set<string>>(new Set());

  // Estado para crear nueva categoría
  const [showNewCategory, setShowNewCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [newCategoryColor, setNewCategoryColor] = useState(CATEGORY_COLORS[0]);
  const [creatingCategory, setCreatingCategory] = useState(false);

  const supabase = createClient();
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const taskIdRef = useRef(task.id);

  // Actualizar estados SOLO cuando cambia el ID de la tarea (nueva tarea seleccionada)
  useEffect(() => {
    if (taskIdRef.current !== task.id) {
      taskIdRef.current = task.id;
      setTitle(task.title);
      setDescription(task.description || "");
      setPriority(task.priority);
      setCategoryId(task.category_id || "none");
      setDueDate(task.due_date || "");
      setDueTime(task.due_time || "");
      setSaveStatus("idle");
    }
  }, [task]);

  // Auto-guardar con debounce
  const autoSave = useCallback(async (updates: Partial<TaskWithRelations>) => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    saveTimeoutRef.current = setTimeout(async () => {
      setSaveStatus("saving");

      const fullUpdates = {
        ...updates,
        updated_at: new Date().toISOString(),
      };

      const updatedTask = { ...task, ...fullUpdates };
      updateTask(updatedTask);

      const { error } = await supabase
        .from("tasks")
        .update(fullUpdates)
        .eq("id", task.id);

      if (error) {
        console.error("Error al guardar:", error);
        setSaveStatus("idle");
      } else {
        setSaveStatus("saved");
        setTimeout(() => setSaveStatus("idle"), 2000);
      }
    }, 500);
  }, [task, updateTask, supabase]);

  // Limpiar timeout al desmontar
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);

  const handleCreateCategory = async () => {
    if (!newCategoryName.trim()) {
      toast.error("El nombre es obligatorio");
      return;
    }

    setCreatingCategory(true);

    const newCategory = {
      profile_id: task.profile_id,
      name: newCategoryName.trim(),
      color: newCategoryColor,
    };

    const { data, error } = await supabase
      .from("categories")
      .insert(newCategory)
      .select()
      .single();

    if (error) {
      toast.error("Error al crear la categoría");
      console.error(error);
    } else {
      addCategory(data);
      setCategoryId(data.id);
      toast.success("Categoría creada");
      setShowNewCategory(false);
      setNewCategoryName("");
      setNewCategoryColor(CATEGORY_COLORS[0]);
    }

    setCreatingCategory(false);
  };

  // Handlers para auto-guardar cada campo
  const handleTitleChange = (value: string) => {
    setTitle(value);
    if (value.trim()) {
      autoSave({ title: value.trim() });
    }
  };

  const handleDescriptionChange = (value: string) => {
    setDescription(value);
    autoSave({ description: value.trim() || null });
  };

  const handlePriorityChange = (value: Priority) => {
    setPriority(value);
    autoSave({ priority: value });
  };

  const handleCategoryChange = (value: string) => {
    setCategoryId(value);
    autoSave({ category_id: value === "none" ? null : value });
  };

  const handleDateChange = (value: string) => {
    setDueDate(value);
    autoSave({ due_date: value || null });
  };

  const handleTimeChange = (value: string) => {
    setDueTime(value);
    autoSave({ due_time: value || null });
  };

  const handleDelete = async () => {
    const taskBackup = { ...task };
    removeTask(task.id);
    setSelectedTaskId(null);

    const { error } = await supabase.from("tasks").delete().eq("id", task.id);

    if (error) {
      toast.error("Error al eliminar la tarea");
    } else {
      toast.success("Tarea eliminada", {
        action: {
          label: "Deshacer",
          onClick: async () => {
            // Restaurar tarea
            const { error: restoreError } = await supabase
              .from("tasks")
              .insert({
                ...taskBackup,
                id: undefined, // Supabase generará nuevo ID
              })
              .select()
              .single();

            if (!restoreError) {
              // Recargar tareas
              window.location.reload();
            }
          },
        },
      });
    }
  };

  const handleAddComment = async () => {
    if (!newComment.trim()) return;

    setSendingComment(true);

    const comment = {
      task_id: task.id,
      content: newComment.trim(),
    };

    const { data, error } = await supabase
      .from("task_comments")
      .insert(comment)
      .select()
      .single();

    if (error) {
      toast.error("Error al añadir comentario");
    } else {
      const updatedTask = {
        ...task,
        comments: [...(task.comments || []), data],
      };
      updateTask(updatedTask);
      setNewComment("");
      toast.success("Comentario añadido");
    }

    setSendingComment(false);
  };

  // Funciones para editar comentarios
  const startEditComment = (comment: { id: string; content: string }) => {
    setEditingCommentId(comment.id);
    setEditingCommentContent(comment.content);
  };

  const cancelEditComment = () => {
    setEditingCommentId(null);
    setEditingCommentContent("");
  };

  const saveEditComment = async () => {
    if (!editingCommentId || !editingCommentContent.trim()) return;

    const { error } = await supabase
      .from("task_comments")
      .update({ content: editingCommentContent.trim() })
      .eq("id", editingCommentId);

    if (error) {
      toast.error("Error al editar comentario");
    } else {
      const updatedComments = task.comments?.map((c) =>
        c.id === editingCommentId ? { ...c, content: editingCommentContent.trim() } : c
      );
      updateTask({ ...task, comments: updatedComments });
      toast.success("Comentario actualizado");
      cancelEditComment();
    }
  };

  // Función para eliminar comentario
  const deleteComment = async (commentId: string) => {
    const { error } = await supabase
      .from("task_comments")
      .delete()
      .eq("id", commentId);

    if (error) {
      toast.error("Error al eliminar comentario");
    } else {
      const updatedComments = task.comments?.filter((c) => c.id !== commentId);
      updateTask({ ...task, comments: updatedComments });
      toast.success("Comentario eliminado");
      setDeletingCommentId(null);
    }
  };

  // Función para expandir/colapsar comentario
  const toggleExpandComment = (commentId: string) => {
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

  const COMMENT_PREVIEW_LENGTH = 200;

  return (
    <Dialog open onOpenChange={() => setSelectedTaskId(null)}>
      <DialogContent className="max-w-3xl max-h-[90vh] p-0 gap-0 overflow-hidden">
        <DialogHeader className="px-6 py-4 border-b">
          <DialogTitle className="text-xl">Detalle de la tarea</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col md:flex-row h-full max-h-[calc(90vh-80px)]">
          {/* Panel izquierdo: Detalles de la tarea */}
          <div className="flex-1 p-6 overflow-y-auto border-r">
            <div className="space-y-5">
              {/* Título */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="title">Título</Label>
                  {/* Indicador de guardado */}
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    {saveStatus === "saving" && (
                      <>
                        <Loader2 className="h-3 w-3 animate-spin" />
                        <span>Guardando...</span>
                      </>
                    )}
                    {saveStatus === "saved" && (
                      <>
                        <Check className="h-3 w-3 text-green-500" />
                        <span className="text-green-500">Guardado</span>
                      </>
                    )}
                  </div>
                </div>
                <Input
                  id="title"
                  value={title}
                  onChange={(e) => handleTitleChange(e.target.value)}
                  placeholder="Título de la tarea"
                  className="text-lg font-medium"
                />
              </div>

              {/* Descripción */}
              <div className="space-y-2">
                <Label htmlFor="description">Descripción</Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => handleDescriptionChange(e.target.value)}
                  placeholder="Descripción opcional..."
                  rows={3}
                />
              </div>

              {/* Fila: Categoría y Prioridad */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Tag className="h-4 w-4" />
                    Categoría
                  </Label>
                  <Popover open={showNewCategory} onOpenChange={setShowNewCategory}>
                    <div className="flex gap-1">
                      <Select value={categoryId} onValueChange={handleCategoryChange}>
                        <SelectTrigger className="flex-1">
                          <SelectValue placeholder="Sin categoría" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">Sin categoría</SelectItem>
                          {categories.map((cat) => (
                            <SelectItem key={cat.id} value={cat.id}>
                              <div className="flex items-center gap-2">
                                <div
                                  className="w-3 h-3 rounded-full"
                                  style={{ backgroundColor: cat.color }}
                                />
                                {cat.name}
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <PopoverTrigger asChild>
                        <Button size="icon" variant="outline" className="shrink-0" title="Nueva categoría">
                          <Plus className="h-4 w-4" />
                        </Button>
                      </PopoverTrigger>
                    </div>
                    <PopoverContent className="w-64 p-3" align="start">
                      <div className="space-y-3">
                        <div className="font-medium text-sm">Nueva categoría</div>
                        <Input
                          placeholder="Nombre"
                          value={newCategoryName}
                          onChange={(e) => setNewCategoryName(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              handleCreateCategory();
                            }
                          }}
                        />
                        <div className="flex flex-wrap gap-1">
                          {CATEGORY_COLORS.map((color) => (
                            <button
                              key={color}
                              type="button"
                              className={`w-6 h-6 rounded-full transition-transform ${
                                newCategoryColor === color ? "ring-2 ring-offset-2 ring-primary scale-110" : ""
                              }`}
                              style={{ backgroundColor: color }}
                              onClick={() => setNewCategoryColor(color)}
                            />
                          ))}
                        </div>
                        <Button
                          size="sm"
                          className="w-full"
                          onClick={handleCreateCategory}
                          disabled={creatingCategory || !newCategoryName.trim()}
                        >
                          {creatingCategory ? "Creando..." : "Crear"}
                        </Button>
                      </div>
                    </PopoverContent>
                  </Popover>
                </div>

                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Flag className="h-4 w-4" />
                    Prioridad
                  </Label>
                  <Select
                    value={priority}
                    onValueChange={(v) => handlePriorityChange(v as Priority)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="high">
                        <Badge variant="high">Alta</Badge>
                      </SelectItem>
                      <SelectItem value="medium">
                        <Badge variant="medium">Media</Badge>
                      </SelectItem>
                      <SelectItem value="low">
                        <Badge variant="low">Baja</Badge>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Fila: Fecha y Hora */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    Fecha
                  </Label>
                  <Input
                    type="date"
                    value={dueDate}
                    onChange={(e) => handleDateChange(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    Hora
                  </Label>
                  <Input
                    type="time"
                    value={dueTime}
                    onChange={(e) => handleTimeChange(e.target.value)}
                  />
                </div>
              </div>

              {/* Subtareas */}
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4" />
                  Subtareas
                </Label>
                <SubtaskList task={task} onUpdate={updateTask} />
              </div>

              {/* Adjuntos */}
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Paperclip className="h-4 w-4" />
                  Adjuntos
                </Label>
                <AttachmentList task={task} onUpdate={updateTask} />
              </div>

              {/* Historial */}
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <History className="h-4 w-4" />
                  Historial
                </Label>
                <div className="space-y-1 text-sm text-muted-foreground">
                  <p>Creada: {formatDateTime(task.created_at)}</p>
                  <p>Actualizada: {formatDateTime(task.updated_at)}</p>
                  {task.completed_at && (
                    <p>Completada: {formatDateTime(task.completed_at)}</p>
                  )}
                </div>
              </div>

              {/* Botón de eliminar con confirmación */}
              <div className="flex gap-2 pt-2">
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive" className="w-full">
                      <Trash2 className="h-4 w-4 mr-2" />
                      Eliminar tarea
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>¿Eliminar esta tarea?</AlertDialogTitle>
                      <AlertDialogDescription>
                        Esta acción no se puede deshacer. La tarea "{task.title}" será eliminada permanentemente.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancelar</AlertDialogCancel>
                      <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                        Eliminar
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </div>
          </div>

          {/* Panel derecho: Comentarios (destacado) */}
          <div className="w-full md:w-80 flex flex-col bg-muted/30">
            <div className="px-4 py-3 border-b bg-primary/5">
              <h3 className="font-semibold flex items-center gap-2">
                <MessageSquare className="h-5 w-5 text-primary" />
                Comentarios
                {task.comments && task.comments.length > 0 && (
                  <Badge variant="secondary" className="ml-auto">
                    {task.comments.length}
                  </Badge>
                )}
              </h3>
            </div>

            <ScrollArea className="flex-1 p-4">
              <div className="space-y-3">
                {task.comments && task.comments.length > 0 ? (
                  [...task.comments].reverse().map((comment) => {
                    const isEditing = editingCommentId === comment.id;
                    const isDeleting = deletingCommentId === comment.id;
                    const isLongComment = comment.content.length > COMMENT_PREVIEW_LENGTH;
                    const isExpanded = expandedComments.has(comment.id);
                    const displayContent = isLongComment && !isExpanded
                      ? comment.content.slice(0, COMMENT_PREVIEW_LENGTH) + "..."
                      : comment.content;

                    return (
                      <div
                        key={comment.id}
                        className="p-3 bg-background rounded-lg border shadow-sm group relative"
                      >
                        {/* Menú de opciones (visible on hover) */}
                        {!isEditing && !isDeleting && (
                          <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-7 w-7">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => startEditComment(comment)}>
                                  <Pencil className="mr-2 h-4 w-4" />
                                  Editar
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => setDeletingCommentId(comment.id)}
                                  className="text-destructive focus:text-destructive"
                                >
                                  <Trash2 className="mr-2 h-4 w-4" />
                                  Eliminar
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        )}

                        {/* Contenido del comentario */}
                        {isEditing ? (
                          <div className="space-y-2">
                            <Textarea
                              value={editingCommentContent}
                              onChange={(e) => setEditingCommentContent(e.target.value)}
                              rows={3}
                              className="resize-none text-sm"
                              autoFocus
                            />
                            <div className="flex gap-2 justify-end">
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={cancelEditComment}
                              >
                                <X className="h-4 w-4 mr-1" />
                                Cancelar
                              </Button>
                              <Button
                                size="sm"
                                onClick={saveEditComment}
                                disabled={!editingCommentContent.trim()}
                              >
                                <Check className="h-4 w-4 mr-1" />
                                Guardar
                              </Button>
                            </div>
                          </div>
                        ) : isDeleting ? (
                          <div className="space-y-2">
                            <p className="text-sm text-destructive font-medium">
                              ¿Eliminar este comentario?
                            </p>
                            <div className="flex gap-2 justify-end">
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => setDeletingCommentId(null)}
                              >
                                Cancelar
                              </Button>
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => deleteComment(comment.id)}
                              >
                                <Trash2 className="h-4 w-4 mr-1" />
                                Eliminar
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <>
                            <p className="text-sm whitespace-pre-wrap pr-8">{displayContent}</p>
                            {isLongComment && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-auto p-0 text-xs text-primary hover:text-primary/80"
                                onClick={() => toggleExpandComment(comment.id)}
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
                            <p className="text-xs text-muted-foreground mt-2">
                              {formatDateTime(comment.created_at)}
                            </p>
                          </>
                        )}
                      </div>
                    );
                  })
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <MessageSquare className="h-12 w-12 mx-auto mb-3 opacity-20" />
                    <p className="text-sm">No hay comentarios</p>
                    <p className="text-xs mt-1">Escribe el primer comentario</p>
                  </div>
                )}
              </div>
            </ScrollArea>

            {/* Input de nuevo comentario */}
            <div className="p-4 border-t bg-background">
              <div className="flex gap-2">
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
                  className="resize-none"
                />
                <Button
                  size="icon"
                  onClick={handleAddComment}
                  disabled={!newComment.trim() || sendingComment}
                  className="shrink-0 self-end"
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                Presiona Enter para enviar, Shift+Enter para nueva línea
              </p>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
