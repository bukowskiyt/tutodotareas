"use client";

import { useState } from "react";
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
import { toast } from "sonner";
import { MessageSquare, Send } from "lucide-react";
import type { TaskWithRelations } from "@/types/database";
import { formatDateTime } from "@/lib/utils";

interface CommentsModalProps {
  task: TaskWithRelations;
  open: boolean;
  onClose: () => void;
}

export function CommentsModal({ task, open, onClose }: CommentsModalProps) {
  const { updateTask } = useAppStore();
  const [newComment, setNewComment] = useState("");
  const [sending, setSending] = useState(false);

  const supabase = createClient();

  const handleAddComment = async () => {
    if (!newComment.trim()) return;

    setSending(true);

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

    setSending(false);
  };

  return (
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
              [...task.comments].reverse().map((comment) => (
                <div
                  key={comment.id}
                  className="p-3 bg-muted rounded-lg"
                >
                  <p className="text-sm whitespace-pre-wrap">{comment.content}</p>
                  <p className="text-xs text-muted-foreground mt-2">
                    {formatDateTime(comment.created_at)}
                  </p>
                </div>
              ))
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                <MessageSquare className="h-16 w-16 mx-auto mb-4 opacity-20" />
                <p>No hay comentarios todavía</p>
                <p className="text-sm mt-1">Sé el primero en comentar</p>
              </div>
            )}
          </div>
        </ScrollArea>

        {/* Input de nuevo comentario */}
        <div className="p-4 border-t">
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
              autoFocus
            />
            <Button
              size="icon"
              onClick={handleAddComment}
              disabled={!newComment.trim() || sending}
              className="shrink-0 self-end"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            Enter para enviar, Shift+Enter para nueva línea
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
