import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const ROSTER_ROLES = ["Analista", "Coordenador", "Gestor", "Operador", "Supervisor", "Técnico"] as const;
export const ROSTER_STATUSES = [
  { value: "escala", label: "Escala" },
  { value: "sobreaviso", label: "Sobreaviso" },
] as const;
export const ROSTER_TIMES = Array.from({ length: 48 }, (_, i) =>
  `${String(Math.floor(i / 2)).padStart(2, "0")}:${i % 2 ? "30" : "00"}`,
);

export interface RosterPerson {
  full_name: string;
  role: string;
  phone: string;
  status: string;
  start_time: string;
  end_time: string;
}

export interface RosterEntry extends RosterPerson {
  id: string;
  base_id: string;
  roster_date: string;
  position: number;
}

export const emptyPerson = (): RosterPerson => ({
  full_name: "", role: "", phone: "", status: "escala", start_time: "", end_time: "",
});

/** Formats digits as "XX XXXXX-XXXX". */
export const maskPhone = (value: string): string => {
  const d = value.replace(/\D/g, "").slice(0, 11);
  if (d.length <= 2) return d;
  if (d.length <= 7) return `${d.slice(0, 2)} ${d.slice(2)}`;
  return `${d.slice(0, 2)} ${d.slice(2, 7)}-${d.slice(7)}`;
};

const sb = supabase as any;

export const useDutyRoster = (baseId: string | null, date: string) =>
  useQuery({
    queryKey: ["duty_roster", baseId, date],
    enabled: !!baseId && !!date,
    queryFn: async () => {
      const { data, error } = await sb
        .from("duty_roster_entries").select("*")
        .eq("base_id", baseId).eq("roster_date", date).order("position");
      if (error) throw error;
      return (data ?? []) as RosterEntry[];
    },
  });

export const useDutyRosterForDate = (date: string) =>
  useQuery({
    queryKey: ["duty_roster", "all", date],
    queryFn: async () => {
      const { data, error } = await sb
        .from("duty_roster_entries").select("*")
        .eq("roster_date", date).order("position");
      if (error) throw error;
      return (data ?? []) as RosterEntry[];
    },
  });

export const useSaveDutyRoster = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ baseId, dates, people }: { baseId: string; dates: string[]; people: RosterPerson[] }) => {
      const { error: delErr } = await sb
        .from("duty_roster_entries").delete().eq("base_id", baseId).in("roster_date", dates);
      if (delErr) throw delErr;
      const rows = dates.flatMap(date =>
        people.map((p, i) => ({
          base_id: baseId, roster_date: date, position: i,
          full_name: p.full_name.trim(), role: p.role, phone: p.phone || null,
          status: p.status, start_time: p.start_time || null, end_time: p.end_time || null,
        })),
      );
      if (rows.length) {
        const { error } = await sb.from("duty_roster_entries").insert(rows);
        if (error) throw error;
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["duty_roster"] }),
  });
};
