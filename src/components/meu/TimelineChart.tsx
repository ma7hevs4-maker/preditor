import React, { useState, useEffect, useRef } from "react";
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
  possivelO2?: boolean;
  possivelAnomalia?: boolean;
  isAtribuidaO2?: boolean;
  isDeslocadaO2?: boolean;
  isExecutorO2?: boolean;
  isIdentificadorO2?: boolean;
  tempoPadrao?: number;
  dataAcao?: string;
  lane: number;
}

interface ShiftData {
  shiftStart?: number;
  shiftEnd?: number;
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
  // Keep old fields for backward compatibility during migration
  shiftStart?: number;
  shiftEnd?: number;
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

  // Chart dimensions
  const baseWidth = Math.max(containerWidth || 1200, 800); 
  const width = baseWidth * (horizontalScale || 1);
  const margin = { top: 60, right: 60, bottom: 60, left: 120 };
  const innerWidth = Math.max(0, width - margin.left - margin.right);
  const laneHeight = 40;
  const teamPadding = 30;

  // Process data to assign lanes
  let currentY = 0;
  const processedData = (data || []).map((teamData) => {
    if (!teamData) return null;
    // Sort events by start time
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

    return {
      ...teamData,
      events: eventsWithLanes,
      numLanes,
      yOffset,
      rowHeight,
    };
  }).filter(Boolean) as any[];

  const innerHeight = Math.max(currentY, 100);
  const height = innerHeight + margin.top + margin.bottom;

  // Per-team X scale: 26 hours window starting 1h before teamShiftStartHour
  const getXScale = (val: number, teamShiftStartHour: number) => {
    const safeInnerWidth = innerWidth || 1;
    return ((val - (teamShiftStartHour - 1)) / 26) * safeInnerWidth;
  };

  // Default X scale (for grid lines and global axis)
  const xScale = (val: number) => getXScale(val, shiftStartHour);

  return (
    <div ref={containerRef} className="w-full bg-[#efefef] rounded-lg border border-gray-200 relative overflow-hidden flex flex-col h-[800px]">
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
            {/* Title Bar with Controls */}
            <div className="flex items-center justify-between bg-[#141414] text-white p-3 shrink-0">
              <div className="flex items-center">
                <Clock className="h-5 w-5 mr-2 text-blue-400" />
                <h3 className="text-lg font-bold tracking-tight">
                  Linha do Tempo
                </h3>
              </div>

              <div className="flex items-center space-x-2">
                <div className="flex items-center gap-1 bg-white/10 p-1 rounded-md border border-white/10">
                  <button
                    onClick={() => setHorizontalScale(prev => Math.max(0.5, prev - 0.25))}
                    className="p-1 hover:bg-white/20 rounded text-white transition-colors"
                    title="Diminuir Escala Horizontal"
                  >
                    <MoveHorizontal className="w-3.5 h-3.5 rotate-90" />
                  </button>
                  <div className="text-[10px] font-bold text-blue-300 min-w-[2.8rem] text-center">
                    {Math.round(horizontalScale * 100)}%
                  </div>
                  <button
                    onClick={() => setHorizontalScale(prev => Math.min(10, prev + 0.25))}
                    className="p-1 hover:bg-white/20 rounded text-white transition-colors"
                    title="Aumentar Escala Horizontal"
                  >
                    <MoveHorizontal className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => {
                      setHorizontalScale(1);
                      resetTransform();
                    }}
                    className="p-1 hover:bg-white/20 rounded text-white transition-colors ml-1 border-l border-white/10 pl-2"
                    title="Resetar Escala"
                  >
                    <Maximize className="w-3.5 h-3.5 rotate-90" />
                  </button>
                </div>
                
                <div className="flex items-center gap-1 bg-white/10 p-1 rounded-md border border-white/10">
                  <button
                    onClick={() => zoomIn()}
                    className="p-1 hover:bg-white/20 rounded text-white transition-colors"
                    title="Aumentar Zoom"
                  >
                    <ZoomIn className="w-3.5 h-3.5" />
                  </button>
                  <div className="text-[10px] font-bold text-gray-300 min-w-[2.2rem] text-center">
                    {Math.round(currentScale * 100)}%
                  </div>
                  <button
                    onClick={() => zoomOut()}
                    className="p-1 hover:bg-white/20 rounded text-white transition-colors"
                    title="Diminuir Zoom"
                  >
                    <ZoomOut className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => {
                      const scale = containerWidth / width;
                      setTransform(0, 0, scale);
                    }}
                    className="p-1 hover:bg-blue-500/30 hover:text-blue-300 rounded text-white transition-colors"
                    title="Ajustar à Largura"
                  >
                    <Maximize className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => transformRef.current?.centerView()}
                    className="p-1 hover:bg-white/20 rounded text-white transition-colors"
                    title="Centralizar"
                  >
                    <Crosshair className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>

            {/* Legend */}
            <div className="flex flex-wrap items-center gap-x-6 gap-y-2 p-3 bg-white border-b border-gray-200 text-xs text-gray-700 shrink-0">
        <div className="flex items-center gap-1.5">
          <div className="w-4 h-4 bg-[#12A8E0] border border-black"></div>
          <span>TMD</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-4 h-4 bg-[#39B54A] border border-black"></div>
          <span>TME</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-4 h-4 bg-[#ef4444] border border-black"></div>
          <span>TMDE &gt; 90m</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-4 h-4 border-2 border-red-500 bg-gray-100"></div>
          <span>TMD &gt; 30m / TME &gt; Padrão</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full bg-[#39B54A] border border-black"></div>
          <span>Login</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full bg-[#ef4444] border border-black"></div>
          <span>Log Off</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] font-bold text-black bg-white border-2 border-black px-0.5 leading-none">IT/FT</span>
          <span>Início/Fim Turno</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-1 bg-[#12A8E0]"></div>
          <span>Plataforma / Volta Base</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-1 bg-[#8B0000]"></div>
          <span>Intervalo</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-4 h-4 border-2 border-orange-400 bg-gray-100"></div>
          <span>Improdutivo</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-4 h-4 bg-gray-100 border border-black relative">
            <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-1 bg-[#FFD700] border-y border-black"></div>
            <div className="absolute inset-x-0 top-0.5 h-0.5 bg-black"></div>
          </div>
          <span>Atribuída O2</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-4 h-4 bg-gray-100 border border-black relative">
            <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-1 bg-[#FFD700] border-y border-black"></div>
            <div className="absolute inset-x-0 bottom-0.5 h-0.5 bg-black"></div>
          </div>
          <span>Deslocada O2</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-4 h-4 bg-gray-100 border border-black relative">
            <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-1 bg-[#A855F7] border-y border-black"></div>
          </div>
          <span>Possível O2</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-4 h-4 bg-gray-100 border-2 border-[#A855F7]"></div>
          <span>Possível Anomalia</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-4 h-4 bg-[#FFD700] border-2 border-black"></div>
          <span>Selecionado</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-4 h-4 rounded-full bg-[#38bdf8] border border-black"></div>
          <span>TMDE = 0</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="flex items-center">
            <div className="w-1.5 h-1.5 rounded-full bg-gray-500 mr-0.5"></div>
            <div className="w-4 h-4 bg-[#12A8E0] border border-black"></div>
            <div className="w-1.5 h-1.5 rounded-full bg-gray-500 ml-0.5"></div>
          </div>
          <span>Fora do período visível</span>
        </div>
      </div>

            <div className="w-full h-full cursor-grab active:cursor-grabbing overflow-hidden">
              <TransformComponent 
                wrapperClass="!w-full !h-full" 
                contentClass="w-max h-max"
              >
                <svg
                  width={width}
                  height={height}
                  viewBox={`0 0 ${width} ${height}`}
                  preserveAspectRatio="none"
                  className="max-w-none"
                >
                  <g transform={`translate(${margin.left}, ${margin.top})`}>
                    {/* Grid lines */}
                    {Array.from({ length: 53 }).map((_, i) => {
                      const time = (shiftStartHour - 1) + i / 2;
                      const isHalfHour = i % 2 !== 0;
                      return (
                      <line
                        key={i}
                        x1={xScale(time)}
                        y1={0}
                        x2={xScale(time)}
                        y2={innerHeight}
                        stroke={isHalfHour ? "rgba(0,0,0,0.08)" : "rgba(0,0,0,0.15)"}
                        strokeWidth="1"
                        strokeDasharray={isHalfHour ? "4 4" : undefined}
                        vectorEffect="non-scaling-stroke"
                      />
                    )})}

                    {/* Shift Dividers (Start, Mid, End) */}
                    {[shiftStartHour, shiftStartHour + 8, shiftStartHour + 16, shiftStartHour + 24].map((hour) => (
                      <line
                        key={`shift-${hour}`}
                        x1={xScale(hour)}
                        y1={-20}
                        x2={xScale(hour)}
                        y2={innerHeight + 10}
                        stroke={hour === shiftStartHour + 8 || hour === shiftStartHour + 16 ? "#ef4444" : "black"}
                        strokeWidth="2"
                        strokeDasharray="4 2"
                        vectorEffect="non-scaling-stroke"
                      />
                    ))}

                    {/* Render each team's timeline */}
                    {processedData.map((teamData) => {
                      const yCenter = teamData.yOffset + teamPadding / 2 + laneHeight / 2 + 15; // Shifted down for X-axis

                      return (
                        <g key={teamData.equipe}>
                          {/* X-Axis Labels for this team */}
                          {Array.from({ length: 27 }).map((_, i) => {
                            const teamShiftStartHour = teamData.shiftStartHour ?? shiftStartHour;
                            const hour = teamShiftStartHour - 1 + i;
                            const displayHour = ((hour % 24) + 24) % 24;
                            
                            return (
                              <text
                                key={`axis-${teamData.equipe}-${i}`}
                                transform={`translate(${getXScale(hour, teamShiftStartHour)}, ${teamData.yOffset + 15}) scale(${1 / currentScale})`}
                                x={0}
                                y={0}
                                textAnchor="middle"
                                fontSize="9"
                                fill="#6b7280"
                                fontWeight="600"
                              >
                                {displayHour}h
                              </text>
                            );
                          })}

                          {/* Team Name Label */}
                          <text
                            transform={`translate(-10, ${yCenter}) scale(${1 / currentScale})`}
                            x={0}
                            y={0}
                            textAnchor="end"
                            dominantBaseline="middle"
                            fontSize="12"
                            fontWeight="bold"
                            fill="black"
                          >
                            {teamData.equipe}
                          </text>

                          {/* Main horizontal line for the team */}
                          <line
                            x1={0}
                            y1={yCenter}
                            x2={innerWidth}
                            y2={yCenter}
                            stroke="black"
                            strokeWidth="1"
                            strokeDasharray="2 2"
                            vectorEffect="non-scaling-stroke"
                          />
                                                 {/* Events */}
                          {teamData.events.map((ev, idx) => {
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

                            const tmdFill = isHighlighted ? "#FFD700" : (isTmdeHigh ? "#ef4444" : "#12A8E0");
                            const tmeFill = isHighlighted ? "#FFD700" : (isTmdeHigh ? "#ef4444" : "#39B54A");
                            
                            const rectStroke = isHighlighted ? "#000" : "black";
                            const rectStrokeWidth = isHighlighted ? "2" : "1";

                            const handleEventClick = (e: React.MouseEvent) => {
                              if (!ev.id) return;
                              
                              // If it's a possible O2 or Anomaly, toggle the view
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
                              <g 
                                key={idx} 
                                className={ev.id ? "cursor-pointer" : ""}
                                onClick={handleEventClick}
                              >
                                <title>
                                  {`Incidente: ${ev.id || 'N/A'}\n`}
                                  {`Data: ${ev.dataAcao || 'N/A'}\n`}
                                  {`Início: ${formatDecimalTime(ev.inicio_decimal)}\n`}
                                  {`TMD: ${Math.round(currentTMD)}m | TME: ${Math.round(currentTME)}m | TMDE: ${Math.round(currentTMDE)}m\n`}
                                  {ev.improdutivo ? "IMPRODUTIVO" : ""}
                                  {ev.possivelO2 ? "POSSÍVEL O2 (M300)" : ""}
                                  {ev.possivelAnomalia ? "POSSÍVEL ANOMALIA (M300)" : ""}
                                  {isToggled ? "\n(Exibindo valores originais da base de incidentes)" : ""}
                                </title>
                                {/* Fallback for 0 duration events */}
                                {xFimTotal === xInicio && (
                                  <circle
                                    cx={xInicio}
                                    cy={yRect + rectHeight / 2}
                                    r={5}
                                    fill={isHighlighted ? "#FFD700" : "#38bdf8"}
                                    stroke={isHighlighted ? "#000" : "black"}
                                    strokeWidth={isHighlighted ? "2" : "1"}
                                    vectorEffect="non-scaling-stroke"
                                  />
                                )}

                                {/* TMD Rect */}
                                {xFimTmd > xInicio && (
                                  <rect
                                    x={xInicio}
                                    y={yRect}
                                    width={xFimTmd - xInicio}
                                    height={rectHeight}
                                    fill={tmdFill}
                                    stroke={rectStroke}
                                    strokeWidth={rectStrokeWidth}
                                    vectorEffect="non-scaling-stroke"
                                  />
                                )}

                                {/* TME Rect */}
                                {xFimTotal > xFimTmd && (
                                  <rect
                                    x={xFimTmd}
                                    y={yRect}
                                    width={xFimTotal - xFimTmd}
                                    height={rectHeight}
                                    fill={tmeFill}
                                    stroke={rectStroke}
                                    strokeWidth={rectStrokeWidth}
                                    vectorEffect="non-scaling-stroke"
                                  />
                                )}

                                {/* Left Overflow Indicator */}
                                {hasLeftOverflow && (
                                  <circle
                                    cx={xInicio - 4}
                                    cy={yRect + rectHeight / 2}
                                    r={3}
                                    fill="#6b7280"
                                    vectorEffect="non-scaling-stroke"
                                  />
                                )}

                                {/* Right Overflow Indicator */}
                                {hasRightOverflow && (
                                  <circle
                                    cx={xFimTotal + 4}
                                    cy={yRect + rectHeight / 2}
                                    r={3}
                                    fill="#6b7280"
                                    vectorEffect="non-scaling-stroke"
                                  />
                                )}

                                {/* Ordem 2 Yellow Stripe */}
                                {ev.ordem2 && xFimTotal > xInicio && (
                                  <g>
                                    <rect
                                      x={xInicio}
                                      y={yRect + rectHeight / 2 - 2}
                                      width={xFimTotal - xInicio}
                                      height={4}
                                      fill="#FFD700"
                                      stroke="black"
                                      strokeWidth="0.5"
                                      vectorEffect="non-scaling-stroke"
                                    />
                                    {/* Atribuída O2 Line (Above) */}
                                    {ev.isAtribuidaO2 && (
                                      <rect
                                        x={xInicio}
                                        y={yRect + rectHeight / 2 - 6}
                                        width={xFimTotal - xInicio}
                                        height={2}
                                        fill="black"
                                        vectorEffect="non-scaling-stroke"
                                      />
                                    )}
                                    {/* Deslocada O2 Line (Below) */}
                                    {ev.isDeslocadaO2 && (
                                      <rect
                                        x={xInicio}
                                        y={yRect + rectHeight / 2 + 4}
                                        width={xFimTotal - xInicio}
                                        height={2}
                                        fill="black"
                                        vectorEffect="non-scaling-stroke"
                                      />
                                    )}
                                  </g>
                                )}

                                {/* Possível O2 Purple Stripe */}
                                {ev.possivelO2 && xFimTotal > xInicio && (
                                  <g>
                                    <rect
                                      x={xInicio}
                                      y={yRect + rectHeight / 2 - 2}
                                      width={xFimTotal - xInicio}
                                      height={4}
                                      fill="#A855F7"
                                      stroke="black"
                                      strokeWidth="0.5"
                                      vectorEffect="non-scaling-stroke"
                                    />
                                    {/* Atribuída O2 Line (Above) */}
                                    {ev.isAtribuidaO2 && (
                                      <rect
                                        x={xInicio}
                                        y={yRect + rectHeight / 2 - 6}
                                        width={xFimTotal - xInicio}
                                        height={2}
                                        fill="black"
                                        vectorEffect="non-scaling-stroke"
                                      />
                                    )}
                                    {/* Deslocada O2 Line (Below) */}
                                    {ev.isDeslocadaO2 && (
                                      <rect
                                        x={xInicio}
                                        y={yRect + rectHeight / 2 + 4}
                                        width={xFimTotal - xInicio}
                                        height={2}
                                        fill="black"
                                        vectorEffect="non-scaling-stroke"
                                      />
                                    )}
                                  </g>
                                )}

                                {/* Possível Anomalia Purple Border */}
                                {ev.possivelAnomalia && xFimTotal > xInicio && (
                                  <rect
                                    x={xInicio - 2}
                                    y={yRect - 2}
                                    width={xFimTotal - xInicio + 4}
                                    height={rectHeight + 4}
                                    fill="none"
                                    stroke="#A855F7"
                                    strokeWidth="2.5"
                                    vectorEffect="non-scaling-stroke"
                                  />
                                )}

                                {/* Improdutivo Orange Border */}
                                {ev.improdutivo && xFimTotal > xInicio && (
                                  <rect
                                    x={xInicio}
                                    y={yRect - 4}
                                    width={xFimTotal - xInicio}
                                    height={rectHeight + 8}
                                    fill="none"
                                    stroke="orange"
                                    strokeWidth="1.5"
                                    vectorEffect="non-scaling-stroke"
                                  />
                                )}

                                {/* TMD > 30 min Red Border */}
                                {ev.TMD > 30 && !isTmdeHigh && xFimTmd > xInicio && (
                                  <rect
                                    x={xInicio}
                                    y={yRect - 4}
                                    width={xFimTmd - xInicio}
                                    height={rectHeight + 8}
                                    fill="none"
                                    stroke="red"
                                    strokeWidth="1.5"
                                    vectorEffect="non-scaling-stroke"
                                  />
                                )}

                                {/* TME > tempoPadrao Red Border */}
                                {ev.TME > (ev.tempoPadrao || 60) && !isTmdeHigh && xFimTotal > xFimTmd && (
                                  <rect
                                    x={xFimTmd}
                                    y={yRect - 4}
                                    width={xFimTotal - xFimTmd}
                                    height={rectHeight + 8}
                                    fill="none"
                                    stroke="red"
                                    strokeWidth="1.5"
                                    vectorEffect="non-scaling-stroke"
                                  />
                                )}

                                {/* Annotations */}
                                {currentTMD > 0 && (xFimTmd - xInicio) * currentScale > 25 && (
                                  <text
                                    transform={`translate(${(xInicio + xFimTmd) / 2}, ${yRect + rectHeight / 2}) scale(${1 / currentScale})`}
                                    x={0}
                                    y={0}
                                    textAnchor="middle"
                                    alignmentBaseline="middle"
                                    fontSize="10"
                                    fill="black"
                                  >
                                    {Math.round(currentTMD)}m
                                  </text>
                                )}

                                {currentTME > 0 && (xFimTotal - xFimTmd) * currentScale > 25 && (
                                  <text
                                    transform={`translate(${(xFimTmd + xFimTotal) / 2}, ${yRect + rectHeight / 2}) scale(${1 / currentScale})`}
                                    x={0}
                                    y={0}
                                    textAnchor="middle"
                                    alignmentBaseline="middle"
                                    fontSize="10"
                                    fill="black"
                                  >
                                    {Math.round(currentTME)}m
                                  </text>
                                )}
                              </g>
                            );
                          })}

                          {/* Shift Lines (In Front of Events) */}
                          {(() => {
                            const shiftsToRender: ShiftData[] = teamData.shifts || [{
                              shiftStart: teamData.shiftStart,
                              shiftEnd: teamData.shiftEnd,
                              platformDuration: teamData.platformDuration,
                              firstLogin: teamData.firstLogin,
                              lastLogOff: teamData.lastLogOff,
                              intervalStart: teamData.intervalStart,
                              intervalEnd: teamData.intervalEnd,
                              returnToBaseDuration: teamData.returnToBaseDuration
                            }];

                            return shiftsToRender.map((shift, sIdx) => {
                              const teamShiftStartHour = teamData.shiftStartHour ?? shiftStartHour;
                              return (
                                <g key={`shift-lines-${sIdx}`}>
                                  {/* Platform Time (Blue Line) */}
                                  {shift.platformDuration !== undefined && (shift.firstLogin !== undefined || shift.shiftStart !== undefined) && (
                                    <g>
                                      <line
                                        x1={getXScale(shift.firstLogin ?? shift.shiftStart!, teamShiftStartHour)}
                                        y1={yCenter - 15}
                                        x2={getXScale((shift.firstLogin ?? shift.shiftStart!) + shift.platformDuration, teamShiftStartHour)}
                                        y2={yCenter - 15}
                                        stroke="#12A8E0"
                                        strokeWidth="3"
                                        vectorEffect="non-scaling-stroke"
                                      />
                                      <line
                                        x1={getXScale(shift.firstLogin ?? shift.shiftStart!, teamShiftStartHour)}
                                        y1={yCenter - 20}
                                        x2={getXScale(shift.firstLogin ?? shift.shiftStart!, teamShiftStartHour)}
                                        y2={yCenter - 10}
                                        stroke="#12A8E0"
                                        strokeWidth="3"
                                        vectorEffect="non-scaling-stroke"
                                      />
                                      <line
                                        x1={getXScale((shift.firstLogin ?? shift.shiftStart!) + shift.platformDuration, teamShiftStartHour)}
                                        y1={yCenter - 20}
                                        x2={getXScale((shift.firstLogin ?? shift.shiftStart!) + shift.platformDuration, teamShiftStartHour)}
                                        y2={yCenter - 10}
                                        stroke="#12A8E0"
                                        strokeWidth="3"
                                        vectorEffect="non-scaling-stroke"
                                      />
                                      <title>Tempo de Plataforma: {Math.round(shift.platformDuration * 60)} min</title>
                                    </g>
                                  )}

                                  {/* Interval (Red Line) */}
                                  {shift.intervalStart !== undefined && shift.intervalEnd !== undefined && (
                                    <g>
                                      <line
                                        x1={getXScale(shift.intervalStart, teamShiftStartHour)}
                                        y1={yCenter + 15}
                                        x2={getXScale(shift.intervalEnd, teamShiftStartHour)}
                                        y2={yCenter + 15}
                                        stroke="#8B0000"
                                        strokeWidth="3"
                                        vectorEffect="non-scaling-stroke"
                                      />
                                      <line
                                        x1={getXScale(shift.intervalStart, teamShiftStartHour)}
                                        y1={yCenter + 10}
                                        x2={getXScale(shift.intervalStart, teamShiftStartHour)}
                                        y2={yCenter + 20}
                                        stroke="#8B0000"
                                        strokeWidth="3"
                                        vectorEffect="non-scaling-stroke"
                                      />
                                      <line
                                        x1={getXScale(shift.intervalEnd, teamShiftStartHour)}
                                        y1={yCenter + 10}
                                        x2={getXScale(shift.intervalEnd, teamShiftStartHour)}
                                        y2={yCenter + 20}
                                        stroke="#8B0000"
                                        strokeWidth="3"
                                        vectorEffect="non-scaling-stroke"
                                      />
                                      <title>Intervalo: {formatDecimalTime(shift.intervalStart)} - {formatDecimalTime(shift.intervalEnd)} ({Math.round((shift.intervalEnd - shift.intervalStart) * 60)} min)</title>
                                    </g>
                                  )}

                                  {/* Volta a Base (Blue Line) */}
                                  {(() => {
                                    const shiftEvents = teamData.events.filter(ev => {
                                      if (shift.shiftStart === undefined) return true;
                                      const nextShift = shiftsToRender[sIdx + 1];
                                      if (nextShift && nextShift.shiftStart !== undefined) {
                                        return ev.inicio_decimal >= shift.shiftStart && ev.inicio_decimal < nextShift.shiftStart;
                                      }
                                      return ev.inicio_decimal >= shift.shiftStart;
                                    });

                                    const lastEventEnd = shiftEvents.length > 0 
                                      ? Math.max(...shiftEvents.map(ev => ev.inicio_decimal + ev.TMD/60 + ev.TME/60))
                                      : undefined;
                                    
                                    if (lastEventEnd !== undefined && shift.returnToBaseDuration !== undefined) {
                                      const returnToBaseEnd = lastEventEnd + shift.returnToBaseDuration;
                                      return (
                                        <g>
                                          <line
                                            x1={getXScale(lastEventEnd, teamShiftStartHour)}
                                            y1={yCenter - 15}
                                            x2={getXScale(returnToBaseEnd, teamShiftStartHour)}
                                            y2={yCenter - 15}
                                            stroke="#12A8E0"
                                            strokeWidth="3"
                                            vectorEffect="non-scaling-stroke"
                                          />
                                          <line
                                            x1={getXScale(lastEventEnd, teamShiftStartHour)}
                                            y1={yCenter - 20}
                                            x2={getXScale(lastEventEnd, teamShiftStartHour)}
                                            y2={yCenter - 10}
                                            stroke="#12A8E0"
                                            strokeWidth="3"
                                            vectorEffect="non-scaling-stroke"
                                          />
                                          <line
                                            x1={getXScale(returnToBaseEnd, teamShiftStartHour)}
                                            y1={yCenter - 20}
                                            x2={getXScale(returnToBaseEnd, teamShiftStartHour)}
                                            y2={yCenter - 10}
                                            stroke="#12A8E0"
                                            strokeWidth="3"
                                            vectorEffect="non-scaling-stroke"
                                          />
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

                          {/* Shift Icons (In Front of Events) */}
                          {(() => {
                            const shiftsToRender: ShiftData[] = teamData.shifts || [{
                              shiftStart: teamData.shiftStart,
                              shiftEnd: teamData.shiftEnd,
                              platformDuration: teamData.platformDuration,
                              firstLogin: teamData.firstLogin,
                              lastLogOff: teamData.lastLogOff,
                              intervalStart: teamData.intervalStart,
                              intervalEnd: teamData.intervalEnd,
                              returnToBaseDuration: teamData.returnToBaseDuration
                            }];

                            return shiftsToRender.map((shift, sIdx) => {
                              const teamShiftStartHour = teamData.shiftStartHour ?? shiftStartHour;
                              return (
                                <g key={`shift-icons-${sIdx}`}>
                                  {/* Shift Start/End (IT/FT Text) */}
                                  {shift.shiftStart !== undefined && (
                                    <text
                                      x={getXScale(shift.shiftStart, teamShiftStartHour)}
                                      y={yCenter}
                                      textAnchor="middle"
                                      dominantBaseline="middle"
                                      fill="white"
                                      stroke="black"
                                      strokeWidth="2"
                                      fontSize="10"
                                      fontWeight="bold"
                                      style={{ paintOrder: 'stroke' }}
                                      vectorEffect="non-scaling-stroke"
                                    >
                                      IT
                                    </text>
                                  )}
                                  {shift.shiftEnd !== undefined && (
                                    <text
                                      x={getXScale(shift.shiftEnd, teamShiftStartHour)}
                                      y={yCenter}
                                      textAnchor="middle"
                                      dominantBaseline="middle"
                                      fill="white"
                                      stroke="black"
                                      strokeWidth="2"
                                      fontSize="10"
                                      fontWeight="bold"
                                      style={{ paintOrder: 'stroke' }}
                                      vectorEffect="non-scaling-stroke"
                                    >
                                      FT
                                    </text>
                                  )}

                                  {/* Login (Green Dot) */}
                                  {shift.firstLogin !== undefined && (
                                    <circle
                                      cx={getXScale(shift.firstLogin, teamShiftStartHour)}
                                      cy={yCenter}
                                      r={4}
                                      fill="#39B54A"
                                      stroke="black"
                                      strokeWidth="1"
                                      vectorEffect="non-scaling-stroke"
                                    >
                                      <title>Login: {formatDecimalTime(shift.firstLogin)}</title>
                                    </circle>
                                  )}

                                  {/* Log Off (Red Dot) */}
                                  {(() => {
                                    const shiftEvents = teamData.events.filter(ev => {
                                      if (shift.shiftStart === undefined) return true;
                                      const nextShift = shiftsToRender[sIdx + 1];
                                      if (nextShift && nextShift.shiftStart !== undefined) {
                                        return ev.inicio_decimal >= shift.shiftStart && ev.inicio_decimal < nextShift.shiftStart;
                                      }
                                      return ev.inicio_decimal >= shift.shiftStart;
                                    });

                                    const lastEventEnd = shiftEvents.length > 0 
                                      ? Math.max(...shiftEvents.map(ev => ev.inicio_decimal + ev.TMD/60 + ev.TME/60))
                                      : undefined;
                                    
                                    const logOffPos = shift.lastLogOff ?? (lastEventEnd !== undefined && shift.returnToBaseDuration !== undefined ? lastEventEnd + shift.returnToBaseDuration : undefined);
                                    
                                    if (logOffPos !== undefined) {
                                      return (
                                        <circle
                                          cx={getXScale(logOffPos, teamShiftStartHour)}
                                          cy={yCenter}
                                          r={4}
                                          fill="#ef4444"
                                          stroke="black"
                                          strokeWidth="1"
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
                              <rect 
                                width="14" 
                                height="14" 
                                rx="3" 
                                fill="#ef4444" 
                                className="opacity-0 group-hover:opacity-100 transition-opacity"
                              />
                              <path 
                                d="M4 4L10 10M10 4L4 10" 
                                stroke="white" 
                                strokeWidth="2" 
                                strokeLinecap="round"
                                className="opacity-0 group-hover:opacity-100 transition-opacity"
                              />
                              <path 
                                d="M4 4L10 10M10 4L4 10" 
                                stroke="#ef4444" 
                                strokeWidth="1.5" 
                                strokeLinecap="round"
                                className="group-hover:opacity-0 transition-opacity"
                              />
                              <title>Remover {teamData.equipe}</title>
                            </g>
                          )}
                        </g>
                      );
                    })}

                    {/* X Axis Labels */}
                    {Array.from({ length: 27 }).map((_, i) => {
                      const hour = shiftStartHour - 1 + i;
                      const displayHour = ((hour % 24) + 24) % 24;
                      
                      return (
                      <text
                        key={i}
                        transform={`translate(${xScale(hour)}, ${innerHeight + 20}) scale(${1 / currentScale})`}
                        x={0}
                        y={0}
                        textAnchor="middle"
                        fontSize="12"
                        fill="black"
                      >
                        {displayHour}h
                      </text>
                    )})}
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
