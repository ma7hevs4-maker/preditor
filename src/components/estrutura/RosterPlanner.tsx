import { useEffect, useState } from "react";
import { format, addDays, eachDayOfInterval } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CalendarIcon, ChevronLeft, ChevronRight, Loader2, Minus, Plus, Save } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useBases } from "@/hooks/useBases";
import {
  ROSTER_ROLES, ROSTER_STATUSES, ROSTER_TIMES, RosterPerson,
  emptyPerson, maskPhone, useDutyRoster, useSaveDutyRoster,
} from "@/hooks/useDutyRoster";
import { toast } from "@/hooks/use-toast";

const RosterPlanner = () => {
  const { data: bases } = useBases();
  const [baseId, setBaseId] = useState("");
  const [date, setDate] = useState<Date>(new Date());
  const [endDate, setEndDate] = useState<Date | undefined>();
  const [mode, setMode] = useState<"single" | "period">("single");
  const [people, setPeople] = useState<RosterPerson[]>([emptyPerson()]);

  useEffect(() => {
    if (bases?.length && !baseId) setBaseId(bases[0].id);
  }, [bases, baseId]);

  const dateStr = format(date, "yyyy-MM-dd");
  const { data: saved, isLoading } = useDutyRoster(baseId || null, dateStr);
  const save = useSaveDutyRoster();

  useEffect(() => {
    if (!saved) return;
    setPeople(saved.length
      ? saved.map(e => ({
          full_name: e.full_name, role: e.role, phone: e.phone ?? "", status: e.status,
          start_time: e.start_time ?? "", end_time: e.end_time ?? "",
        }))
      : [emptyPerson()]);
  }, [saved]);

  const update = (i: number, patch: Partial<RosterPerson>) =>
    setPeople(prev => prev.map((p, idx) => (idx === i ? { ...p, ...patch } : p)));

  const handleSave = async () => {
    const filled = people.filter(p => p.full_name.trim());
    const missing = filled.find(p => !p.role);
    if (missing) {
      toast({ title: "Falta o cargo", description: `Escolha o cargo de ${missing.full_name}.`, variant: "destructive" });
      return;
    }
    if (mode === "period" && !endDate) {
      toast({ title: "Escolha a data fim", variant: "destructive" });
      return;
    }
    const dates = mode === "period" && endDate
      ? eachDayOfInterval({ start: date, end: endDate }).map(d => format(d, "yyyy-MM-dd"))
      : [dateStr];
    try {
      await save.mutateAsync({ baseId, dates, people: filled });
      toast({ title: "Escala salva", description: `${filled.length} pessoa(s) em ${dates.length} dia(s).` });
    } catch (e: any) {
      toast({ title: "Erro ao salvar", description: e.message, variant: "destructive" });
    }
  };

  return (
    <div className="min-h-screen bg-background p-4 lg:p-6 pl-16">
      <div className="mb-4">
        <h1 className="text-2xl font-bold text-foreground">Escala</h1>
        <p className="text-sm text-muted-foreground">
          Cadastre as pessoas de escala e sobreaviso por base e dia — apenas listagem, não entra nas simulações
        </p>
      </div>

      <div className="glass-card p-4 mb-4">
        <div className="flex flex-wrap items-end gap-3">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Base</label>
            <Select value={baseId} onValueChange={setBaseId}>
              <SelectTrigger className="w-[180px]"><SelectValue placeholder="Base" /></SelectTrigger>
              <SelectContent>
                {bases?.map(b => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Modo</label>
            <div className="flex gap-1">
              <Button size="sm" variant={mode === "single" ? "default" : "outline"} onClick={() => setMode("single")} className="text-xs h-8">Dia</Button>
              <Button size="sm" variant={mode === "period" ? "default" : "outline"} onClick={() => setMode("period")} className="text-xs h-8">Período</Button>
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">{mode === "period" ? "Data início" : "Data"}</label>
            <div className="flex items-center gap-1">
              <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setDate(d => addDays(d, -1))}><ChevronLeft className="h-4 w-4" /></Button>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-[140px] h-8 justify-start text-xs font-normal">
                    <CalendarIcon className="mr-1.5 h-3.5 w-3.5" />{format(date, "dd/MM/yyyy")}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar mode="single" selected={date} onSelect={d => d && setDate(d)} locale={ptBR} className="p-3 pointer-events-auto" />
                </PopoverContent>
              </Popover>
              <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setDate(d => addDays(d, 1))}><ChevronRight className="h-4 w-4" /></Button>
            </div>
          </div>
          {mode === "period" && (
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Data fim</label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-[140px] h-8 justify-start text-xs font-normal">
                    <CalendarIcon className="mr-1.5 h-3.5 w-3.5" />{endDate ? format(endDate, "dd/MM/yyyy") : "Selecionar..."}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar mode="single" selected={endDate} onSelect={d => d && setEndDate(d)} disabled={d => d < date} locale={ptBR} className="p-3 pointer-events-auto" />
                </PopoverContent>
              </Popover>
            </div>
          )}
          <Button size="sm" className="h-8 ml-auto" onClick={handleSave} disabled={!baseId || save.isPending}>
            {save.isPending ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : <Save className="w-3.5 h-3.5 mr-1.5" />}
            Salvar escala
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12 text-muted-foreground">
          <Loader2 className="w-6 h-6 animate-spin text-primary mr-2" />Carregando escala...
        </div>
      ) : (
        <div className="glass-card p-4 space-y-3">
          <div className="hidden md:grid grid-cols-[2fr_1fr_1fr_1fr_1.4fr] gap-2 text-xs font-medium text-muted-foreground px-1">
            <span>Nome completo</span><span>Cargo</span><span>Telefone</span><span>Status</span><span>Horário (de – até)</span>
          </div>
          {people.map((p, i) => (
            <div key={i} className="grid grid-cols-1 md:grid-cols-[2fr_1fr_1fr_1fr_1.4fr] gap-2">
              <Input placeholder="Nome completo" value={p.full_name} onChange={e => update(i, { full_name: e.target.value })} />
              <Select value={p.role} onValueChange={v => update(i, { role: v })}>
                <SelectTrigger><SelectValue placeholder="Cargo" /></SelectTrigger>
                <SelectContent>{ROSTER_ROLES.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent>
              </Select>
              <Input placeholder="XX XXXXX-XXXX" inputMode="numeric" value={p.phone} onChange={e => update(i, { phone: maskPhone(e.target.value) })} />
              <Select value={p.status} onValueChange={v => update(i, { status: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{ROSTER_STATUSES.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}</SelectContent>
              </Select>
              <div className="flex items-center gap-1">
                <Select value={p.start_time} onValueChange={v => update(i, { start_time: v })}>
                  <SelectTrigger><SelectValue placeholder="De" /></SelectTrigger>
                  <SelectContent>{ROSTER_TIMES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                </Select>
                <span className="text-muted-foreground text-xs">até</span>
                <Select value={p.end_time} onValueChange={v => update(i, { end_time: v })}>
                  <SelectTrigger><SelectValue placeholder="Até" /></SelectTrigger>
                  <SelectContent>{ROSTER_TIMES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
          ))}
          <div className="flex gap-2 pt-1">
            <Button variant="outline" size="icon" className="h-8 w-8" title="Adicionar pessoa" onClick={() => setPeople(prev => [...prev, emptyPerson()])}>
              <Plus className="h-4 w-4" />
            </Button>
            {people.length > 1 && (
              <Button variant="outline" size="icon" className="h-8 w-8" title="Remover última pessoa" onClick={() => setPeople(prev => prev.slice(0, -1))}>
                <Minus className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default RosterPlanner;
