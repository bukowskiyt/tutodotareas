"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import { es } from "date-fns/locale";

interface DatePickerModalProps {
  open: boolean;
  onClose: () => void;
  onSelect: (date: string) => void;
  title?: string;
  description?: string;
}

export function DatePickerModal({
  open,
  onClose,
  onSelect,
  title = "Seleccionar fecha",
  description = "Elige una fecha para programar la tarea",
}: DatePickerModalProps) {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);

  const handleConfirm = () => {
    if (selectedDate) {
      const dateString = format(selectedDate, "yyyy-MM-dd");
      onSelect(dateString);
      setSelectedDate(undefined);
    }
  };

  const handleClose = () => {
    setSelectedDate(undefined);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && handleClose()}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <div className="flex justify-center py-4">
          <Calendar
            mode="single"
            selected={selectedDate}
            onSelect={setSelectedDate}
            locale={es}
            className="rounded-md border"
          />
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={handleClose}>
            Cancelar
          </Button>
          <Button onClick={handleConfirm} disabled={!selectedDate}>
            Confirmar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
