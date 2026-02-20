"use client";

import { useState } from "react";
import { dismissDailySummary } from "@/lib/actions";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Calendar, AlertTriangle, CheckCircle2 } from "lucide-react";
import type { TaskWithRelations } from "@/types/database";

interface DailySummaryModalProps {
  tasks: TaskWithRelations[];
}

export function DailySummaryModal({ tasks }: DailySummaryModalProps) {
  const [open, setOpen] = useState(true);

  // Calcular estadísticas
  const todayTasks = tasks.filter((t) => {
    if (!t.due_date || t.status === "completed" || t.status === "archived")
      return false;
    const today = new Date().toDateString();
    const taskDate = new Date(t.due_date).toDateString();
    return today === taskDate;
  });

  const overdueTasks = tasks.filter((t) => {
    if (!t.due_date || t.status === "completed" || t.status === "archived")
      return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const taskDate = new Date(t.due_date);
    return taskDate < today;
  });

  const handleClose = async () => {
    setOpen(false);
    await dismissDailySummary();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Resumen del día
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Tareas de hoy */}
          <div className="flex items-center gap-4 p-4 rounded-lg bg-blue-50 dark:bg-blue-950">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900">
              <CheckCircle2 className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className="text-2xl font-bold">{todayTasks.length}</p>
              <p className="text-sm text-muted-foreground">
                {todayTasks.length === 1
                  ? "tarea para hoy"
                  : "tareas para hoy"}
              </p>
            </div>
          </div>

          {/* Tareas atrasadas */}
          {overdueTasks.length > 0 && (
            <div className="flex items-center gap-4 p-4 rounded-lg bg-red-50 dark:bg-red-950">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-100 dark:bg-red-900">
                <AlertTriangle className="h-6 w-6 text-red-600 dark:text-red-400" />
              </div>
              <div>
                <p className="text-2xl font-bold">{overdueTasks.length}</p>
                <p className="text-sm text-muted-foreground">
                  {overdueTasks.length === 1
                    ? "tarea atrasada"
                    : "tareas atrasadas"}
                </p>
              </div>
            </div>
          )}

          {/* Mensaje motivacional */}
          {todayTasks.length === 0 && overdueTasks.length === 0 ? (
            <p className="text-center text-muted-foreground">
              No tienes tareas pendientes para hoy. ¡Buen trabajo!
            </p>
          ) : (
            <p className="text-center text-sm text-muted-foreground">
              {overdueTasks.length > 0
                ? "Recuerda completar las tareas atrasadas."
                : "¡Tienes un día productivo por delante!"}
            </p>
          )}
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          {todayTasks.length > 0 && (
            <Button onClick={handleClose} className="w-full sm:w-auto">
              Ver tareas de hoy
            </Button>
          )}
          <Button
            variant={todayTasks.length > 0 ? "outline" : "default"}
            onClick={handleClose}
            className="w-full sm:w-auto"
          >
            Entendido
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
