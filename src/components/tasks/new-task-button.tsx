"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { useAppStore } from "@/store";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { Plus, Calendar, Flag, Tag, X, CheckCircle2, Paperclip, Upload, File, Trash2 } from "lucide-react";
import type { Priority, TaskWithRelations, Task, TaskAttachment } from "@/types/database";
import { cn } from "@/lib/utils";

const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25MB

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

interface NewTaskButtonProps {
  profileId: string;
}

export function NewTaskButton({ profileId }: NewTaskButtonProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<Priority>("medium");
  const [categoryId, setCategoryId] = useState("none");
  const [dueDate, setDueDate] = useState("");
  const [dueTime, setDueTime] = useState("");
  const [loading, setLoading] = useState(false);
  const [subtasks, setSubtasks] = useState<string[]>([]);
  const [newSubtask, setNewSubtask] = useState("");
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const {
    categories,
    addTask,
    newTaskModalOpen,
    newTaskInitialColumn,
    openNewTaskModal,
    closeNewTaskModal,
  } = useAppStore();
  const supabase = createClient();

  // Handler para cuando se cierra el modal desde el Dialog
  const handleOpenChange = (isOpen: boolean) => {
    if (!isOpen) {
      closeNewTaskModal();
      resetForm();
    }
  };

  // Efecto para configurar la fecha cuando se abre desde una columna
  useEffect(() => {
    if (newTaskModalOpen && newTaskInitialColumn) {
      const today = new Date().toISOString().split("T")[0];

      switch (newTaskInitialColumn) {
        case "today":
          setDueDate(today);
          break;
        case "scheduled":
          // Dejar vacío para que el usuario elija
          setDueDate("");
          break;
        case "pending":
        default:
          setDueDate("");
          break;
      }
    }
  }, [newTaskModalOpen, newTaskInitialColumn]);

  const handleAddSubtask = () => {
    if (newSubtask.trim()) {
      setSubtasks([...subtasks, newSubtask.trim()]);
      setNewSubtask("");
    }
  };

  const handleRemoveSubtask = (index: number) => {
    setSubtasks(subtasks.filter((_, i) => i !== index));
  };

  const handleAddFiles = (files: FileList | null) => {
    if (!files) return;
    const validFiles = Array.from(files).filter((file) => {
      if (file.size > MAX_FILE_SIZE) {
        toast.error(`"${file.name}" excede el límite de 25MB`);
        return false;
      }
      return true;
    });
    setPendingFiles((prev) => [...prev, ...validFiles]);
  };

  const handleRemoveFile = (index: number) => {
    setPendingFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    handleAddFiles(e.dataTransfer.files);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const uploadFiles = async (taskId: string): Promise<TaskAttachment[]> => {
    const uploadedAttachments: TaskAttachment[] = [];

    for (const file of pendingFiles) {
      try {
        const fileExt = file.name.split(".").pop();
        const fileName = `${taskId}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;

        const { data: uploadData, error: uploadError } = await supabase.storage
          .from("attachments")
          .upload(fileName, file);

        if (uploadError) throw uploadError;

        const attachmentData = {
          task_id: taskId,
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
          await supabase.storage.from("attachments").remove([uploadData.path]);
          throw error;
        }

        uploadedAttachments.push(data as TaskAttachment);
      } catch (error) {
        console.error(`Error uploading ${file.name}:`, error);
        toast.error(`Error al subir "${file.name}"`);
      }
    }

    return uploadedAttachments;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim()) {
      toast.error("El título es obligatorio");
      return;
    }

    setLoading(true);

    const newTask = {
      profile_id: profileId,
      title: title.trim(),
      description: description.trim() || null,
      priority,
      category_id: categoryId === "none" ? null : categoryId,
      due_date: dueDate || null,
      due_time: dueTime || null,
      status: "pending" as const,
      order: 0,
      is_recurring: false,
      recurrence_pattern: null,
      parent_task_id: null,
      completed_at: null,
    };

    const { data, error } = await supabase
      .from("tasks")
      .insert(newTask)
      .select(`
        *,
        category:categories(*),
        subtasks:tasks(*)
      `)
      .single();

    if (error) {
      toast.error("Error al crear la tarea");
      console.error(error);
    } else {
      // Create subtasks if any
      let createdSubtasks: Task[] = [];
      if (subtasks.length > 0) {
        const subtaskInserts = subtasks.map((st, index) => ({
          profile_id: profileId,
          parent_task_id: data.id,
          title: st,
          priority: "medium" as const,
          status: "pending" as const,
          order: index,
          is_recurring: false,
        }));

        const { data: subtaskData, error: subtaskError } = await supabase
          .from("tasks")
          .insert(subtaskInserts)
          .select();

        if (subtaskError) {
          console.error("Error creating subtasks:", subtaskError);
        } else {
          createdSubtasks = subtaskData as Task[];
        }
      }

      // Upload files if any
      let uploadedAttachments: TaskAttachment[] = [];
      if (pendingFiles.length > 0) {
        uploadedAttachments = await uploadFiles(data.id);
      }

      const taskWithRelations = {
        ...data,
        subtasks: createdSubtasks,
        attachments: uploadedAttachments,
      } as TaskWithRelations;

      addTask(taskWithRelations);
      toast.success("Tarea creada");
      resetForm();
      closeNewTaskModal();
    }

    setLoading(false);
  };

  const resetForm = () => {
    setTitle("");
    setDescription("");
    setPriority("medium");
    setCategoryId("none");
    setDueDate("");
    setDueTime("");
    setSubtasks([]);
    setNewSubtask("");
    setPendingFiles([]);
  };

  const handleQuickAdd = async () => {
    if (!title.trim()) {
      openNewTaskModal(null);
      return;
    }

    setLoading(true);

    const newTask = {
      profile_id: profileId,
      title: title.trim(),
      description: null,
      priority: "medium" as const,
      category_id: null,
      due_date: null,
      due_time: null,
      status: "pending" as const,
      order: 0,
      is_recurring: false,
      recurrence_pattern: null,
      parent_task_id: null,
      completed_at: null,
    };

    const { data, error } = await supabase
      .from("tasks")
      .insert(newTask)
      .select(`
        *,
        category:categories(*),
        subtasks:tasks(*)
      `)
      .single();

    if (error) {
      toast.error("Error al crear la tarea");
    } else {
      addTask(data as TaskWithRelations);
      toast.success("Tarea creada");
      setTitle("");
    }

    setLoading(false);
  };

  return (
    <>
      {/* Botón flotante */}
      <Button
        onClick={() => openNewTaskModal(null)}
        className="fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-lg"
        size="icon"
      >
        <Plus className="h-6 w-6" />
        <span className="sr-only">Nueva tarea</span>
      </Button>

      {/* Modal de nueva tarea */}
      <Dialog open={newTaskModalOpen} onOpenChange={handleOpenChange}>
        <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>Nueva tarea</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit}>
          <ScrollArea className="max-h-[calc(90vh-180px)] pr-4">
            <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="new-title">Título</Label>
              <Input
                id="new-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="¿Qué necesitas hacer?"
                autoFocus
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="new-description">Descripción (opcional)</Label>
              <Textarea
                id="new-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Añade más detalles..."
                rows={2}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Tag className="h-4 w-4" />
                  Categoría
                </Label>
                <Select value={categoryId} onValueChange={setCategoryId}>
                  <SelectTrigger>
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
              </div>

              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Flag className="h-4 w-4" />
                  Prioridad
                </Label>
                <Select
                  value={priority}
                  onValueChange={(v) => setPriority(v as Priority)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="high">Alta</SelectItem>
                    <SelectItem value="medium">Media</SelectItem>
                    <SelectItem value="low">Baja</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Fecha
                </Label>
                <Input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label>Hora</Label>
                <Input
                  type="time"
                  value={dueTime}
                  onChange={(e) => setDueTime(e.target.value)}
                />
              </div>
            </div>

            {/* Subtareas */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4" />
                Subtareas
              </Label>

              {subtasks.length > 0 && (
                <div className="space-y-1">
                  {subtasks.map((st, index) => (
                    <div
                      key={index}
                      className="flex items-center gap-2 p-2 bg-muted rounded-md text-sm"
                    >
                      <span className="flex-1">{st}</span>
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        className="h-6 w-6 text-destructive hover:text-destructive"
                        onClick={() => handleRemoveSubtask(index)}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}

              <div className="flex gap-2">
                <Input
                  placeholder="Añadir subtarea..."
                  value={newSubtask}
                  onChange={(e) => setNewSubtask(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleAddSubtask();
                    }
                  }}
                  className="h-8 text-sm"
                />
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  onClick={handleAddSubtask}
                  disabled={!newSubtask.trim()}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Adjuntos */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Paperclip className="h-4 w-4" />
                Adjuntos
              </Label>

              <div
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onClick={() => fileInputRef.current?.click()}
                className={cn(
                  "border-2 border-dashed rounded-lg p-3 text-center cursor-pointer transition-colors",
                  isDragging
                    ? "border-primary bg-primary/5"
                    : "border-muted-foreground/25 hover:border-primary/50 hover:bg-muted/50"
                )}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  className="hidden"
                  onChange={(e) => handleAddFiles(e.target.files)}
                />
                <Upload className="h-6 w-6 mx-auto text-muted-foreground" />
                <p className="text-xs text-muted-foreground mt-1">
                  Arrastra o haz clic (máx 25MB)
                </p>
              </div>

              {pendingFiles.length > 0 && (
                <div className="space-y-1 max-h-24 overflow-y-auto">
                  {pendingFiles.map((file, index) => (
                    <div
                      key={index}
                      className="flex items-center gap-2 p-2 bg-muted rounded-md text-sm"
                    >
                      <File className="h-4 w-4 shrink-0" />
                      <span className="flex-1 truncate">{file.name}</span>
                      <span className="text-xs text-muted-foreground shrink-0">
                        {formatFileSize(file.size)}
                      </span>
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        className="h-6 w-6 text-destructive hover:text-destructive shrink-0"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRemoveFile(index);
                        }}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
            </div>
          </ScrollArea>

          <DialogFooter className="pt-4 border-t mt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                closeNewTaskModal();
                resetForm();
              }}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Creando..." : "Crear tarea"}
            </Button>
          </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
