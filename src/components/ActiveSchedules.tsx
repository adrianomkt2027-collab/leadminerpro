import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Clock, Calendar, XCircle, Pause, Play, Shield, Timer, Zap, StopCircle } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { Json } from "@/integrations/supabase/types";

interface ScheduledDispatch {
  id: string;
  scheduled_at: string;
  status: string;
  message_text: string;
  contacts: Json;
  dispatch_type: string;
  instance_name: string | null;
  created_at: string;
  results: Json | null;
  processed_at: string | null;
  min_delay: number;
  max_delay: number;
  batch_size: number;
  batch_pause: number;
  sent_count: number;
}

const ActiveSchedules = ({ refreshKey }: { refreshKey?: number }) => {
  const [schedules, setSchedules] = useState<ScheduledDispatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [now, setNow] = useState(new Date());

  const fetchSchedules = async () => {
    const { data, error } = await supabase
      .from("scheduled_dispatches")
      .select("id, scheduled_at, status, message_text, contacts, dispatch_type, instance_name, created_at, results, processed_at, min_delay, max_delay, batch_size, batch_pause, sent_count")
      .in("status", ["pending", "processing", "paused"])
      .order("scheduled_at", { ascending: true });

    if (!error && data) {
      setSchedules(data as unknown as ScheduledDispatch[]);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchSchedules();

    // Poll every 3s as fallback for realtime delays
    const pollInterval = setInterval(fetchSchedules, 3000);

    const channel = supabase
      .channel("active-schedules")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "scheduled_dispatches" },
        () => fetchSchedules()
      )
      .subscribe();

    return () => {
      clearInterval(pollInterval);
      supabase.removeChannel(channel);
    };
  }, []);

  useEffect(() => {
    if (refreshKey) fetchSchedules();
  }, [refreshKey]);

  // Tick for countdown
  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  const handleCancel = async (id: string) => {
    const { error } = await supabase
      .from("scheduled_dispatches")
      .update({ status: "cancelled" })
      .eq("id", id);

    if (error) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Cancelado", description: "Agendamento cancelado com sucesso." });
      fetchSchedules();
    }
  };

  const handlePause = async (id: string) => {
    const { error } = await supabase
      .from("scheduled_dispatches")
      .update({ status: "paused" })
      .eq("id", id);

    if (error) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Pausado", description: "Disparo pausado." });
      fetchSchedules();
    }
  };

  const handleResume = async (id: string) => {
    const { error } = await supabase
      .from("scheduled_dispatches")
      .update({ status: "processing" })
      .eq("id", id);

    if (error) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Retomado", description: "Disparo retomado." });
      fetchSchedules();
    }
  };

  const getCountdown = (scheduledAt: string) => {
    const target = new Date(scheduledAt).getTime();
    const diff = target - now.getTime();

    if (diff <= 0) return { text: "00:00:00", seconds: 0 };

    const hours = Math.floor(diff / 3600000);
    const minutes = Math.floor((diff % 3600000) / 60000);
    const seconds = Math.floor((diff % 60000) / 1000);

    return {
      text: `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`,
      seconds: diff / 1000,
    };
  };

  const getContactCount = (contacts: Json): number => {
    if (Array.isArray(contacts)) return contacts.length;
    return 0;
  };

  if (loading) return null;
  if (schedules.length === 0) return null;

  return (
    <Card className="border-primary/30">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2 text-muted-foreground uppercase tracking-wider">
          <Clock className="h-4 w-4" /> Agendamentos Ativos
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {schedules.map((schedule) => {
          const countdown = getCountdown(schedule.scheduled_at);
          const contactCount = getContactCount(schedule.contacts);
          const sent = schedule.sent_count ?? 0;
          const isPending = schedule.status === "pending";
          const isProcessing = schedule.status === "processing";
          const isPaused = schedule.status === "paused";
          const isActive = isProcessing || isPaused;
          const progressPercent = contactCount > 0 ? (sent / contactCount) * 100 : 0;

          return (
            <div key={schedule.id} className="rounded-lg border border-border bg-card p-4 space-y-3">
              {/* Header */}
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary shrink-0">
                    <Calendar className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-bold truncate">
                      CAMPANHA {new Date(schedule.scheduled_at).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(schedule.scheduled_at).toLocaleDateString("pt-BR")}, {new Date(schedule.scheduled_at).toLocaleTimeString("pt-BR")}
                      {" · "}{contactCount} contato(s)
                    </p>
                  </div>
                </div>
              </div>

              {/* ---- PENDING: waiting for scheduled time ---- */}
              {isPending && countdown.seconds > 0 && (
                <div className="rounded-lg border border-primary/30 bg-primary/5 p-4 space-y-3">
                  <div className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-amber-400 animate-pulse" />
                    <p className="text-xs font-semibold uppercase tracking-wider text-amber-400">
                      Preparando agendamento
                    </p>
                  </div>
                  <div className="flex items-center justify-between gap-4 flex-wrap">
                    <div>
                      <p className="text-3xl font-mono font-bold tracking-wider">
                        {countdown.text}
                        <span className="text-sm font-normal text-muted-foreground ml-2">para o início</span>
                      </p>
                      <div className="flex items-center gap-3 mt-2 flex-wrap">
                        <Badge variant="outline" className="text-xs gap-1">
                          <Zap className="h-3 w-3" /> Delay: {schedule.min_delay}s–{schedule.max_delay}s
                        </Badge>
                        <Badge variant="outline" className="text-xs gap-1">
                          <Shield className="h-3 w-3" /> Lote: {schedule.batch_size} msgs → pausa {schedule.batch_pause}s
                        </Badge>
                      </div>
                    </div>
                    <Button
                      variant="destructive"
                      onClick={() => handleCancel(schedule.id)}
                      className="shrink-0"
                    >
                      <XCircle className="h-4 w-4 mr-1" /> Cancelar agendamento
                    </Button>
                  </div>
                  <Progress value={Math.max(0, 100 - (countdown.seconds / 3600) * 100)} className="h-1" />
                </div>
              )}

              {/* ---- PENDING but time passed: about to start ---- */}
              {isPending && countdown.seconds <= 0 && (
                <DispatchProgressPanel
                  sent={sent}
                  total={contactCount}
                  percent={progressPercent}
                  statusLabel="Iniciando disparo..."
                  minDelay={schedule.min_delay}
                  maxDelay={schedule.max_delay}
                  batchSize={schedule.batch_size}
                  batchPause={schedule.batch_pause}
                  isPaused={false}
                  onPause={() => handlePause(schedule.id)}
                  onResume={() => {}}
                  onCancel={() => handleCancel(schedule.id)}
                  showPause
                />
              )}

              {/* ---- PROCESSING / PAUSED ---- */}
              {isActive && (
                <DispatchProgressPanel
                  sent={sent}
                  total={contactCount}
                  percent={progressPercent}
                  statusLabel={isPaused ? "Disparo pausado" : "Disparando mensagens"}
                  minDelay={schedule.min_delay}
                  maxDelay={schedule.max_delay}
                  batchSize={schedule.batch_size}
                  batchPause={schedule.batch_pause}
                  isPaused={isPaused}
                  onPause={() => handlePause(schedule.id)}
                  onResume={() => handleResume(schedule.id)}
                  onCancel={() => handleCancel(schedule.id)}
                  showPause
                />
              )}

            </div>
          );
        })}
      </CardContent>
    </Card>
  );
};

/* ---- Sub-component: dispatch progress panel with live delay countdown ---- */
interface ProgressPanelProps {
  sent: number;
  total: number;
  percent: number;
  statusLabel: string;
  minDelay: number;
  maxDelay: number;
  batchSize: number;
  batchPause: number;
  isPaused: boolean;
  onPause: () => void;
  onResume: () => void;
  onCancel: () => void;
  showPause: boolean;
}

const DispatchProgressPanel = ({
  sent, total, percent, statusLabel,
  minDelay, maxDelay, batchSize, batchPause,
  isPaused, onPause, onResume, onCancel,
}: ProgressPanelProps) => {
  const [delayCountdown, setDelayCountdown] = useState(0);
  const lastSentRef = useRef(sent);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // When sent changes, start a new delay countdown
  useEffect(() => {
    if (sent !== lastSentRef.current && sent < total && !isPaused) {
      lastSentRef.current = sent;
      // Estimate avg delay
      const avgDelay = Math.round((minDelay + maxDelay) / 2);
      // Check if batch pause applies
      const isBatchBoundary = sent > 0 && sent % batchSize === 0;
      const totalWait = isBatchBoundary ? avgDelay + batchPause : avgDelay;
      setDelayCountdown(totalWait);
    }
    if (sent >= total) {
      setDelayCountdown(0);
    }
  }, [sent, total, minDelay, maxDelay, batchSize, batchPause, isPaused]);

  // Tick down
  useEffect(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (delayCountdown > 0 && !isPaused) {
      timerRef.current = setInterval(() => {
        setDelayCountdown((prev) => {
          if (prev <= 1) return 0;
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [delayCountdown > 0, isPaused]);

  return (
    <div className="rounded-lg border border-primary/30 bg-primary/5 p-4 space-y-3">
      {/* Status */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className={`h-2 w-2 rounded-full ${isPaused ? "bg-orange-400" : "bg-emerald-400 animate-pulse"}`} />
          <p className={`text-xs font-semibold uppercase tracking-wider ${isPaused ? "text-orange-400" : "text-emerald-400"}`}>
            {statusLabel}
          </p>
        </div>
        {delayCountdown > 0 && !isPaused && (
          <div className="flex items-center gap-1.5 text-sm">
            <Timer className="h-4 w-4 text-muted-foreground" />
            <span className="text-muted-foreground">Próximo em</span>
            <span className="font-bold font-mono text-foreground">{delayCountdown}s</span>
          </div>
        )}
      </div>

      {/* Progress bar */}
      <div className="space-y-1.5">
        <div className="h-2.5 w-full bg-muted rounded-full overflow-hidden">
          <div
            className="h-full bg-primary transition-all duration-500 rounded-full"
            style={{ width: `${percent}%` }}
          />
        </div>
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium">
            {isPaused ? "⏸️ Pausado" : "Enviando"}{" "}
            <span className="font-bold">{sent}</span> de <span className="font-bold">{total}</span>
          </p>
          <p className="text-xs text-muted-foreground">{Math.round(percent)}%</p>
        </div>
      </div>

      {/* Anti-ban info */}
      <div className="flex items-center gap-3 flex-wrap">
        <Badge variant="outline" className="text-xs gap-1">
          <Zap className="h-3 w-3" /> Delay: {minDelay}s–{maxDelay}s entre msgs
        </Badge>
        <Badge variant="outline" className="text-xs gap-1">
          <Shield className="h-3 w-3" /> Lote: {batchSize} msgs → pausa {batchPause}s
        </Badge>
        {delayCountdown > 0 && sent > 0 && sent % batchSize === 0 && (
          <Badge variant="outline" className="text-xs gap-1 border-amber-500/50 text-amber-400">
            <Shield className="h-3 w-3" /> Pausa anti-ban ativa
          </Badge>
        )}
      </div>

      {/* Controls */}
      <div className="flex gap-2">
        {!isPaused ? (
          <Button variant="outline" size="sm" className="flex-1" onClick={onPause}>
            <Pause className="h-4 w-4 mr-1" /> Pausar
          </Button>
        ) : (
          <Button variant="outline" size="sm" className="flex-1" onClick={onResume}>
            <Play className="h-4 w-4 mr-1" /> Retomar
          </Button>
        )}
        <Button variant="destructive" size="sm" className="flex-1" onClick={onCancel}>
          <StopCircle className="h-4 w-4 mr-1" /> Cancelar
        </Button>
      </div>
    </div>
  );
};

export default ActiveSchedules;
