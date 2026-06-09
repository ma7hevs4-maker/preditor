import React, { useState, useMemo } from "react";
import { X, Calendar, Star, AlertTriangle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { TimelineChart } from "./TimelineChart";
import { getShiftStartHour, isReincidenteCausadoRow } from "@/utils/meuDataProcessing";

interface TeamDetailModalProps {
  team: any; // The ranking row data
  allData: any[]; // All filtered data
  isPeriodMode: boolean;
  convertToDecimalHours: (val: any, baseDateStr?: string) => number | undefined;
  getValMinutes: (val: any) => number | null;
  calcTempoPlataforma: (eqData: any[]) => number | null;
  calcRetornoBase: (eqData: any[]) => number | null;
  calculateOccupancy: (eqData: any[]) => number;
  calculateIdleMinutes: (eqData: any[]) => number;
  normalizeIncidentNumber: (value: any) => string;
  data: any[]; // Full data (for M300)
  onClose: () => void;
}

export function TeamDetailModal({
  team,
  allData,
  isPeriodMode,
  convertToDecimalHours,
  getValMinutes,
  calcTempoPlataforma,
  calcRetornoBase,
  calculateOccupancy,
  calculateIdleMinutes,
  normalizeIncidentNumber,
  data,
  onClose,
}: TeamDetailModalProps) {
  const equipe = team.Equipe;

  const eqData = useMemo(
    () => allData.filter((d) => d["Equipe Desl."] === equipe),
    [allData, equipe]
  );

  const availableDays = useMemo(() => {
    const days = new Set<string>();
    eqData.forEach((d) => {
      const dt = d["Data Turno"] || d["Data Ação"];
      if (dt) days.add(dt);
    });
    return Array.from(days).sort();
  }, [eqData]);

  const [selectedDay, setSelectedDay] = useState(() => {
    return availableDays[availableDays.length - 1] || "";
  });

  const effectiveDate = isPeriodMode ? selectedDay : availableDays[0] || "";

  const dayData = useMemo(() => {
    if (!isPeriodMode) return eqData;
    return eqData.filter((d) => {
      const dt = d["Data Turno"] || d["Data Ação"];
      return dt === selectedDay;
    });
  }, [eqData, isPeriodMode, selectedDay]);

  // Build timeline data for this team
  const timelineData = useMemo(() => {
    const incidentesPlotados = dayData.filter((d) => d["Equipe Desl."] === equipe);
    const incidentesBaseKeys = new Set(
      incidentesPlotados.map((d) => normalizeIncidentNumber(d["Número"]))
    );
    const incidentesM300Only = data.filter((d) => {
      if (!d.isM300Only) return false;
      if (d["Equipe Desl."] !== equipe) return false;
      const dataM300 = d["Data Referência"] || d["Data M300"] || d["Data Turno"] || d["Data Ação"];
      if (dataM300 !== effectiveDate) return false;
      const numeroNormalizado = normalizeIncidentNumber(d["Número"] || d["Incidente_M300"]);
      return !!numeroNormalizado && !incidentesBaseKeys.has(numeroNormalizado);
    });

    const equipeData = [...incidentesPlotados, ...incidentesM300Only].sort(
      (a, b) => (a.hora_aux_ordenacao || 0) - (b.hora_aux_ordenacao || 0)
    );

    if (equipeData.length === 0) return [{ equipe, events: [], turno: "B", shiftStartHour: 0, shiftStart: undefined, shiftEnd: undefined, platformStart: undefined, platformEnd: undefined, platformDuration: undefined, firstLogin: undefined, intervalStart: undefined, intervalEnd: undefined, returnToBaseDuration: undefined, lastLogOff: undefined }];

    const firstRow = equipeData[0] || {};
    const teamTurno = firstRow.Turno || "B";

    const events = equipeData
      .filter((d) => d.hora_aux_ordenacao != null)
      .map((d) => {
        let inicio_decimal = Number(d.hora_aux_ordenacao) || 0;
        if (effectiveDate && d["Data Ação"]) {
          try {
            const [ySel, mSel, daySel] = effectiveDate.split("-").map(Number);
            const [yAcao, mAcao, dayAcao] = d["Data Ação"].split("-").map(Number);
            const dSel = new Date(Date.UTC(ySel, mSel - 1, daySel));
            const dAcao = new Date(Date.UTC(yAcao, mAcao - 1, dayAcao));
            if (!isNaN(dSel.getTime()) && !isNaN(dAcao.getTime())) {
              const diffDays = Math.round((dAcao.getTime() - dSel.getTime()) / (1000 * 60 * 60 * 24));
              inicio_decimal += diffDays * 24;
            }
          } catch (e) {}
        }
        return {
          id: d.Número,
          inicio_decimal,
          TMD: Number(d.TMD) || 0,
          TME: Number(d.TME) || 0,
          TMDE: Number(d.TMDE) || 0,
          origTMD: d.origTMD,
          origTME: d.origTME,
          origTMDE: d.origTMDE,
          improdutivo: !!d.Improdutivo,
          ordem2: !!d.ordem2,
          reincidenteCausado: isReincidenteCausadoRow(d),
          isM300Only: !!d.isM300Only,
          possivelO2: !!d.possivelO2,
          possivelAnomalia: !!d.possivelAnomalia,
          isAtribuidaO2: false,
          isDeslocadaO2: false,
          isExecutorO2: !!d.isExecutorO2,
          isIdentificadorO2: !!d.isIdentificadorO2,
          tempoPadrao: Number(d.tempo_padrao) || 60,
          dataAcao: d["Data Ação"],
          horaAcao: d["Hora da ação equipe"],
        };
      });

    const shiftStartDecimal = convertToDecimalHours(firstRow["Inicio Calendario"], effectiveDate);
    const shiftEndDecimal = convertToDecimalHours(firstRow["Fim Calendario"], effectiveDate);
    const intervalStartDecimal = convertToDecimalHours(firstRow["Inicio Intervalo"] || firstRow["Inicio intervalo"], effectiveDate);
    const intervalEndDecimal = convertToDecimalHours(firstRow["Fim Intervalo"] || firstRow["Fim intervalo"], effectiveDate);

    const firstLoginRaw = equipeData.map((d) => d["Log In"] || d["1º Login"]).find((v) => v != null && v !== "");
    const firstLoginDecimal = convertToDecimalHours(firstLoginRaw, effectiveDate);
    let platformDuration: number | undefined;
    let platformStart = shiftStartDecimal ?? firstLoginDecimal ?? undefined;
    let platformEnd: number | undefined;

    if (platformStart != null && events.length > 0) {
      const sortedEvents = [...events].sort((a, b) => a.inicio_decimal - b.inicio_decimal);
      const firstEventStart = sortedEvents[0].inicio_decimal;
      if (
        firstLoginDecimal != null &&
        shiftStartDecimal != null &&
        firstLoginDecimal < shiftStartDecimal &&
        firstEventStart < shiftStartDecimal
      ) {
        platformStart = firstLoginDecimal;
      }
      if (intervalStartDecimal != null && intervalStartDecimal > platformStart && intervalStartDecimal <= firstEventStart) {
        platformEnd = intervalStartDecimal;
      } else if (firstEventStart > platformStart) {
        platformEnd = firstEventStart;
      }
      if (platformEnd != null) {
        platformDuration = platformEnd - platformStart;
        if (platformDuration <= 0) platformDuration = undefined;
      }
    }

    const lastLogOffRaw = equipeData.map((d) => d["Log Off Corrigido"] || d["Log Off"]).find((v) => v != null && v !== "");
    const lastLogOffDecimal = convertToDecimalHours(lastLogOffRaw, effectiveDate);

    let returnToBaseDuration: number | undefined;
    if (lastLogOffDecimal != null && events.length > 0) {
      const lastEvent = [...events].sort((a, b) => {
        const endA = a.inicio_decimal + a.TMD / 60 + a.TME / 60;
        const endB = b.inicio_decimal + b.TMD / 60 + b.TME / 60;
        return endB - endA;
      })[0];
      const lastEnd = lastEvent.inicio_decimal + lastEvent.TMD / 60 + lastEvent.TME / 60;
      let returnStart = lastEnd;
      if (intervalStartDecimal != null && intervalStartDecimal >= lastEnd) {
        returnStart = intervalStartDecimal;
      }
      const diff = lastLogOffDecimal - returnStart;
      if (diff > 0) returnToBaseDuration = diff;
    }

    return [
      {
        equipe,
        events,
        turno: teamTurno,
        shiftStartHour: getShiftStartHour(teamTurno),
        shiftStart: shiftStartDecimal,
        shiftEnd: shiftEndDecimal,
        platformStart,
        platformEnd,
        platformDuration,
        firstLogin: firstLoginDecimal,
        intervalStart: intervalStartDecimal,
        intervalEnd: intervalEndDecimal,
        returnToBaseDuration,
        lastLogOff: lastLogOffDecimal ?? convertToDecimalHours(firstRow["Log Off Corrigido"] || firstRow["Log Off"], effectiveDate),
      },
    ];
  }, [dayData, equipe, effectiveDate, data, convertToDecimalHours, normalizeIncidentNumber]);

  const shiftStartHour = useMemo(() => {
    if (timelineData.length > 0 && timelineData[0].turno) {
      const t = timelineData[0].turno;
      if (t === "A") return 16;
      if (t === "B") return 0;
      if (t === "C") return 12;
    }
    return 0;
  }, [timelineData]);

  // Metrics display
  const metrics = [
    { label: "Incidentes", value: team.Incidentes, good: true },
    { label: "Improdutivos", value: team.Improdutivos },
    { label: "Reincidentes", value: team["Reincidentes causados"] },
    { label: "TMDE", value: team.TMDE?.toFixed(1) },
    { label: "Ordem 2", value: team["Ordem 2"] },
    { label: "Ocupação", value: `${team.Ocupação?.toFixed(1)}%`, good: true },
    { label: "Ociosidade (min)", value: team["Ociosidade (min)"]?.toFixed(0) },
    { label: "Inc. Ociosid.", value: team["Inc. Ociosid."] },
    { label: "Login", value: team.Login },
    { label: "Despacho", value: team.Despacho },
    { label: "T. Plataforma", value: team["Tempo de plataforma"] },
    { label: "Retorno Base", value: team["Retorno Base"] },
  ];

  return (
    <div
      className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-card rounded-xl border border-border shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 border-b bg-secondary/30 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <h3 className="font-bold text-foreground text-lg">{equipe}</h3>
            {team.pontuacao != null && (
              <Badge variant="secondary" className="gap-1">
                <Star className="h-3 w-3" />
                {team.pontuacao} pts
              </Badge>
            )}
            {team.hasIncompleteData && (
              <Badge variant="outline" className="gap-1 text-warning border-warning/30">
                <AlertTriangle className="h-3 w-3" />
                Dados parciais
              </Badge>
            )}
          </div>
          <button onClick={onClose} className="p-1 hover:bg-muted rounded-full transition-colors">
            <X className="h-6 w-6 text-muted-foreground" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          {/* Metrics Grid */}
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
            {metrics.map((m) => (
              <div key={m.label} className="bg-secondary/30 rounded-lg p-3 text-center">
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">{m.label}</div>
                <div className="text-lg font-bold text-foreground">{m.value ?? "-"}</div>
              </div>
            ))}
          </div>

          {/* Timeline */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-sm font-semibold text-foreground">Linha do Tempo</h4>
              {isPeriodMode && availableDays.length > 1 && (
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <select
                    value={selectedDay}
                    onChange={(e) => setSelectedDay(e.target.value)}
                    className="rounded-md bg-background text-foreground border border-border text-xs p-1.5 focus:border-ring focus:ring-1 focus:ring-ring outline-none"
                  >
                    {availableDays.map((d) => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
            <TimelineChart
              data={timelineData}
              onEventClick={() => {}}
              highlightedIds={[]}
              onRemoveTeam={() => {}}
              shiftStartHour={shiftStartHour}
            />
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t bg-secondary/30 flex justify-end shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors font-medium shadow-sm"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
}
