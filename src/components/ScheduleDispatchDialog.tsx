import { useState, useEffect } from "react";
import { Clock, Calendar as CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Label } from "@/components/ui/label";

interface ScheduleDispatchDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (scheduledAt: Date) => void;
}

const ScheduleDispatchDialog = ({ open, onOpenChange, onConfirm }: ScheduleDispatchDialogProps) => {
  const [date, setDate] = useState<Date>(new Date());
  const [hour, setHour] = useState(new Date().getHours().toString().padStart(2, "0"));
  const [minute, setMinute] = useState(new Date().getMinutes().toString().padStart(2, "0"));
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    if (!open) return;
    const interval = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(interval);
  }, [open]);

  const hours = Array.from({ length: 24 }, (_, i) => i.toString().padStart(2, "0"));
  const minutes = Array.from({ length: 60 }, (_, i) => i.toString().padStart(2, "0"));

  const handleConfirm = () => {
    const scheduled = new Date(date);
    scheduled.setHours(parseInt(hour), parseInt(minute), 0, 0);
    onConfirm(scheduled);
  };

  const setShortcut = (hoursFromNow: number, label?: string) => {
    const target = new Date();
    if (label === "amanha9h") {
      target.setDate(target.getDate() + 1);
      target.setHours(9, 0, 0, 0);
    } else {
      target.setTime(target.getTime() + hoursFromNow * 60 * 60 * 1000);
    }
    setDate(target);
    setHour(target.getHours().toString().padStart(2, "0"));
    setMinute(target.getMinutes().toString().padStart(2, "0"));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" /> Agendar Envio
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Current time */}
          <div className="flex items-center gap-2 rounded-md bg-muted/50 px-3 py-2 text-sm">
            <span className="h-2 w-2 rounded-full bg-green-500" />
            Horário atual: <span className="font-bold">{format(now, "dd/MM/yyyy  HH:mm:ss")}</span>
          </div>

          {/* Date picker */}
          <div className="space-y-1.5">
            <Label>Data</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className={cn("w-full justify-start text-left font-normal")}>
                  <CalendarIcon className="h-4 w-4" />
                  {format(date, "d 'de' MMMM 'de' yyyy", { locale: ptBR })}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={date}
                  onSelect={(d) => d && setDate(d)}
                  disabled={(d) => d < new Date(new Date().setHours(0, 0, 0, 0))}
                  initialFocus
                  className={cn("p-3 pointer-events-auto")}
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Time selectors */}
          <div className="space-y-1.5">
            <Label>Horário</Label>
            <div className="flex items-center gap-2">
              <select
                value={hour}
                onChange={(e) => setHour(e.target.value)}
                className="flex h-9 flex-1 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                {hours.map((h) => (
                  <option key={h} value={h}>{h}</option>
                ))}
              </select>
              <span className="text-lg font-bold">:</span>
              <select
                value={minute}
                onChange={(e) => setMinute(e.target.value)}
                className="flex h-9 flex-1 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                {minutes.map((m) => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Shortcuts */}
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Atalhos</Label>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm" onClick={() => setShortcut(1)}>Em 1h</Button>
              <Button variant="outline" size="sm" onClick={() => setShortcut(2)}>Em 2h</Button>
              <Button variant="outline" size="sm" onClick={() => setShortcut(4)}>Em 4h</Button>
              <Button variant="outline" size="sm" onClick={() => setShortcut(0, "amanha9h")}>Amanhã 9h</Button>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-2">
            <Button variant="outline" className="flex-1" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button className="flex-1" onClick={handleConfirm}>
              <Clock className="h-4 w-4" /> Confirmar Agendamento
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ScheduleDispatchDialog;
