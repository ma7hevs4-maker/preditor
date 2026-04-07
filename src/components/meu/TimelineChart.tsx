import React, { useState, useEffect, useRef, useMemo } from "react";
import { TransformWrapper, TransformComponent } from "react-zoom-pan-pinch";
import { ZoomIn, ZoomOut, Maximize, MoveHorizontal, Crosshair, Clock } from "lucide-react";

interface TimelineEvent {
  id?: string;
  inicio_decimal: number;
  TMD: number;
  TME: number;
  TMDE: number;
  origTMD?: number;
  origTME?: number;
  origTMDE?: number;
  improdutivo: boolean;
  ordem2: boolean;
  isM300Only?: boolean;
  possivelO2?: boolean;
  possivelAnomalia?: boolean;
  isAtribuidaO2?: boolean;
  isDeslocadaO2?: boolean;
  isExecutorO2?: boolean;
  isIdentificadorO2?: boolean;
  tempoPadrao?: number;
  dataAcao?: string;
  lane?: number;
}

interface ShiftData {
  shiftStart?: number;
  shiftEnd?: number;
  platformStart?: number;
  platformEnd?: number;
  platformDuration?: number;
  firstLogin?: number;
  lastLogOff?: number;
  intervalStart?: number;
  intervalEnd?: number;
  returnToBaseDuration?: number;
}

interface TeamTimelineData {
  equipe: string;
  events: TimelineEvent[];
  shifts?: ShiftData[];
  turno?: string;
  shiftStartHour?: number;
  shiftStart?: number;
  shiftEnd?: number;
  platformStart?: number;
  platformEnd?: number;
  platformDuration?: number;
  firstLogin?: number;
  lastLogOff?: number;
  intervalStart?: number;
  intervalEnd?: number;
  returnToBaseDuration?: number;
}

interface TimelineChartProps {
  data: TeamTimelineData[];
  onEventClick?: (id: string, isMulti: boolean) => void;
  highlightedIds?: string[];
  onRemoveTeam?: (equipe: string) => void;
  shiftStartHour?: number;
}

// Theme-aware color tokens for the SVG chart
const COLORS = {
  tmd: "hsl(var(--primary))",
  tme: "hsl(var(--success))",
  tmdM300: "hsl(var(--muted-foreground) / 0.5)",
  tmeM300: "hsl(var(--muted-foreground) / 0.3)",
  error: "hsl(var(--destructive))",
  warning: "hsl(var(--warning))",
  highlight: "hsl(var(--warning))",
  purple: "hsl(270 60% 60%)",
  interval: "hsl(25 95% 53%)",
  platform: "hsl(142 71% 45%)",
  returnBase: "hsl(0 65% 60%)",
  foreground: "hsl(var(--foreground))",
  mutedForeground: "hsl(var(--muted-foreground))",
  border: "hsl(var(--border))",
  gridLine: "hsl(var(--muted-foreground) / 0.15)",
  gridLineHalf: "hsl(var(--muted-foreground) / 0.08)",
  zeroEvent: "hsl(var(--primary) / 0.6)",
  overflow: "hsl(var(--muted-foreground))",
  loginDot: "hsl(var(--success))",
  logoffDot: "hsl(var(--destructive))",
  improdutivoBorder: "hsl(var(--warning))",
};

export function TimelineChart({ data, onEventClick, highlightedIds = [], onRemoveTeam, shiftStartHour = 0 }: TimelineChartProps) {
  const [currentScale, setCurrentScale] = useState(1);
  const [horizontalScale, setHorizontalScale] = useState(1);
  const [containerWidth, setContainerWidth] = useState(1200);
  const [toggledEvents, setToggledEvents] = useState<Set<string>>(new Set());
  const containerRef = useRef<HTMLDivElement>(null);
  const transformRef = useRef<any>(null);

  const formatDecimalTime = (decimal: number) => {
    const totalMinutes = Math.round(decimal * 60);
    const hours = Math.floor(totalMinutes / 60) % 24;
    const minutes = totalMinutes % 60;
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
  };

  useEffect(() => {
    if (!containerRef.current) return;
    const currentContainer = containerRef.current;
    const observer = new ResizeObserver((entries) => {
      for (let entry of entries) {
        if (entry.contentRect.width > 0) {
          setContainerWidth(entry.contentRect.width);
        }
      }
    });
    observer.observe(currentContainer);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (transformRef.current) {
        try {
          transformRef.current.centerView();
        } catch (e) {
          console.warn("Failed to center view on init", e);
        }
      }
    }, 500);
    return () => clearTimeout(timer);
  }, []);

  const baseWidth = Math.max(containerWidth || 1200, 800);
  const width = baseWidth * (horizontalScale || 1);
  const margin = { top: 60, right: 60, bottom: 60, left: 120 };
  const innerWidth = Math.max(0, width - margin.left - margin.right);
  const laneHeight = 40;
  const teamPadding = 30;

  let currentY = 0;
  const processedData = (data || []).map((teamData) => {
    if (!teamData) return null;
    const sortedEvents = [...(teamData.events || [])].sort(
      (a, b) => (a.inicio_decimal || 0) - (b.inicio_decimal || 0)
    );
    const lanes: number[] = [];

    const eventsWithLanes = sortedEvents.map((ev) => {
      const start = ev.inicio_decimal || 0;
      const end = start + (ev.TMD || 0) / 60 + (ev.TME || 0) / 60;
      let laneIdx = lanes.findIndex((laneEnd) => laneEnd <= start);
      if (laneIdx === -1) {
        laneIdx = lanes.length;
        lanes.push(end);
      } else {
        lanes[laneIdx] = end;
      }
      return { ...ev, lane: laneIdx };
    });

    const numLanes = Math.max(1, lanes.length);
    const rowHeight = numLanes * laneHeight + teamPadding + 20;
    const yOffset = currentY;
    currentY += rowHeight;

    return { ...teamData, events: eventsWithLanes, numLanes, yOffset, rowHeight };
  }).filter(Boolean) as any[];

  const innerHeight = Math.max(currentY, 100);
  const height = innerHeight + margin.top + margin.bottom;

  const getXScale = (val: number, teamShiftStartHour: number) => {
    const safeInnerWidth = innerWidth || 1;
    return ((val - (teamShiftStartHour - 1)) / 26) * safeInnerWidth;
  };

  const xScale = (val: number) => getXScale(val, shiftStartHour);

  return (
    <div ref={containerRef} className="relative flex h-[800px] w-full min-w-0 max-w-full flex-col overflow-hidden rounded-lg border border-border bg-card">
      <TransformWrapper
        ref={transformRef}
        key={`${data?.length}-${horizontalScale}-${containerWidth}`}
        initialScale={1}
        minScale={0.1}
        maxScale={20}
        centerOnInit={false}
        limitToBounds={false}
        alignmentAnimation={{ disabled: true }}
        panning={{ velocityDisabled: false }}
        doubleClick={{ disabled: true }}
        wheel={{ step: 0.05 }}
        onTransformed={(ref) => {
          if (ref && ref.state) {
            setCurrentScale(ref.state.scale);
          }
        }}
      >
        {({ zoomIn, zoomOut, resetTransform, setTransform }) => {
          return (
          <>
            {/* Title Bar */}
            <div className="flex items-center justify-between bg-secondary/50 backdrop-blur-sm text-foreground p-3 shrink-0 border-b border-border">
              <div className="flex items-center">
                <Clock className="h-5 w-5 mr-2 text-primary" />
                <h3 className="text-lg font-bold tracking-tight">Linha do Tempo</h3>
              </div>

              <div className="flex items-center space-x-2">
                <div className="flex items-center gap-1 bg-muted/40 p-1 rounded-md border border-border">
                  <button onClick={() => setHorizontalScale(prev => Math.max(0.5, prev - 0.25))} className="p-1 hover:bg-muted/60 rounded text-muted-foreground transition-colors" title="Diminuir Escala Horizontal" disabled={horizontalScale <= 0.5}>
                    <MoveHorizontal className="w-3.5 h-3.5 rotate-90" />
                  </button>
                  <div className="text-[10px] font-bold text-primary min-w-[2.8rem] text-center font-mono">{Math.round(horizontalScale * 100)}%</div>
                  <button onClick={() => setHorizontalScale(prev => Math.min(3, prev + 0.25))} className="p-1 hover:bg-muted/60 rounded text-muted-foreground transition-colors" title="Aumentar Escala Horizontal" disabled={horizontalScale >= 3}>
                    <MoveHorizontal className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={() => { setHorizontalScale(1); resetTransform(); }} className="p-1 hover:bg-muted/60 rounded text-muted-foreground transition-colors ml-1 border-l border-border pl-2" title="Resetar Escala">
                    <Maximize className="w-3.5 h-3.5 rotate-90" />
                  </button>
                </div>
                
                <div className="flex items-center gap-1 bg-muted/40 p-1 rounded-md border border-border">
                  <button onClick={() => zoomIn()} className="p-1 hover:bg-muted/60 rounded text-muted-foreground transition-colors" title="Aumentar Zoom">
                    <ZoomIn className="w-3.5 h-3.5" />
                  </button>
                  <div className="text-[10px] font-bold text-muted-foreground min-w-[2.2rem] text-center font-mono">{Math.round(currentScale * 100)}%</div>
                  <button onClick={() => zoomOut()} className="p-1 hover:bg-muted/60 rounded text-muted-foreground transition-colors" title="Diminuir Zoom">
                    <ZoomOut className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="flex items-center gap-1">
                  <button onClick={() => { const scale = containerWidth / width; setTransform(0, 0, scale); }} className="p-1 hover:bg-primary/20 hover:text-primary rounded text-muted-foreground transition-colors" title="Ajustar à Largura">
                    <Maximize className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={() => transformRef.current?.centerView()} className="p-1 hover:bg-muted/60 rounded text-muted-foreground transition-colors" title="Centralizar">
                    <Crosshair className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>

            {/* Legend */}
            <div className="flex flex-wrap items-center gap-x-5 gap-y-2 px-4 py-3 bg-card/80 backdrop-blur-sm border-b border-border text-[11px] text-muted-foreground shrink-0">
              <div className="flex items-center gap-1.5">
                <div className="w-4 h-3.5 rounded-sm border border-border" style={{ backgroundColor: COLORS.tmd }}></div>
                <span>TMD</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-4 h-3.5 rounded-sm border border-border" style={{ backgroundColor: COLORS.tme }}></div>
                <span>TME</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-4 h-3.5 rounded-sm border border-border" style={{ backgroundColor: COLORS.error }}></div>
                <span>TMDE &gt; 90m</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-4 h-3.5 rounded-sm border-2" style={{ borderColor: COLORS.error, backgroundColor: 'transparent' }}></div>
                <span>TMD &gt; 30m / TME &gt; Padrão</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full border border-border" style={{ backgroundColor: COLORS.loginDot }}></div>
                <span>Login</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full border border-border" style={{ backgroundColor: COLORS.logoffDot }}></div>
                <span>Log Off</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-[9px] font-bold px-1 py-0.5 rounded border-2 border-foreground/60 text-foreground leading-none">IT/FT</span>
                <span>Início/Fim Turno</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-4 h-3.5 rounded-sm border border-border" style={{ backgroundColor: COLORS.tmdM300 }}></div>
                <span>TMD (M300)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-4 h-3.5 rounded-sm border border-border" style={{ backgroundColor: COLORS.tmeM300 }}></div>
                <span>TME (M300)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-4 h-1 rounded-full" style={{ backgroundColor: COLORS.platform }}></div>
                <span>Plataforma</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-4 h-1 rounded-full" style={{ backgroundColor: COLORS.interval }}></div>
                <span>Intervalo</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-4 h-1 rounded-full" style={{ backgroundColor: COLORS.returnBase }}></div>
                <span>Volta Base</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-4 h-3.5 rounded-sm border-2" style={{ borderColor: COLORS.improdutivoBorder, backgroundColor: 'transparent' }}></div>
                <span>Improdutivo</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-4 h-3.5 rounded-sm bg-muted border border-foreground/30 relative">
                  <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-1" style={{ backgroundColor: COLORS.warning }}></div>
                  <div className="absolute inset-x-0 top-0.5 h-0.5" style={{ backgroundColor: COLORS.foreground }}></div>
                </div>
                <span>Atribuída O2</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-4 h-3.5 rounded-sm bg-muted border border-foreground/30 relative">
                  <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-1" style={{ backgroundColor: COLORS.warning }}></div>
                  <div className="absolute inset-x-0 bottom-0.5 h-0.5" style={{ backgroundColor: COLORS.foreground }}></div>
                </div>
                <span>Deslocada O2</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-4 h-3.5 rounded-sm bg-muted border border-foreground/30 relative">
                  <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-1" style={{ backgroundColor: COLORS.purple }}></div>
                </div>
                <span>Possível O2</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-4 h-3.5 rounded-sm border-2" style={{ borderColor: COLORS.purple, backgroundColor: 'transparent' }}></div>
                <span>Possível Anomalia</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-4 h-3.5 rounded-sm border border-border" style={{ backgroundColor: COLORS.highlight }}></div>
                <span>Selecionado</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3.5 h-3.5 rounded-full border border-border" style={{ backgroundColor: COLORS.zeroEvent }}></div>
                <span>TMDE = 0</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="flex items-center">
                  <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: COLORS.overflow }}></div>
                  <div className="w-3 h-3 rounded-sm mx-0.5 border border-border" style={{ backgroundColor: COLORS.tmd }}></div>
                  <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: COLORS.overflow }}></div>
                </div>
                <span>Fora do período</span>
              </div>
            </div>

            <div className="h-full w-full min-w-0 overflow-auto overscroll-contain cursor-grab active:cursor-grabbing">
              <TransformComponent wrapperClass="!h-full !w-full !min-w-0 !max-w-full !overflow-auto" contentClass="!min-w-full !h-max">
                <svg
                  width={width}
                  height={height}
                  viewBox={`0 0 ${width} ${height}`}
                  preserveAspectRatio="none"
                  className="block max-w-none"
                >
                  <g transform={`translate(${margin.left}, ${margin.top})`}>
                    {/* Grid lines */}
                    {Array.from({ length: 53 }).map((_, i) => {
                      const time = (shiftStartHour - 1) + i / 2;
                      const isHalfHour = i % 2 !== 0;
                      return (
                        <line
                          key={i}
                          x1={xScale(time)} y1={0} x2={xScale(time)} y2={innerHeight}
                          stroke={isHalfHour ? COLORS.gridLineHalf : COLORS.gridLine}
                          strokeWidth="1"
                          strokeDasharray={isHalfHour ? "4 4" : undefined}
                          vectorEffect="non-scaling-stroke"
                        />
                      );
                    })}

                    {/* Shift Dividers */}
                    {[shiftStartHour, shiftStartHour + 8, shiftStartHour + 16, shiftStartHour + 24].map((hour) => (
                      <line
                        key={`shift-${hour}`}
                        x1={xScale(hour)} y1={-20} x2={xScale(hour)} y2={innerHeight + 10}
                        stroke={hour === shiftStartHour + 8 || hour === shiftStartHour + 16 ? COLORS.error : COLORS.foreground}
                        strokeWidth="2"
                        strokeDasharray="4 2"
                        vectorEffect="non-scaling-stroke"
                      />
                    ))}

                    {/* Teams */}
                    {processedData.map((teamData) => {
                      const yCenter = teamData.yOffset + teamPadding / 2 + laneHeight / 2 + 15;

                      return (
                        <g key={teamData.equipe}>
                          {/* X-Axis Labels per team */}
                          {Array.from({ length: 27 }).map((_, i) => {
                            const teamShiftStartHour = teamData.shiftStartHour ?? shiftStartHour;
                            const hour = teamShiftStartHour - 1 + i;
                            const displayHour = ((hour % 24) + 24) % 24;
                            return (
                              <text
                                key={`axis-${teamData.equipe}-${i}`}
                                transform={`translate(${getXScale(hour, teamShiftStartHour)}, ${teamData.yOffset + 15}) scale(${1 / currentScale})`}
                                x={0} y={0} textAnchor="middle" fontSize="9" fontWeight="600"
                                fill={COLORS.mutedForeground}
                              >
                                {displayHour}h
                              </text>
                            );
                          })}

                          {/* Team Name */}
                          <text
                            transform={`translate(-10, ${yCenter}) scale(${1 / currentScale})`}
                            x={0} y={0} textAnchor="end" dominantBaseline="middle"
                            fontSize="12" fontWeight="bold"
                            fill={COLORS.foreground}
                          >
                            {teamData.equipe}
                          </text>

                          {/* Center line */}
                          <line
                            x1={0} y1={yCenter} x2={innerWidth} y2={yCenter}
                            stroke={COLORS.border}
                            strokeWidth="1" strokeDasharray="2 2"
                            vectorEffect="non-scaling-stroke"
                          />

                          {/* Events */}
                          {teamData.events.map((ev: any, idx: number) => {
                            const teamShiftStartHour = teamData.shiftStartHour ?? shiftStartHour;
                            const isToggled = ev.id && toggledEvents.has(ev.id);
                            const currentTMD = isToggled && ev.origTMD !== undefined ? ev.origTMD : ev.TMD;
                            const currentTME = isToggled && ev.origTME !== undefined ? ev.origTME : ev.TME;
                            const currentTMDE = isToggled && ev.origTMDE !== undefined ? ev.origTMDE : ev.TMDE;

                            const inicioDecimal = Math.max(teamShiftStartHour - 5, Math.min(ev.inicio_decimal, teamShiftStartHour + 26));
                            const fimTmdDecimal = Math.max(teamShiftStartHour - 5, Math.min(ev.inicio_decimal + currentTMD / 60, teamShiftStartHour + 26));
                            const fimTotalDecimal = Math.max(teamShiftStartHour - 5, Math.min(ev.inicio_decimal + currentTMD / 60 + currentTME / 60, teamShiftStartHour + 26));

                            const xInicio = getXScale(inicioDecimal, teamShiftStartHour);
                            const xFimTmd = getXScale(fimTmdDecimal, teamShiftStartHour);
                            const xFimTotal = getXScale(fimTotalDecimal, teamShiftStartHour);

                            const hasLeftOverflow = ev.inicio_decimal < (teamShiftStartHour - 1);
                            const hasRightOverflow = (ev.inicio_decimal + currentTMD / 60 + currentTME / 60) > (teamShiftStartHour + 25);

                            const rectHeight = 30;
                            const yRect = yCenter - rectHeight / 2 + ev.lane * laneHeight;

                            const isHighlighted = ev.id && highlightedIds.includes(ev.id);
                            const isTmdeHigh = currentTMDE > 90 && !ev.improdutivo;

                            const tmdFill = isHighlighted ? COLORS.highlight : (ev.isM300Only ? COLORS.tmdM300 : (isTmdeHigh ? COLORS.error : COLORS.tmd));
                            const tmeFill = isHighlighted ? COLORS.highlight : (ev.isM300Only ? COLORS.tmeM300 : (isTmdeHigh ? COLORS.error : COLORS.tme));

                            const rectStroke = isHighlighted ? COLORS.foreground : COLORS.border;
                            const rectStrokeWidth = isHighlighted ? "2" : "0.8";

                            const handleEventClick = (e: React.MouseEvent) => {
                              if (!ev.id) return;
                              if (ev.possivelO2 || ev.possivelAnomalia) {
                                setToggledEvents(prev => {
                                  const next = new Set(prev);
                                  if (next.has(ev.id!)) next.delete(ev.id!);
                                  else next.add(ev.id!);
                                  return next;
                                });
                              }
                              onEventClick?.(ev.id, e.ctrlKey || e.metaKey);
                            };

                            return (
                              <g key={idx} className={ev.id ? "cursor-pointer" : ""} onClick={handleEventClick}>
                                <title>
                                  {`Incidente: ${ev.id || 'N/A'}\n`}
                                  {`Data: ${ev.dataAcao || 'N/A'}\n`}
                                  {`Início: ${formatDecimalTime(ev.inicio_decimal)}\n`}
                                  {`TMD: ${Math.round(currentTMD)}m | TME: ${Math.round(currentTME)}m | TMDE: ${Math.round(currentTMDE)}m\n`}
                                  {ev.improdutivo ? "IMPRODUTIVO" : ""}
                                  {ev.isM300Only ? "APENAS M300 (não encontrado na base de incidentes)" : ""}
                                  {ev.possivelO2 ? "POSSÍVEL O2 (M300)" : ""}
                                  {ev.possivelAnomalia ? "POSSÍVEL ANOMALIA (M300)" : ""}
                                  {isToggled ? "\n(Exibindo valores originais da base de incidentes)" : ""}
                                </title>

                                {/* Zero duration */}
                                {xFimTotal === xInicio && (
                                  <circle
                                    cx={xInicio} cy={yRect + rectHeight / 2} r={5}
                                    fill={isHighlighted ? COLORS.highlight : COLORS.zeroEvent}
                                    stroke={isHighlighted ? COLORS.foreground : COLORS.border}
                                    strokeWidth={isHighlighted ? "2" : "0.8"}
                                    vectorEffect="non-scaling-stroke"
                                  />
                                )}

                                {/* TMD */}
                                {xFimTmd > xInicio && (
                                  <rect
                                    x={xInicio} y={yRect} width={xFimTmd - xInicio} height={rectHeight}
                                    fill={tmdFill} stroke={rectStroke} strokeWidth={rectStrokeWidth}
                                    rx="2" ry="2"
                                    vectorEffect="non-scaling-stroke"
                                  />
                                )}

                                {/* TME */}
                                {xFimTotal > xFimTmd && (
                                  <rect
                                    x={xFimTmd} y={yRect} width={xFimTotal - xFimTmd} height={rectHeight}
                                    fill={tmeFill} stroke={rectStroke} strokeWidth={rectStrokeWidth}
                                    rx="2" ry="2"
                                    vectorEffect="non-scaling-stroke"
                                  />
                                )}

                                {/* Left Overflow */}
                                {hasLeftOverflow && (
                                  <circle cx={xInicio - 4} cy={yRect + rectHeight / 2} r={3} fill={COLORS.overflow} vectorEffect="non-scaling-stroke" />
                                )}

                                {/* Right Overflow */}
                                {hasRightOverflow && (
                                  <circle cx={xFimTotal + 4} cy={yRect + rectHeight / 2} r={3} fill={COLORS.overflow} vectorEffect="non-scaling-stroke" />
                                )}

                                {/* Ordem 2 Yellow Stripe */}
                                {ev.ordem2 && xFimTotal > xInicio && (
                                  <g>
                                    <rect x={xInicio} y={yRect + rectHeight / 2 - 2} width={xFimTotal - xInicio} height={4} fill={COLORS.warning} stroke={COLORS.foreground} strokeWidth="0.5" vectorEffect="non-scaling-stroke" />
                                    {ev.isAtribuidaO2 && (
                                      <rect x={xInicio} y={yRect + rectHeight / 2 - 6} width={xFimTotal - xInicio} height={2} fill={COLORS.foreground} vectorEffect="non-scaling-stroke" />
                                    )}
                                    {ev.isDeslocadaO2 && (
                                      <rect x={xInicio} y={yRect + rectHeight / 2 + 4} width={xFimTotal - xInicio} height={2} fill={COLORS.foreground} vectorEffect="non-scaling-stroke" />
                                    )}
                                  </g>
                                )}

                                {/* Possível O2 Purple Stripe */}
                                {ev.possivelO2 && xFimTotal > xInicio && (
                                  <g>
                                    <rect x={xInicio} y={yRect + rectHeight / 2 - 2} width={xFimTotal - xInicio} height={4} fill={COLORS.purple} stroke={COLORS.foreground} strokeWidth="0.5" vectorEffect="non-scaling-stroke" />
                                    {ev.isAtribuidaO2 && (
                                      <rect x={xInicio} y={yRect + rectHeight / 2 - 6} width={xFimTotal - xInicio} height={2} fill={COLORS.foreground} vectorEffect="non-scaling-stroke" />
                                    )}
                                    {ev.isDeslocadaO2 && (
                                      <rect x={xInicio} y={yRect + rectHeight / 2 + 4} width={xFimTotal - xInicio} height={2} fill={COLORS.foreground} vectorEffect="non-scaling-stroke" />
                                    )}
                                  </g>
                                )}

                                {/* Possível Anomalia */}
                                {ev.possivelAnomalia && xFimTotal > xInicio && (
                                  <rect
                                    x={xInicio - 2} y={yRect - 2}
                                    width={xFimTotal - xInicio + 4} height={rectHeight + 4}
                                    fill="none" stroke={COLORS.purple} strokeWidth="2.5"
                                    rx="4" ry="4"
                                    vectorEffect="non-scaling-stroke"
                                  />
                                )}

                                {/* Improdutivo Border */}
                                {ev.improdutivo && xFimTotal > xInicio && (
                                  <rect
                                    x={xInicio} y={yRect - 4}
                                    width={xFimTotal - xInicio} height={rectHeight + 8}
                                    fill="none" stroke={COLORS.improdutivoBorder} strokeWidth="1.5"
                                    rx="4" ry="4"
                                    vectorEffect="non-scaling-stroke"
                                  />
                                )}

                                {/* TMD > 30 Border */}
                                {ev.TMD > 30 && !isTmdeHigh && xFimTmd > xInicio && (
                                  <rect
                                    x={xInicio} y={yRect - 4}
                                    width={xFimTmd - xInicio} height={rectHeight + 8}
                                    fill="none" stroke={COLORS.error} strokeWidth="1.5"
                                    rx="4" ry="4"
                                    vectorEffect="non-scaling-stroke"
                                  />
                                )}

                                {/* TME > tempoPadrao Border */}
                                {ev.TME > (ev.tempoPadrao || 60) && !isTmdeHigh && xFimTotal > xFimTmd && (
                                  <rect
                                    x={xFimTmd} y={yRect - 4}
                                    width={xFimTotal - xFimTmd} height={rectHeight + 8}
                                    fill="none" stroke={COLORS.error} strokeWidth="1.5"
                                    rx="4" ry="4"
                                    vectorEffect="non-scaling-stroke"
                                  />
                                )}

                                {/* Annotations */}
                                {currentTMD > 0 && (xFimTmd - xInicio) * currentScale > 25 && (
                                  <text
                                    transform={`translate(${(xInicio + xFimTmd) / 2}, ${yRect + rectHeight / 2}) scale(${1 / currentScale})`}
                                    x={0} y={0} textAnchor="middle" alignmentBaseline="middle"
                                    fontSize="10" fontWeight="600"
                                    fill={COLORS.foreground}
                                  >
                                    {Math.round(currentTMD)}m
                                  </text>
                                )}

                                {currentTME > 0 && (xFimTotal - xFimTmd) * currentScale > 25 && (
                                  <text
                                    transform={`translate(${(xFimTmd + xFimTotal) / 2}, ${yRect + rectHeight / 2}) scale(${1 / currentScale})`}
                                    x={0} y={0} textAnchor="middle" alignmentBaseline="middle"
                                    fontSize="10" fontWeight="600"
                                    fill={COLORS.foreground}
                                  >
                                    {Math.round(currentTME)}m
                                  </text>
                                )}
                              </g>
                            );
                          })}

                          {/* Shift Lines */}
                          {(() => {
                            const shiftsToRender: ShiftData[] = teamData.shifts || [{
                              shiftStart: teamData.shiftStart, shiftEnd: teamData.shiftEnd,
                              platformStart: teamData.platformStart, platformEnd: teamData.platformEnd,
                              platformDuration: teamData.platformDuration, firstLogin: teamData.firstLogin,
                              lastLogOff: teamData.lastLogOff, intervalStart: teamData.intervalStart,
                              intervalEnd: teamData.intervalEnd, returnToBaseDuration: teamData.returnToBaseDuration
                            }];

                            return shiftsToRender.map((shift, sIdx) => {
                              const teamShiftStartHour = teamData.shiftStartHour ?? shiftStartHour;
                              return (
                                <g key={`shift-lines-${sIdx}`}>
                                  {/* Platform - starts from IT and can end at interval start if interval happens before first dispatch */}
                                  {shift.platformStart !== undefined && shift.platformEnd !== undefined && (
                                    <g>
                                      <line
                                        x1={getXScale(shift.platformStart, teamShiftStartHour)} y1={yCenter}
                                        x2={getXScale(shift.platformEnd, teamShiftStartHour)} y2={yCenter}
                                        stroke={COLORS.platform} strokeWidth="4" vectorEffect="non-scaling-stroke"
                                      />
                                      <line
                                        x1={getXScale(shift.platformStart, teamShiftStartHour)} y1={yCenter - 5}
                                        x2={getXScale(shift.platformStart, teamShiftStartHour)} y2={yCenter + 5}
                                        stroke={COLORS.platform} strokeWidth="3" vectorEffect="non-scaling-stroke"
                                      />
                                      <line
                                        x1={getXScale(shift.platformEnd, teamShiftStartHour)} y1={yCenter - 5}
                                        x2={getXScale(shift.platformEnd, teamShiftStartHour)} y2={yCenter + 5}
                                        stroke={COLORS.platform} strokeWidth="3" vectorEffect="non-scaling-stroke"
                                      />
                                      <title>Tempo de Plataforma: {Math.round((shift.platformEnd - shift.platformStart) * 60)} min</title>
                                    </g>
                                  )}

                                  {/* Interval - centered */}
                                  {shift.intervalStart !== undefined && shift.intervalEnd !== undefined && (
                                    <g>
                                      <line
                                        x1={getXScale(shift.intervalStart, teamShiftStartHour)} y1={yCenter}
                                        x2={getXScale(shift.intervalEnd, teamShiftStartHour)} y2={yCenter}
                                        stroke={COLORS.interval} strokeWidth="4" vectorEffect="non-scaling-stroke"
                                      />
                                      <line
                                        x1={getXScale(shift.intervalStart, teamShiftStartHour)} y1={yCenter - 5}
                                        x2={getXScale(shift.intervalStart, teamShiftStartHour)} y2={yCenter + 5}
                                        stroke={COLORS.interval} strokeWidth="3" vectorEffect="non-scaling-stroke"
                                      />
                                      <line
                                        x1={getXScale(shift.intervalEnd, teamShiftStartHour)} y1={yCenter - 5}
                                        x2={getXScale(shift.intervalEnd, teamShiftStartHour)} y2={yCenter + 5}
                                        stroke={COLORS.interval} strokeWidth="3" vectorEffect="non-scaling-stroke"
                                      />
                                      <title>Intervalo: {formatDecimalTime(shift.intervalStart)} - {formatDecimalTime(shift.intervalEnd)} ({Math.round((shift.intervalEnd - shift.intervalStart) * 60)} min)</title>
                                    </g>
                                  )}

                                  {/* Return to Base - counts backwards from logoff */}
                                  {(() => {
                                    if (shift.returnToBaseDuration !== undefined && shift.lastLogOff !== undefined) {
                                      const returnStart = shift.lastLogOff - shift.returnToBaseDuration;
                                      return (
                                        <g>
                                          <line x1={getXScale(returnStart, teamShiftStartHour)} y1={yCenter} x2={getXScale(shift.lastLogOff, teamShiftStartHour)} y2={yCenter} stroke={COLORS.returnBase} strokeWidth="4" vectorEffect="non-scaling-stroke" />
                                          <line x1={getXScale(returnStart, teamShiftStartHour)} y1={yCenter - 5} x2={getXScale(returnStart, teamShiftStartHour)} y2={yCenter + 5} stroke={COLORS.returnBase} strokeWidth="3" vectorEffect="non-scaling-stroke" />
                                          <line x1={getXScale(shift.lastLogOff, teamShiftStartHour)} y1={yCenter - 5} x2={getXScale(shift.lastLogOff, teamShiftStartHour)} y2={yCenter + 5} stroke={COLORS.returnBase} strokeWidth="3" vectorEffect="non-scaling-stroke" />
                                          <title>Volta a Base: {Math.round(shift.returnToBaseDuration * 60)} min</title>
                                        </g>
                                      );
                                    }
                                    return null;
                                  })()}
                                </g>
                              );
                            });
                          })()}

                          {/* Shift Icons */}
                          {(() => {
                            const shiftsToRender: ShiftData[] = teamData.shifts || [{
                              shiftStart: teamData.shiftStart, shiftEnd: teamData.shiftEnd,
                              platformStart: teamData.platformStart, platformEnd: teamData.platformEnd,
                              platformDuration: teamData.platformDuration, firstLogin: teamData.firstLogin,
                              lastLogOff: teamData.lastLogOff, intervalStart: teamData.intervalStart,
                              intervalEnd: teamData.intervalEnd, returnToBaseDuration: teamData.returnToBaseDuration
                            }];

                            return shiftsToRender.map((shift, sIdx) => {
                              const teamShiftStartHour = teamData.shiftStartHour ?? shiftStartHour;
                              return (
                                <g key={`shift-icons-${sIdx}`}>
                                  {shift.shiftStart !== undefined && (
                                    <text
                                      x={getXScale(shift.shiftStart, teamShiftStartHour)} y={yCenter}
                                      textAnchor="middle" dominantBaseline="middle"
                                      fill={COLORS.foreground}
                                      stroke={COLORS.foreground} strokeWidth="0.3"
                                      fontSize="10" fontWeight="bold"
                                      style={{ paintOrder: 'stroke' }}
                                      vectorEffect="non-scaling-stroke"
                                    >
                                      IT
                                    </text>
                                  )}
                                  {shift.shiftEnd !== undefined && (
                                    <text
                                      x={getXScale(shift.shiftEnd, teamShiftStartHour)} y={yCenter}
                                      textAnchor="middle" dominantBaseline="middle"
                                      fill={COLORS.foreground}
                                      stroke={COLORS.foreground} strokeWidth="0.3"
                                      fontSize="10" fontWeight="bold"
                                      style={{ paintOrder: 'stroke' }}
                                      vectorEffect="non-scaling-stroke"
                                    >
                                      FT
                                    </text>
                                  )}

                                  {/* Login dot */}
                                  {shift.firstLogin !== undefined && (
                                    <circle
                                      cx={getXScale(shift.firstLogin, teamShiftStartHour)} cy={yCenter}
                                      r={4} fill={COLORS.loginDot} stroke={COLORS.foreground} strokeWidth="0.5"
                                      vectorEffect="non-scaling-stroke"
                                    >
                                      <title>Login: {formatDecimalTime(shift.firstLogin)}</title>
                                    </circle>
                                  )}

                                  {/* Log Off dot */}
                                  {(() => {
                                    const shiftEvents = teamData.events.filter((ev: any) => {
                                      if (shift.shiftStart === undefined) return true;
                                      const nextShift = shiftsToRender[sIdx + 1];
                                      if (nextShift && nextShift.shiftStart !== undefined) {
                                        return ev.inicio_decimal >= shift.shiftStart && ev.inicio_decimal < nextShift.shiftStart;
                                      }
                                      return ev.inicio_decimal >= shift.shiftStart;
                                    });

                                    const lastEventEnd = shiftEvents.length > 0
                                      ? Math.max(...shiftEvents.map((ev: any) => ev.inicio_decimal + ev.TMD / 60 + ev.TME / 60))
                                      : undefined;

                                    const logOffPos = shift.lastLogOff ?? (lastEventEnd !== undefined && shift.returnToBaseDuration !== undefined ? lastEventEnd + shift.returnToBaseDuration : undefined);

                                    if (logOffPos !== undefined) {
                                      return (
                                        <circle
                                          cx={getXScale(logOffPos, teamShiftStartHour)} cy={yCenter}
                                          r={4} fill={COLORS.logoffDot} stroke={COLORS.foreground} strokeWidth="0.5"
                                          vectorEffect="non-scaling-stroke"
                                        >
                                          <title>Log Off: {formatDecimalTime(logOffPos)}</title>
                                        </circle>
                                      );
                                    }
                                    return null;
                                  })()}
                                </g>
                              );
                            });
                          })()}

                          {/* Remove Team Button */}
                          {onRemoveTeam && (
                            <g
                              className="cursor-pointer group"
                              onClick={() => onRemoveTeam(teamData.equipe)}
                              transform={`translate(-15, ${yCenter - 7}) scale(${1 / currentScale})`}
                            >
                              <rect width="14" height="14" rx="3" fill={COLORS.error} className="opacity-0 group-hover:opacity-100 transition-opacity" />
                              <path d="M4 4L10 10M10 4L4 10" stroke="white" strokeWidth="2" strokeLinecap="round" className="opacity-0 group-hover:opacity-100 transition-opacity" />
                              <path d="M4 4L10 10M10 4L4 10" stroke={COLORS.error} strokeWidth="1.5" strokeLinecap="round" className="group-hover:opacity-0 transition-opacity" />
                              <title>Remover {teamData.equipe}</title>
                            </g>
                          )}
                        </g>
                      );
                    })}

                    {/* Bottom X Axis */}
                    {Array.from({ length: 27 }).map((_, i) => {
                      const hour = shiftStartHour - 1 + i;
                      const displayHour = ((hour % 24) + 24) % 24;
                      return (
                        <text
                          key={i}
                          transform={`translate(${xScale(hour)}, ${innerHeight + 20}) scale(${1 / currentScale})`}
                          x={0} y={0} textAnchor="middle" fontSize="12" fontWeight="600"
                          fill={COLORS.foreground}
                        >
                          {displayHour}h
                        </text>
                      );
                    })}
                  </g>
                </svg>
              </TransformComponent>
            </div>
          </>
        )}}
      </TransformWrapper>
    </div>
  );
}
