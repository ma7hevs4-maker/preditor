import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface ContingencyLevel {
  id: string;
  base_name: string;
  normal_min: number;
  normal_max: number;
  nivel1_min: number;
  nivel1_max: number;
  nivel2_min: number;
  nivel2_max: number;
  crise_min: number;
  crise_max: number;
  extremo_min: number;
  created_at: string;
  updated_at: string;
}

export type ContingencyLevelName = "normal" | "nivel1" | "nivel2" | "crise" | "extremo";

export const useContingencyLevels = () => {
  return useQuery({
    queryKey: ["contingency_levels"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("contingency_levels")
        .select("*")
        .order("base_name");
      
      if (error) throw error;
      return data as ContingencyLevel[];
    },
  });
};

export const useUpdateContingencyLevel = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (level: Partial<ContingencyLevel> & { id: string }) => {
      const { id, ...rest } = level;
      const { error } = await supabase
        .from("contingency_levels")
        .update(rest)
        .eq("id", id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contingency_levels"] });
    },
  });
};

// Helper para determinar o nível de contingência baseado no total de incidentes
export const getContingencyLevel = (
  totalIncidents: number,
  levels: ContingencyLevel | undefined
): { level: ContingencyLevelName; label: string; color: string } | null => {
  if (!levels) return null;
  
  if (totalIncidents >= levels.extremo_min) {
    return { level: "extremo", label: "Extremo", color: "bg-black text-white" };
  }
  if (totalIncidents >= levels.crise_min && totalIncidents <= levels.crise_max) {
    return { level: "crise", label: "Crise", color: "bg-red-600 text-white" };
  }
  if (totalIncidents >= levels.nivel2_min && totalIncidents <= levels.nivel2_max) {
    return { level: "nivel2", label: "Nível 2", color: "bg-orange-500 text-white" };
  }
  if (totalIncidents >= levels.nivel1_min && totalIncidents <= levels.nivel1_max) {
    return { level: "nivel1", label: "Nível 1", color: "bg-yellow-500 text-black" };
  }
  if (totalIncidents >= levels.normal_min && totalIncidents <= levels.normal_max) {
    return { level: "normal", label: "Normal", color: "bg-green-500 text-white" };
  }
  
  // Fallback - abaixo do normal mínimo
  return { level: "normal", label: "Normal", color: "bg-green-500 text-white" };
};
