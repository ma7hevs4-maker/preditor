import React, { useMemo, useState } from "react";
import { X, SlidersHorizontal, Calendar, Search, Table2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";

const FilterMultiSelect = ({ label, options, selected, onChange, searchable }: any) => {
  const [search, setSearch] = useState("");
  const filteredOptions = searchable 
    ? options.filter((opt: string) => opt.toLowerCase().includes(search.toLowerCase()))
    : options;

  return (
    <div className="space-y-2">
      <div className="flex justify-between items-center">
        <label className="text-xs font-semibold text-foreground uppercase tracking-wider">
          {label}
          {selected.length > 0 && (
            <span className="ml-1.5 text-primary font-mono">({selected.length})</span>
          )}
        </label>
        <div className="flex gap-2">
          <button onClick={() => onChange(filteredOptions)} className="text-[10px] text-primary hover:underline">Todos</button>
          <button onClick={() => onChange([])} className="text-[10px] text-muted-foreground hover:underline">Limpar</button>
        </div>
      </div>
      {searchable && (
        <div className="relative">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
          <input
            type="text"
            placeholder="Pesquisar..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-md bg-background text-foreground border border-border text-xs p-1.5 pl-7 focus:border-ring focus:ring-1 focus:ring-ring outline-none"
          />
        </div>
      )}
      <div className="flex flex-wrap gap-1 max-h-28 overflow-y-auto">
        {filteredOptions.map((opt: string) => {
          const isSelected = selected.includes(opt);
          return (
            <button
              key={opt}
              onClick={() => {
                if (isSelected) onChange(selected.filter((s: string) => s !== opt));
                else onChange([...selected, opt]);
              }}
              className={`px-2 py-0.5 rounded-full text-[10px] font-medium border transition-all ${
                isSelected
                  ? 'bg-primary/15 border-primary/40 text-primary'
                  : 'bg-secondary/30 border-border text-muted-foreground hover:bg-secondary/50'
              }`}
            >
              {opt}
            </button>
          );
        })}
      </div>
    </div>
  );
};

interface M300SummaryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  filteredData: any[];
  getValMinutes: (val: any) => number | null;
  filterState: any;
}

// For columns that already contain duration in minutes (numeric), parse directly
function parseDurationMinutes(raw: any): number | null {
  if (raw == null || raw === "" || raw === "-") return null;
  if (typeof raw === "number") return isFinite(raw) ? raw : null;
  const s = String(raw).trim().replace(",", ".");
  const n = Number(s);
  return isFinite(n) ? n : null;
}

function getRawM300ValueForGroup(rows: any[], columnName: string): number | null {
  // Deduplicate by equipe+data to get one value per team/day
  const seen = new Map<string, number>();
  for (const d of rows) {
    const eq = d["Equipe Desl."] || "";
    const dt = d["Data Turno"] || d["Data Ação"] || "";
    const key = `${eq}|${dt}`;
    if (seen.has(key)) continue;
    const val = parseDurationMinutes(d[columnName]);
    if (val != null && val > 0) {
      seen.set(key, val);
    }
  }
  if (seen.size === 0) return null;
  const values = Array.from(seen.values());
  return values.reduce((a, b) => a + b, 0) / values.length;
}

function calcIntervalMinutes(rows: any[], getValMinutes: (val: any) => number | null): number | null {
  const seen = new Map<string, number>();
  for (const d of rows) {
    const eq = d["Equipe Desl."] || "";
    const dt = d["Data Turno"] || d["Data Ação"] || "";
    const key = `${eq}|${dt}`;
    if (seen.has(key)) continue;
    
    const iniRaw = d["Inicio intervalo"] || d["Inicio Intervalo"];
    const fimRaw = d["Fim intervalo"] || d["Fim Intervalo"];
    const iniVal = getValMinutes(iniRaw);
    const fimVal = getValMinutes(fimRaw);
    
    if (iniVal != null && fimVal != null && fimVal > iniVal) {
      seen.set(key, fimVal - iniVal);
    }
  }
  if (seen.size === 0) return null;
  const values = Array.from(seen.values());
  return values.reduce((a, b) => a + b, 0) / values.length;
}

const formatMinutes = (val: number | null): string => {
  if (val == null) return "-";
  return val.toFixed(0);
};

export function M300SummaryDialog({ open, onOpenChange, filteredData, getValMinutes, filterState }: M300SummaryDialogProps) {
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  const tableData = useMemo(() => {
    // Group by polo
    const poloMap = new Map<string, any[]>();
    filteredData.forEach(d => {
      const polo = String(d.Polo || "Não informado").trim();
      if (!poloMap.has(polo)) poloMap.set(polo, []);
      poloMap.get(polo)!.push(d);
    });

    const polos = Array.from(poloMap.keys()).sort();
    const rows: Array<{
      polo: string;
      tipo: string; // Insourcing, Outsourcing, Total
      login: number | null;
      despacho: number | null;
      plataforma: number | null;
      intervalo: number | null;
      retorno: number | null;
    }> = [];

    for (const polo of polos) {
      const poloRows = poloMap.get(polo)!;
      
      // Group by Enel / Parceira DESLOC
      const tipoMap = new Map<string, any[]>();
      poloRows.forEach(d => {
        const tipo = String(d["Enel / Parceira DESLOC"] || "Não informado").trim();
        if (!tipoMap.has(tipo)) tipoMap.set(tipo, []);
        tipoMap.get(tipo)!.push(d);
      });

      const tipos = Array.from(tipoMap.keys()).sort();

      for (const tipo of tipos) {
        const tipoRows = tipoMap.get(tipo)!;
        rows.push({
          polo,
          tipo,
          login: getRawM300ValueForGroup(tipoRows, "1º Login Corrigido", getValMinutes),
          despacho: getRawM300ValueForGroup(tipoRows, "1º Despacho", getValMinutes),
          plataforma: getRawM300ValueForGroup(tipoRows, "1º Desloc", getValMinutes),
          intervalo: calcIntervalMinutes(tipoRows, getValMinutes),
          retorno: getRawM300ValueForGroup(tipoRows, "Retorno a base", getValMinutes),
        });
      }

      // Total row for this polo
      rows.push({
        polo,
        tipo: "Total",
        login: getRawM300ValueForGroup(poloRows, "1º Login Corrigido", getValMinutes),
        despacho: getRawM300ValueForGroup(poloRows, "1º Despacho", getValMinutes),
        plataforma: getRawM300ValueForGroup(poloRows, "1º Desloc", getValMinutes),
        intervalo: calcIntervalMinutes(poloRows, getValMinutes),
        retorno: getRawM300ValueForGroup(poloRows, "Retorno a base", getValMinutes),
      });
    }

    return { rows, polos };
  }, [filteredData, getValMinutes]);

  const {
    isPeriodMode, setIsPeriodMode,
    selectedData, setSelectedData,
    periodStart, setPeriodStart,
    periodEnd, setPeriodEnd,
    selectedPolos, setSelectedPolos,
    selectedProcessos, setSelectedProcessos,
    selectedTiposEquipe, setSelectedTiposEquipe,
    selectedTurnos, setSelectedTurnos,
    selectedEquipes, setSelectedEquipes,
    datas, polos, processos, tiposEquipe, turnos, equipes,
    activeFilterCount,
  } = filterState;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] p-0 overflow-hidden">
        <DialogHeader className="p-4 pb-2 border-b border-border flex flex-row items-center justify-between">
          <DialogTitle className="flex items-center gap-2 text-base">
            <Table2 className="h-4 w-4 text-primary" />
            Resumo M300 por Polo
          </DialogTitle>
          <Sheet open={isFilterOpen} onOpenChange={setIsFilterOpen}>
            <SheetTrigger asChild>
              <Button variant="outline" size="sm" className="h-7 gap-1.5 text-xs">
                <SlidersHorizontal className="h-3 w-3" />
                Filtros
                {activeFilterCount > 0 && (
                  <Badge className="h-4 w-4 p-0 flex items-center justify-center text-[9px] rounded-full">
                    {activeFilterCount}
                  </Badge>
                )}
              </Button>
            </SheetTrigger>
            <SheetContent className="w-80 sm:w-96 p-0 flex flex-col z-[60]">
              <SheetHeader className="p-4 border-b border-border bg-secondary/30">
                <SheetTitle className="flex items-center gap-2 text-base">
                  <SlidersHorizontal className="h-4 w-4 text-primary" />
                  Filtros
                </SheetTitle>
              </SheetHeader>
              <ScrollArea className="flex-1 p-4">
                <div className="space-y-5">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-semibold text-foreground uppercase tracking-wider">Modo de Análise</label>
                      <button
                        onClick={() => setIsPeriodMode(!isPeriodMode)}
                        className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${isPeriodMode ? 'bg-primary' : 'bg-muted'}`}
                      >
                        <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-card transition-transform ${isPeriodMode ? 'translate-x-[18px]' : 'translate-x-0.5'}`} />
                      </button>
                    </div>
                  </div>
                  {!isPeriodMode && (
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-foreground uppercase tracking-wider flex items-center gap-1.5">
                        <Calendar className="h-3 w-3 text-muted-foreground" />
                        Dia
                      </label>
                      <select value={selectedData} onChange={(e) => setSelectedData(e.target.value)} className="w-full rounded-md bg-background text-foreground border border-border text-xs p-2 focus:border-ring focus:ring-1 focus:ring-ring outline-none">
                        <option value="">Todos</option>
                        {datas.map((d: string) => (<option key={d} value={d}>{d}</option>))}
                      </select>
                    </div>
                  )}
                  {isPeriodMode && (
                    <div className="space-y-2">
                      <label className="text-xs font-semibold text-foreground uppercase tracking-wider flex items-center gap-1.5">
                        <Calendar className="h-3 w-3 text-muted-foreground" />
                        Período
                      </label>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <span className="text-[10px] text-muted-foreground">De</span>
                          <select value={periodStart} onChange={(e: any) => setPeriodStart(e.target.value)} className="w-full rounded-md bg-background text-foreground border border-border text-xs p-2 focus:border-ring focus:ring-1 focus:ring-ring outline-none">
                            {datas.map((d: string) => (<option key={d} value={d}>{d}</option>))}
                          </select>
                        </div>
                        <div>
                          <span className="text-[10px] text-muted-foreground">Até</span>
                          <select value={periodEnd} onChange={(e: any) => setPeriodEnd(e.target.value)} className="w-full rounded-md bg-background text-foreground border border-border text-xs p-2 focus:border-ring focus:ring-1 focus:ring-ring outline-none">
                            {datas.filter((d: string) => d >= periodStart).map((d: string) => (<option key={d} value={d}>{d}</option>))}
                          </select>
                        </div>
                      </div>
                    </div>
                  )}
                  <FilterMultiSelect label="Polo" options={polos} selected={selectedPolos} onChange={setSelectedPolos} />
                  <FilterMultiSelect label="Processo" options={processos} selected={selectedProcessos} onChange={setSelectedProcessos} />
                  <FilterMultiSelect label="Insourcing / Outsourcing" options={tiposEquipe} selected={selectedTiposEquipe} onChange={setSelectedTiposEquipe} />
                  <FilterMultiSelect label="Turno" options={turnos} selected={selectedTurnos} onChange={setSelectedTurnos} />
                  <FilterMultiSelect label="Equipe" options={equipes} selected={selectedEquipes} onChange={setSelectedEquipes} searchable={true} />
                </div>
              </ScrollArea>
            </SheetContent>
          </Sheet>
        </DialogHeader>
        <ScrollArea className="flex-1 p-4 max-h-[calc(90vh-60px)]">
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="border-b-2 border-border">
                  <th className="text-left px-3 py-2 text-xs font-semibold text-muted-foreground uppercase" colSpan={2}></th>
                  <th className="text-center px-3 py-2 text-xs font-semibold text-muted-foreground uppercase">Login</th>
                  <th className="text-center px-3 py-2 text-xs font-semibold text-muted-foreground uppercase">Despacho</th>
                  <th className="text-center px-3 py-2 text-xs font-semibold text-muted-foreground uppercase">T. Plataforma</th>
                  <th className="text-center px-3 py-2 text-xs font-semibold text-muted-foreground uppercase">Intervalo</th>
                  <th className="text-center px-3 py-2 text-xs font-semibold text-muted-foreground uppercase">Retorno Base</th>
                </tr>
              </thead>
              <tbody>
                {tableData.rows.map((row, idx) => {
                  const isTotal = row.tipo === "Total";
                  const isFirstOfPolo = idx === 0 || tableData.rows[idx - 1].polo !== row.polo;
                  const poloRowCount = tableData.rows.filter(r => r.polo === row.polo).length;
                  
                  return (
                    <tr
                      key={`${row.polo}-${row.tipo}`}
                      className={`border-b border-border ${isTotal ? 'bg-muted/30 font-semibold' : 'hover:bg-muted/20'} ${isFirstOfPolo && idx > 0 ? 'border-t-2 border-t-border' : ''}`}
                    >
                      {isFirstOfPolo && (
                        <td
                          className="px-3 py-2 text-xs font-bold text-foreground align-middle whitespace-nowrap"
                          rowSpan={poloRowCount}
                        >
                          {row.polo}
                        </td>
                      )}
                      <td className={`px-3 py-1.5 text-xs whitespace-nowrap ${isTotal ? 'font-semibold text-foreground' : 'text-muted-foreground'}`}>
                        {row.tipo}
                      </td>
                      <td className="text-center px-3 py-1.5 text-xs font-mono">{formatMinutes(row.login)}</td>
                      <td className="text-center px-3 py-1.5 text-xs font-mono">{formatMinutes(row.despacho)}</td>
                      <td className="text-center px-3 py-1.5 text-xs font-mono">{formatMinutes(row.plataforma)}</td>
                      <td className="text-center px-3 py-1.5 text-xs font-mono">{formatMinutes(row.intervalo)}</td>
                      <td className="text-center px-3 py-1.5 text-xs font-mono">{formatMinutes(row.retorno)}</td>
                    </tr>
                  );
                })}
                {tableData.rows.length === 0 && (
                  <tr>
                    <td colSpan={7} className="text-center py-8 text-muted-foreground text-sm">
                      Nenhum dado disponível para os filtros selecionados.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <p className="text-[10px] text-muted-foreground mt-3">
            * Valores em minutos (média). Dados exclusivamente da base M300.
          </p>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
